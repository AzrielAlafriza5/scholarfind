import type { SearchFilters } from './paper';

export interface UserProfile {
  id: string;
  full_name: string | null;
  university: string | null;
  created_at: string | null;
}

export interface BookmarkRecord {
  id: string;
  user_id: string;
  paper_id: string;
  title: string;
  authors: string[];
  publication_year: number | null;
  doi: string | null;
  paper_url: string | null;
  created_at: string;
}

export interface SearchHistoryRecord {
  id: string;
  user_id: string;
  keyword: string;
  filters: SearchFilters | null;
  created_at: string;
}
