import type {
  ApiErrorResponse,
  Paper,
  SearchQueryParams,
  SearchResponse,
} from '../types/paper';

export class SearchApiError extends Error {
  status: number;
  code: ApiErrorResponse['error']['code'] | 'NETWORK_ERROR';
  retryAfter?: number;

  constructor(
    status: number,
    code: ApiErrorResponse['error']['code'] | 'NETWORK_ERROR',
    message: string,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'SearchApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export async function searchPapers(
  params: SearchQueryParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  sp.set('q', params.q.trim());
  sp.set('page', String(params.page));
  sp.set('perPage', String(params.perPage));

  if (params.yearFrom) sp.set('yearFrom', String(params.yearFrom));
  if (params.yearTo) sp.set('yearTo', String(params.yearTo));
  if (params.type) sp.set('type', params.type);
  if (params.openAccess) sp.set('openAccess', 'true');
  if (params.sort) sp.set('sort', params.sort);

  let response: Response;
  try {
    response = await fetch(`/api/search?${sp.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new SearchApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server pencarian. Periksa koneksi internet Anda lalu coba lagi.'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SearchApiError(
      response.status,
      'UPSTREAM_ERROR',
      'Server mengembalikan respons yang tidak dapat dibaca.'
    );
  }

  if (!response.ok) {
    const errPayload = payload as Partial<ApiErrorResponse>;
    throw new SearchApiError(
      response.status,
      errPayload.error?.code ?? 'UPSTREAM_ERROR',
      errPayload.error?.message ?? 'Terjadi kesalahan saat mencari publikasi ilmiah.',
      errPayload.error?.retryAfter
    );
  }

  const data = payload as Partial<SearchResponse>;
  if (!Array.isArray(data.papers)) {
    throw new SearchApiError(
      502,
      'UPSTREAM_ERROR',
      'Data hasil pencarian tidak lengkap.'
    );
  }

  return {
    papers: data.papers,
    totalResults: typeof data.totalResults === 'number' ? data.totalResults : data.papers.length,
    page: typeof data.page === 'number' ? data.page : params.page,
    perPage: typeof data.perPage === 'number' ? data.perPage : params.perPage,
    cached: Boolean(data.cached),
    rankingMeta: data.rankingMeta ?? null,
  };
}

export async function fetchPaperById(
  paperId: string,
  signal?: AbortSignal
): Promise<Paper> {
  const sp = new URLSearchParams();
  sp.set('id', paperId.trim());

  let response: Response;
  try {
    response = await fetch(`/api/paper?${sp.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new SearchApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server untuk memuat detail publikasi.'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SearchApiError(
      response.status,
      'UPSTREAM_ERROR',
      'Respons detail publikasi tidak dapat dibaca.'
    );
  }

  if (!response.ok) {
    const errPayload = payload as Partial<ApiErrorResponse>;
    throw new SearchApiError(
      response.status,
      errPayload.error?.code ?? 'UPSTREAM_ERROR',
      errPayload.error?.message ?? 'Gagal memuat detail publikasi.',
      errPayload.error?.retryAfter
    );
  }

  const data = payload as { paper?: Paper };
  if (!data.paper || !data.paper.id) {
    throw new SearchApiError(404, 'NOT_FOUND', 'Detail publikasi tidak ditemukan.');
  }

  return data.paper;
}
