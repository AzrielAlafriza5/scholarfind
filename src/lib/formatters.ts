import type {
  Paper,
  PublicationTypeFilter,
  SearchFilters,
  SearchQueryParams,
  SortOption,
} from '../types/paper';

const numberFormatter = new Intl.NumberFormat('id-ID');

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPublicationDate(
  publicationDate: string | null,
  year: number | null
): string {
  if (publicationDate) {
    const parsed = new Date(`${publicationDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return dateFormatter.format(parsed);
    }
  }
  if (year !== null) {
    return String(year);
  }
  return 'Tanggal tidak tersedia';
}

export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return 'Tidak tersedia';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return 'Tidak tersedia';
  return dateTimeFormatter.format(parsed);
}

export function formatAuthorsShort(authors: string[], maxVisible = 3): string {
  if (!authors || authors.length === 0) {
    return 'Penulis tidak tercantum';
  }
  if (authors.length <= maxVisible) {
    return authors.join(', ');
  }
  return `${authors.slice(0, maxVisible).join(', ')} dkk. (+${authors.length - maxVisible})`;
}

export function formatPublicationTypeLabel(type: string | null): string {
  if (!type) return 'Publikasi';
  const normalized = type.toLowerCase();
  const map: Record<string, string> = {
    article: 'Artikel Jurnal',
    review: 'Artikel Tinjauan',
    preprint: 'Pracetak (Preprint)',
    book: 'Buku',
    'book-chapter': 'Bab Buku',
    dissertation: 'Disertasi',
    dataset: 'Dataset',
    editorial: 'Editorial',
    letter: 'Surat Ilmiah',
    report: 'Laporan',
    erratum: 'Ralat',
    paratext: 'Parateks',
  };
  return map[normalized] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatSortLabel(sort: SortOption | undefined): string {
  switch (sort) {
    case 'tfidf':
      return 'Rekomendasi Data Mining (TF-IDF)';
    case 'newest':
      return 'Terbaru';
    case 'cited':
      return 'Paling Banyak Disitasi';
    default:
      return 'Paling Relevan (OpenAlex)';
  }
}

export function formatSimilarityPercent(score: number): string {
  const clamped = Math.min(1, Math.max(0, score));
  return `${(clamped * 100).toFixed(1).replace('.', ',')}%`;
}

export function getDoiUrl(doi: string | null): string | null {
  if (!doi) return null;
  const cleaned = doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  if (!/^10\.\d{4,9}\/\S+$/i.test(cleaned)) return null;
  return `https://doi.org/${encodeURI(cleaned)}`;
}

export function buildApaCitation(paper: Paper): string {
  const authorText =
    paper.authors.length > 0
      ? paper.authors.length > 5
        ? `${paper.authors.slice(0, 5).join(', ')}, et al.`
        : paper.authors.join(', ')
      : 'Penulis tidak tercantum';
  const yearText = paper.year ? `(${paper.year})` : '(t.t.)';
  const sourceText = paper.sourceName ? ` ${paper.sourceName}.` : '';
  const doiUrl = getDoiUrl(paper.doi);
  const linkText = doiUrl ? ` ${doiUrl}` : paper.paperUrl ? ` ${paper.paperUrl}` : '';
  return `${authorText} ${yearText}. ${paper.title}.${sourceText}${linkText}`.trim();
}

export function buildSearchUrlParams(params: {
  q: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  type?: PublicationTypeFilter;
  openAccess?: boolean;
  sort?: SortOption;
  page?: number;
}): URLSearchParams {
  const sp = new URLSearchParams();
  const trimmedQ = params.q.trim();
  if (trimmedQ) sp.set('q', trimmedQ);
  if (params.yearFrom) sp.set('yearFrom', String(params.yearFrom));
  if (params.yearTo) sp.set('yearTo', String(params.yearTo));
  if (params.type) sp.set('type', params.type);
  if (params.openAccess) sp.set('oa', 'true');
  if (params.sort && params.sort !== 'relevance') sp.set('sort', params.sort);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  return sp;
}

export function parseSearchUrlParams(sp: URLSearchParams): SearchQueryParams {
  const q = (sp.get('q') ?? '').trim();

  const rawPage = Number(sp.get('page'));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100 ? rawPage : 1;

  const rawYearFrom = sp.get('yearFrom');
  const parsedYearFrom = rawYearFrom ? Number(rawYearFrom) : NaN;
  const yearFrom =
    Number.isInteger(parsedYearFrom) && parsedYearFrom >= 1900 ? parsedYearFrom : null;

  const rawYearTo = sp.get('yearTo');
  const parsedYearTo = rawYearTo ? Number(rawYearTo) : NaN;
  const yearTo =
    Number.isInteger(parsedYearTo) && parsedYearTo >= 1900 ? parsedYearTo : null;

  const rawType = (sp.get('type') ?? '').toLowerCase();
  const type: PublicationTypeFilter =
    rawType === 'article' || rawType === 'review' || rawType === 'preprint' ? rawType : '';

  const rawOa = (sp.get('oa') ?? sp.get('openAccess') ?? '').toLowerCase();
  const openAccess = rawOa === 'true' || rawOa === '1';

  const rawSort = (sp.get('sort') ?? 'relevance').toLowerCase();
  const sort: SortOption =
    rawSort === 'newest' || rawSort === 'cited' || rawSort === 'tfidf'
      ? rawSort
      : 'relevance';

  return {
    q,
    page,
    perPage: 10,
    yearFrom,
    yearTo,
    type,
    openAccess,
    sort,
  };
}

export function summarizeFilters(filters: SearchFilters | null | undefined): string[] {
  if (!filters) return [];
  const items: string[] = [];
  if (filters.yearFrom && filters.yearTo) {
    items.push(`Tahun ${filters.yearFrom}–${filters.yearTo}`);
  } else if (filters.yearFrom) {
    items.push(`Dari tahun ${filters.yearFrom}`);
  } else if (filters.yearTo) {
    items.push(`Hingga tahun ${filters.yearTo}`);
  }
  if (filters.type) {
    items.push(formatPublicationTypeLabel(filters.type));
  }
  if (filters.openAccess) {
    items.push('Hanya Open Access');
  }
  if (filters.sort && filters.sort !== 'relevance') {
    items.push(`Urut: ${formatSortLabel(filters.sort)}`);
  }
  return items;
}
