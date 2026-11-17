import { supabase, SUPABASE_UNCONFIGURED_MESSAGE } from '../lib/supabase';
import type { Paper, SearchFilters } from '../types/paper';
import type { BookmarkRecord, SearchHistoryRecord, UserProfile } from '../types/user';

function requireSupabase() {
  if (!supabase) {
    throw new Error(SUPABASE_UNCONFIGURED_MESSAGE);
  }
  return supabase;
}

function parseAuthorsField(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        // Fallback to comma split
      }
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeBookmarkRow(row: Record<string, unknown>): BookmarkRecord {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    paper_id: String(row.paper_id ?? ''),
    title: String(row.title ?? 'Judul tidak tersedia'),
    authors: parseAuthorsField(row.authors),
    publication_year:
      typeof row.publication_year === 'number' && Number.isInteger(row.publication_year)
        ? row.publication_year
        : null,
    doi: typeof row.doi === 'string' && row.doi.trim() ? row.doi.trim() : null,
    paper_url: typeof row.paper_url === 'string' && row.paper_url.trim() ? row.paper_url.trim() : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, university, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat profil: ${error.message}`);
  }

  return data as UserProfile | null;
}

export async function upsertUserProfile(
  userId: string,
  payload: { full_name: string; university: string }
): Promise<UserProfile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: payload.full_name.trim(),
        university: payload.university.trim(),
      },
      { onConflict: 'id' }
    )
    .select('id, full_name, university, created_at')
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan profil: ${error.message}`);
  }

  return data as UserProfile;
}

export async function fetchBookmarks(userId: string): Promise<BookmarkRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .select('id, user_id, paper_id, title, authors, publication_year, doi, paper_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat daftar bookmark: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeBookmarkRow(row as Record<string, unknown>));
}

export async function createBookmark(
  userId: string,
  paper: Paper
): Promise<{ record: BookmarkRecord | null; duplicate: boolean }> {
  const client = requireSupabase();

  const basePayload = {
    user_id: userId,
    paper_id: paper.id,
    title: paper.title,
    publication_year: paper.year,
    doi: paper.doi,
    paper_url: paper.paperUrl,
  };

  // First attempt using array format (for text[] or jsonb columns)
  let { data, error } = await client
    .from('bookmarks')
    .insert({ ...basePayload, authors: paper.authors })
    .select('id, user_id, paper_id, title, authors, publication_year, doi, paper_url, created_at')
    .single();

  // If Postgres rejects array format for a plain text column, retry with comma-joined string
  if (error && (error.code === '22P02' || error.code === '42804')) {
    const retry = await client
      .from('bookmarks')
      .insert({ ...basePayload, authors: paper.authors.join(', ') })
      .select('id, user_id, paper_id, title, authors, publication_year, doi, paper_url, created_at')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (error.code === '23505') {
      return { record: null, duplicate: true };
    }
    throw new Error(`Gagal menyimpan bookmark: ${error.message}`);
  }

  return {
    record: data ? normalizeBookmarkRow(data as Record<string, unknown>) : null,
    duplicate: false,
  };
}

export async function deleteBookmarkByPaperId(
  userId: string,
  paperId: string
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('paper_id', paperId);

  if (error) {
    throw new Error(`Gagal menghapus bookmark: ${error.message}`);
  }
}

export async function deleteBookmarkById(
  userId: string,
  bookmarkId: string
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('id', bookmarkId);

  if (error) {
    throw new Error(`Gagal menghapus bookmark: ${error.message}`);
  }
}

export async function fetchSearchHistory(userId: string): Promise<SearchHistoryRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('search_history')
    .select('id, user_id, keyword, filters, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Gagal memuat riwayat pencarian: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    let parsedFilters: SearchFilters | null = null;
    if (r.filters && typeof r.filters === 'object') {
      parsedFilters = r.filters as SearchFilters;
    } else if (typeof r.filters === 'string') {
      try {
        parsedFilters = JSON.parse(r.filters) as SearchFilters;
      } catch {
        parsedFilters = null;
      }
    }
    return {
      id: String(r.id ?? ''),
      user_id: String(r.user_id ?? ''),
      keyword: String(r.keyword ?? ''),
      filters: parsedFilters,
      created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
    };
  });
}

export async function recordSearchHistory(
  userId: string,
  keyword: string,
  filters: SearchFilters
): Promise<void> {
  if (!supabase) return;
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const cleanFilters: SearchFilters = {};
  if (filters.yearFrom) cleanFilters.yearFrom = filters.yearFrom;
  if (filters.yearTo) cleanFilters.yearTo = filters.yearTo;
  if (filters.type) cleanFilters.type = filters.type;
  if (filters.openAccess) cleanFilters.openAccess = true;
  if (filters.sort && filters.sort !== 'relevance') cleanFilters.sort = filters.sort;

  await supabase.from('search_history').insert({
    user_id: userId,
    keyword: trimmed,
    filters: cleanFilters,
  });
}

export async function deleteSearchHistoryById(
  userId: string,
  historyId: string
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('search_history')
    .delete()
    .eq('user_id', userId)
    .eq('id', historyId);

  if (error) {
    throw new Error(`Gagal menghapus riwayat pencarian: ${error.message}`);
  }
}

export async function clearAllSearchHistory(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('search_history')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Gagal mengosongkan riwayat pencarian: ${error.message}`);
  }
}
