import type {
  Paper,
  PublicationTypeFilter,
  SearchResponse,
  SortOption,
} from '../src/types/paper.js';
import {
  rankPapersByTfIdfCosine,
  type RankedCandidateResult,
} from './tfidf.js';

const OPENALEX_BASE_URL = 'https://api.openalex.org';
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const MAX_QUERY_LENGTH = 250;
const MAX_PAGE = 100;
const MIN_YEAR = 1900;
export const DATA_MINING_CANDIDATE_POOL_SIZE = 80;
const ALLOWED_TYPES = new Set<PublicationTypeFilter>(['', 'article', 'review', 'preprint']);
const ALLOWED_SORTS = new Set<SortOption>(['relevance', 'newest', 'cited', 'tfidf']);
const ALLOWED_OPENALEX_PARAMS = new Set([
  'search',
  'filter',
  'sort',
  'per-page',
  'page',
  'select',
]);

export function getDynamicMaxPublicationYear(): number {
  return Math.max(new Date().getFullYear() + 1, 2027);
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<SearchResponse>>();
const rankedPoolCache = new Map<string, CacheEntry<RankedCandidateResult>>();
const paperCache = new Map<string, CacheEntry<Paper>>();

export class OpenAlexServiceError extends Error {
  status: number;
  code:
    | 'INVALID_PARAMS'
    | 'AUTH_ERROR'
    | 'RATE_LIMITED'
    | 'TIMEOUT'
    | 'UPSTREAM_ERROR'
    | 'NOT_FOUND'
    | 'INTERNAL_ERROR';
  retryAfter?: number;

  constructor(
    status: number,
    code:
      | 'INVALID_PARAMS'
      | 'AUTH_ERROR'
      | 'RATE_LIMITED'
      | 'TIMEOUT'
      | 'UPSTREAM_ERROR'
      | 'NOT_FOUND'
      | 'INTERNAL_ERROR',
    message: string,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'OpenAlexServiceError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface RawSearchInput {
  q?: unknown;
  page?: unknown;
  perPage?: unknown;
  yearFrom?: unknown;
  yearTo?: unknown;
  type?: unknown;
  openAccess?: unknown;
  sort?: unknown;
}

export interface ValidatedSearchParams {
  q: string;
  page: number;
  perPage: number;
  yearFrom: number | null;
  yearTo: number | null;
  type: PublicationTypeFilter;
  openAccess: boolean;
  sort: SortOption;
}

interface OpenAlexAuthorship {
  author?: {
    display_name?: unknown;
  } | null;
}

interface OpenAlexLocation {
  landing_page_url?: unknown;
  pdf_url?: unknown;
  source?: {
    display_name?: unknown;
    host_organization_name?: unknown;
  } | null;
}

interface OpenAlexWork {
  id?: unknown;
  doi?: unknown;
  title?: unknown;
  display_name?: unknown;
  publication_year?: unknown;
  publication_date?: unknown;
  type?: unknown;
  cited_by_count?: unknown;
  abstract_inverted_index?: Record<string, number[]> | null;
  authorships?: OpenAlexAuthorship[] | null;
  primary_location?: OpenAlexLocation | null;
  best_oa_location?: OpenAlexLocation | null;
  open_access?: {
    is_oa?: unknown;
    oa_url?: unknown;
  } | null;
}

interface OpenAlexListResponse {
  meta?: {
    count?: unknown;
    page?: unknown;
    per_page?: unknown;
  };
  results?: OpenAlexWork[];
}

function getCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T): void {
  if (store.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function firstString(val: unknown): string {
  if (Array.isArray(val)) {
    return typeof val[0] === 'string' ? val[0] : '';
  }
  return typeof val === 'string' ? val : '';
}

function sanitizeText(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const cleaned = val
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeHttpUrl(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeDoi(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const cleaned = val
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
  if (/^10\.\d{4,9}\/[^\s]+$/i.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function decodeAbstractInvertedIndex(
  invertedIndex: Record<string, number[]> | null | undefined
): string | null {
  if (!invertedIndex || typeof invertedIndex !== 'object' || Array.isArray(invertedIndex)) {
    return null;
  }

  const pairs: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (typeof word !== 'string' || !Array.isArray(positions)) continue;
    for (const pos of positions) {
      if (typeof pos === 'number' && Number.isInteger(pos) && pos >= 0 && pos < 100_000) {
        pairs.push([pos, word]);
      }
    }
  }

  if (pairs.length === 0) return null;

  pairs.sort((a, b) => a[0] - b[0]);
  const reconstructed = pairs
    .map(([, word]) => word)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return reconstructed.length > 0 ? reconstructed : null;
}

export function extractWorkId(rawId: unknown): string {
  if (typeof rawId !== 'string') return '';
  const trimmed = rawId.trim();
  const match = trimmed.match(/(W\d+)$/i);
  if (match) return match[1].toUpperCase();
  return trimmed.replace(/^https?:\/\/openalex\.org\//i, '');
}

export function normalizeOpenAlexWork(work: OpenAlexWork): Paper {
  const id = extractWorkId(work.id) || `unknown-${Math.random().toString(36).slice(2, 10)}`;
  const title =
    sanitizeText(work.display_name) ||
    sanitizeText(work.title) ||
    'Judul publikasi tidak tersedia';

  const authors: string[] = [];
  if (Array.isArray(work.authorships)) {
    for (const item of work.authorships) {
      const name = sanitizeText(item?.author?.display_name);
      if (name) {
        authors.push(name);
      }
    }
  }

  const publicationDate =
    typeof work.publication_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(work.publication_date)
      ? work.publication_date
      : null;

  const yearFromDate = publicationDate ? Number(publicationDate.slice(0, 4)) : null;
  const year =
    typeof work.publication_year === 'number' && Number.isInteger(work.publication_year)
      ? work.publication_year
      : yearFromDate && Number.isInteger(yearFromDate)
      ? yearFromDate
      : null;

  const sourceName =
    sanitizeText(work.primary_location?.source?.display_name) ||
    sanitizeText(work.best_oa_location?.source?.display_name) ||
    null;

  const publisher =
    sanitizeText(work.primary_location?.source?.host_organization_name) ||
    sanitizeText(work.best_oa_location?.source?.host_organization_name) ||
    null;

  const abstract = decodeAbstractInvertedIndex(work.abstract_inverted_index);
  const doi = normalizeDoi(work.doi);
  const doiUrl = doi ? sanitizeHttpUrl(`https://doi.org/${encodeURI(doi)}`) : null;

  const primaryLanding = sanitizeHttpUrl(work.primary_location?.landing_page_url);
  const bestOaLanding = sanitizeHttpUrl(work.best_oa_location?.landing_page_url);
  const openAlexUrl = id.startsWith('W') ? `https://openalex.org/${id}` : null;

  const paperUrl = primaryLanding || doiUrl || bestOaLanding || openAlexUrl;

  const bestOaPdf = sanitizeHttpUrl(work.best_oa_location?.pdf_url);
  const primaryPdf = sanitizeHttpUrl(work.primary_location?.pdf_url);
  const pdfUrl = bestOaPdf || primaryPdf || null;

  const isOpenAccess = Boolean(work.open_access?.is_oa);
  const citedByCount =
    typeof work.cited_by_count === 'number' && Number.isFinite(work.cited_by_count) && work.cited_by_count >= 0
      ? Math.floor(work.cited_by_count)
      : 0;

  const publicationType = sanitizeText(work.type);

  return {
    id,
    title,
    authors,
    year,
    publicationDate,
    sourceName,
    publisher,
    abstract,
    doi,
    paperUrl,
    pdfUrl,
    isOpenAccess,
    citedByCount,
    publicationType,
    source: 'OpenAlex',
  };
}

export function validateSearchParams(input: RawSearchInput): ValidatedSearchParams {
  const maxYear = getDynamicMaxPublicationYear();
  const q = firstString(input.q).trim();

  if (!q) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'Kata kunci pencarian wajib diisi. Masukkan topik, judul, atau DOI.'
    );
  }

  if (q.length > MAX_QUERY_LENGTH) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      `Kata kunci pencarian maksimal ${MAX_QUERY_LENGTH} karakter.`
    );
  }

  const rawPage = firstString(input.page).trim();
  const page = rawPage ? Number(rawPage) : 1;
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      `Nomor halaman harus berupa bilangan bulat antara 1 hingga ${MAX_PAGE}.`
    );
  }

  const rawPerPage = firstString(input.perPage).trim();
  const perPage = rawPerPage ? Number(rawPerPage) : 10;
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 25) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'Jumlah hasil per halaman harus antara 1 hingga 25.'
    );
  }

  const rawYearFrom = firstString(input.yearFrom).trim();
  let yearFrom: number | null = null;
  if (rawYearFrom) {
    const parsed = Number(rawYearFrom);
    if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > maxYear) {
      throw new OpenAlexServiceError(
        400,
        'INVALID_PARAMS',
        `Tahun mulai harus berada di antara ${MIN_YEAR} hingga ${maxYear}.`
      );
    }
    yearFrom = parsed;
  }

  const rawYearTo = firstString(input.yearTo).trim();
  let yearTo: number | null = null;
  if (rawYearTo) {
    const parsed = Number(rawYearTo);
    if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > maxYear) {
      throw new OpenAlexServiceError(
        400,
        'INVALID_PARAMS',
        `Tahun akhir harus berada di antara ${MIN_YEAR} hingga ${maxYear}.`
      );
    }
    yearTo = parsed;
  }

  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'Tahun mulai tidak boleh lebih besar daripada tahun akhir.'
    );
  }

  const rawType = firstString(input.type).trim().toLowerCase() as PublicationTypeFilter;
  if (!ALLOWED_TYPES.has(rawType)) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'Jenis publikasi tidak valid. Gunakan article, review, atau preprint.'
    );
  }

  const rawOpenAccess = firstString(input.openAccess).trim().toLowerCase();
  const openAccess = rawOpenAccess === 'true' || rawOpenAccess === '1';

  const rawSort = (firstString(input.sort).trim().toLowerCase() || 'relevance') as SortOption;
  if (!ALLOWED_SORTS.has(rawSort)) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'Parameter urutan tidak valid. Gunakan relevance, newest, cited, atau tfidf.'
    );
  }

  return {
    q,
    page,
    perPage,
    yearFrom,
    yearTo,
    type: rawType,
    openAccess,
    sort: rawSort,
  };
}

