export type PublicationTypeFilter = '' | 'article' | 'review' | 'preprint';

export type SortOption = 'relevance' | 'newest' | 'cited' | 'tfidf';

export interface TfIdfTermBreakdown {
  term: string;
  queryTf: number;
  paperTf: number;
  documentFrequency: number;
  idf: number;
  queryTfIdf: number;
  paperTfIdf: number;
  product: number;
  matchedInPaper: boolean;
}

export interface PaperTermWeight {
  term: string;
  tf: number;
  documentFrequency: number;
  idf: number;
  tfidf: number;
}

export interface DataMiningAnalysis {
  originalQuery: string;
  queryTokens: string[];
  paperTokens: string[];
  paperTokenCount: number;
  paperUniqueTermCount: number;
  usedAbstract: boolean;
  rankPosition: number;
  candidatePoolSize: number;
  queryTermWeights: TfIdfTermBreakdown[];
  topPaperTerms: PaperTermWeight[];
  cosine: {
    dotProduct: number;
    queryNorm: number;
    paperNorm: number;
    denominator: number;
    score: number;
  };
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  publicationDate: string | null;
  sourceName: string | null;
  publisher: string | null;
  abstract: string | null;
  doi: string | null;
  paperUrl: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  citedByCount: number;
  publicationType: string | null;
  source: 'OpenAlex';
  similarityScore?: number | null;
  matchedWithAbstract?: boolean;
  analysis?: DataMiningAnalysis | null;
}

export interface DataMiningMeta {
  method: 'tfidf-cosine';
  candidatePoolSize: number;
  totalOpenAlexMatches: number;
  queryTerms: string[];
  papersWithAbstract: number;
}

export interface SearchFilters {
  yearFrom?: number | null;
  yearTo?: number | null;
  type?: PublicationTypeFilter;
  openAccess?: boolean;
  sort?: SortOption;
}

export interface SearchQueryParams extends SearchFilters {
  q: string;
  page: number;
  perPage: number;
}

export interface SearchResponse {
  papers: Paper[];
  totalResults: number;
  page: number;
  perPage: number;
  cached?: boolean;
  rankingMeta?: DataMiningMeta | null;
}

export interface ApiErrorResponse {
  error: {
    code:
      | 'INVALID_PARAMS'
      | 'AUTH_ERROR'
      | 'RATE_LIMITED'
      | 'TIMEOUT'
      | 'UPSTREAM_ERROR'
      | 'NOT_FOUND'
      | 'INTERNAL_ERROR';
    message: string;
    retryAfter?: number;
  };
}
