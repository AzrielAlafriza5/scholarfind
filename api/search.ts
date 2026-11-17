import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  OpenAlexServiceError,
  searchOpenAlexPapers,
  validateSearchParams,
} from '../server/openalex';

type QueryMap = Record<string, unknown>;

interface VercelLikeRequest extends IncomingMessage {
  query?: QueryMap;
}

interface VercelLikeResponse extends ServerResponse {
  status?: (statusCode: number) => VercelLikeResponse;
  json?: (body: unknown) => unknown;
}

function sendJson(res: VercelLikeResponse, statusCode: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const responseWithStatus = res.status(statusCode);
    if (typeof responseWithStatus.json === 'function') {
      responseWithStatus.json(body);
      return;
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

function getQueryParams(req: VercelLikeRequest): QueryMap {
  if (req.query && Object.keys(req.query).length > 0) {
    return req.query;
  }
  const url = new URL(req.url || '/', 'http://localhost');
  const query: QueryMap = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, {
      error: {
        code: 'INVALID_PARAMS',
        message: 'Metode HTTP tidak diizinkan. Gunakan GET.',
      },
    });
    return;
  }

  try {
    const query = getQueryParams(req);
    const validated = validateSearchParams({
      q: query.q,
      page: query.page,
      perPage: query.perPage ?? query.per_page,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      type: query.type,
      openAccess: query.openAccess ?? query.oa,
      sort: query.sort,
    });

    const data = await searchOpenAlexPapers(validated);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    sendJson(res, 200, data);
  } catch (err) {
    if (err instanceof OpenAlexServiceError) {
      if (err.retryAfter) {
        res.setHeader('Retry-After', String(err.retryAfter));
      }
      sendJson(res, err.status, {
        error: {
          code: err.code,
          message: err.message,
          retryAfter: err.retryAfter,
        },
      });
      return;
    }

    sendJson(res, 500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal saat memproses pencarian.',
      },
    });
  }
}