function getRequestHeaders(): Record<string, string> {
  const mailto = process.env.OPENALEX_MAILTO?.trim();
  const apiKey = process.env.OPENALEX_API_KEY?.trim();
  const userAgent = mailto
    ? `ScholarFind/1.0 (mailto:${mailto})`
    : 'ScholarFind/1.0 (Academic Research Search)';

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': userAgent,
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

export function sanitizeOpenAlexUrl(url: URL): URL {
  const cleanUrl = new URL(url.origin + url.pathname);
  url.searchParams.forEach((value, key) => {
    if (ALLOWED_OPENALEX_PARAMS.has(key)) {
      cleanUrl.searchParams.set(key, value);
    }
  });
  return cleanUrl;
}

async function fetchOpenAlexJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const hasApiKey = Boolean(process.env.OPENALEX_API_KEY?.trim());
  const sanitizedUrl = sanitizeOpenAlexUrl(url);

  try {
    const response = await fetch(sanitizedUrl.toString(), {
      method: 'GET',
      headers: getRequestHeaders(),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      let retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      try {
        const errBody = (await response.json()) as { retryAfter?: unknown };
        if (
          (!retryAfter || !Number.isFinite(retryAfter)) &&
          typeof errBody?.retryAfter === 'number' &&
          Number.isFinite(errBody.retryAfter)
        ) {
          retryAfter = errBody.retryAfter;
        }
      } catch {
        // Ignore non-JSON 429 body
      }

      const message = hasApiKey
        ? 'Permintaan ke layanan OpenAlex sedang mencapai batas laju. Mohon tunggu sebentar lalu coba lagi.'
        : 'Kuota permintaan anonim OpenAlex tanpa API key pada jaringan server ini sedang dibatasi. Tambahkan variabel lingkungan OPENALEX_API_KEY di server (.env atau Vercel) untuk kuota pencarian gratis pribadi.';

      throw new OpenAlexServiceError(
        429,
        'RATE_LIMITED',
        message,
        retryAfter && Number.isFinite(retryAfter) ? retryAfter : undefined
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new OpenAlexServiceError(
        401,
        'AUTH_ERROR',
        'Autentikasi ke OpenAlex ditolak (401/403). Periksa kembali nilai OPENALEX_API_KEY pada konfigurasi server.'
      );
    }

    if (response.status === 404) {
      throw new OpenAlexServiceError(
        404,
        'NOT_FOUND',
        'Publikasi yang diminta tidak ditemukan di OpenAlex.'
      );
    }

    if (!response.ok) {
      throw new OpenAlexServiceError(
        502,
        'UPSTREAM_ERROR',
        `Layanan OpenAlex mengembalikan status ${response.status}. Silakan coba kembali beberapa saat lagi.`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new OpenAlexServiceError(
        502,
        'UPSTREAM_ERROR',
        'Respons dari OpenAlex tidak valid atau terpotong.'
      );
    }

    if (!data || typeof data !== 'object') {
      throw new OpenAlexServiceError(
        502,
        'UPSTREAM_ERROR',
        'Format data dari OpenAlex tidak sesuai ekspektasi.'
      );
    }

    return data as T;
  } catch (err) {
    if (err instanceof OpenAlexServiceError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenAlexServiceError(
        504,
        'TIMEOUT',
        'Permintaan ke OpenAlex melebihi batas waktu. Periksa koneksi dan coba lagi.'
      );
    }
    throw new OpenAlexServiceError(
      502,
      'UPSTREAM_ERROR',
      'Gagal menghubungi server OpenAlex. Silakan coba lagi.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

const OPENALEX_WORK_SELECT_FIELDS = [
  'id',
  'doi',
  'title',
  'display_name',
  'publication_year',
  'publication_date',
  'type',
  'cited_by_count',
  'abstract_inverted_index',
  'authorships',
  'primary_location',
  'best_oa_location',
  'open_access',
].join(',');

function buildOpenAlexWorksUrl(
  params: ValidatedSearchParams,
  options: { perPage: number; page: number; sortOverride?: string }
): URL {
  const url = new URL(`${OPENALEX_BASE_URL}/works`);
  const filters: string[] = [];

  const detectedDoi = normalizeDoi(params.q);
  if (detectedDoi) {
    filters.push(`doi:https://doi.org/${detectedDoi}`);
  } else {
    url.searchParams.set('search', params.q);
  }

  if (params.yearFrom !== null && params.yearTo !== null) {
    filters.push(
      params.yearFrom === params.yearTo
        ? `publication_year:${params.yearFrom}`
        : `publication_year:${params.yearFrom}-${params.yearTo}`
    );
  } else if (params.yearFrom !== null) {
    filters.push(`publication_year:>${params.yearFrom - 1}`);
  } else if (params.yearTo !== null) {
    filters.push(`publication_year:<${params.yearTo + 1}`);
  }
  if (params.type) {
    filters.push(`type:${params.type}`);
  }
  if (params.openAccess) {
    filters.push('is_oa:true');
  }

  if (filters.length > 0) {
    url.searchParams.set('filter', filters.join(','));
  }

  if (options.sortOverride) {
    url.searchParams.set('sort', options.sortOverride);
  } else if (params.sort === 'newest') {
    url.searchParams.set('sort', 'publication_date:desc');
  } else if (params.sort === 'cited') {
    url.searchParams.set('sort', 'cited_by_count:desc');
  } else if (!detectedDoi) {
    url.searchParams.set('sort', 'relevance_score:desc');
  }

  url.searchParams.set('per-page', String(options.perPage));
  url.searchParams.set('page', String(options.page));
  url.searchParams.set('select', OPENALEX_WORK_SELECT_FIELDS);

  return url;
}

async function searchWithTfIdfRanking(
  params: ValidatedSearchParams
): Promise<SearchResponse> {
  // Pool cache key excludes page/perPage so pagination slices the exact same ranked candidate pool.
  const poolKey = JSON.stringify({
    q: params.q,
    yearFrom: params.yearFrom,
    yearTo: params.yearTo,
    type: params.type,
    openAccess: params.openAccess,
  });

  let cachedPool = getCache(rankedPoolCache, poolKey);
  let wasCached = true;

  if (!cachedPool) {
    wasCached = false;
    const detectedDoi = normalizeDoi(params.q);
    const candidateUrl = buildOpenAlexWorksUrl(params, {
      perPage: DATA_MINING_CANDIDATE_POOL_SIZE,
      page: 1,
      sortOverride: detectedDoi ? undefined : 'relevance_score:desc',
    });

    const rawData = await fetchOpenAlexJson<OpenAlexListResponse>(candidateUrl);
    if (!Array.isArray(rawData.results)) {
      throw new OpenAlexServiceError(
        502,
        'UPSTREAM_ERROR',
        'Struktur hasil kandidat OpenAlex untuk peringkat TF-IDF tidak valid.'
      );
    }

    const candidates = rawData.results.map(normalizeOpenAlexWork);
    const totalOpenAlexMatches =
      typeof rawData.meta?.count === 'number' && Number.isFinite(rawData.meta.count)
        ? Math.max(0, Math.floor(rawData.meta.count))
        : candidates.length;

    cachedPool = rankPapersByTfIdfCosine(params.q, candidates, totalOpenAlexMatches);
    setCache(rankedPoolCache, poolKey, cachedPool);

    for (const paper of candidates) {
      if (paper.id && !paper.id.startsWith('unknown-')) {
        setCache(paperCache, paper.id.toUpperCase(), paper);
      }
    }
  }

  const startIdx = (params.page - 1) * params.perPage;
  const pagePapers = cachedPool.papers.slice(startIdx, startIdx + params.perPage);

  return {
    papers: pagePapers,
    totalResults: cachedPool.papers.length,
    page: params.page,
    perPage: params.perPage,
    cached: wasCached,
    rankingMeta: cachedPool.rankingMeta,
  };
}

export async function searchOpenAlexPapers(
  params: ValidatedSearchParams
): Promise<SearchResponse> {
  if (params.sort === 'tfidf') {
    return searchWithTfIdfRanking(params);
  }

  const cacheKey = JSON.stringify(params);
  const cached = getCache(searchCache, cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const url = buildOpenAlexWorksUrl(params, {
    perPage: params.perPage,
    page: params.page,
  });

  const rawData = await fetchOpenAlexJson<OpenAlexListResponse>(url);
  if (!Array.isArray(rawData.results)) {
    throw new OpenAlexServiceError(
      502,
      'UPSTREAM_ERROR',
      'Struktur hasil pencarian OpenAlex tidak valid.'
    );
  }

  const papers = rawData.results.map(normalizeOpenAlexWork);
  const totalResults =
    typeof rawData.meta?.count === 'number' && Number.isFinite(rawData.meta.count)
      ? Math.max(0, Math.floor(rawData.meta.count))
      : papers.length;

  const result: SearchResponse = {
    papers,
    totalResults,
    page: params.page,
    perPage: params.perPage,
    rankingMeta: null,
  };

  setCache(searchCache, cacheKey, result);
  for (const paper of papers) {
    if (paper.id && !paper.id.startsWith('unknown-')) {
      setCache(paperCache, paper.id.toUpperCase(), paper);
    }
  }

  return result;
}

export async function getOpenAlexPaperById(rawId: unknown): Promise<Paper> {
  const idStr = firstString(rawId).trim();
  const normalizedId = extractWorkId(idStr);

  if (!/^W\d+$/i.test(normalizedId)) {
    throw new OpenAlexServiceError(
      400,
      'INVALID_PARAMS',
      'ID publikasi OpenAlex tidak valid.'
    );
  }

  const upperId = normalizedId.toUpperCase();
  const cached = getCache(paperCache, upperId);
  if (cached) {
    return cached;
  }

  const url = new URL(`${OPENALEX_BASE_URL}/works/${encodeURIComponent(upperId)}`);

  const rawWork = await fetchOpenAlexJson<OpenAlexWork>(url);
  const paper = normalizeOpenAlexWork(rawWork);
  setCache(paperCache, upperId, paper);

  return paper;
}
