import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import { FilterSidebar } from '../components/FilterSidebar';
import { Pagination } from '../components/Pagination';
import { PaperCard } from '../components/PaperCard';
import { SearchBar } from '../components/SearchBar';
import { useAuth } from '../contexts/AuthContext';
import {
  buildSearchUrlParams,
  formatNumber,
  parseSearchUrlParams,
  summarizeFilters,
} from '../lib/formatters';
import { SearchApiError, searchPapers } from '../services/searchApi';
import { recordSearchHistory } from '../services/userData';
import type {
  DataMiningMeta,
  Paper,
  SearchFilters,
  SortOption,
} from '../types/paper';

const EXAMPLE_TOPICS = [
  'machine learning',
  'natural language processing',
  'renewable energy Indonesia',
  'public health epidemiology',
];

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isSupabaseConfigured } = useAuth();

  const queryState = useMemo(() => parseSearchUrlParams(searchParams), [searchParams]);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [rankingMeta, setRankingMeta] = useState<DataMiningMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    retryAfter?: number;
  } | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [autoSearchEnabled, setAutoSearchEnabled] = useState<boolean>(false);

  const lastHistorySignatureRef = useRef<string>('');

  const updateUrlParams = useCallback(
    (next: {
      q?: string;
      yearFrom?: number | null;
      yearTo?: number | null;
      type?: SearchFilters['type'];
      openAccess?: boolean;
      sort?: SortOption;
      page?: number;
    }) => {
      const merged = {
        q: next.q !== undefined ? next.q : queryState.q,
        yearFrom: next.yearFrom !== undefined ? next.yearFrom : queryState.yearFrom,
        yearTo: next.yearTo !== undefined ? next.yearTo : queryState.yearTo,
        type: next.type !== undefined ? next.type : queryState.type,
        openAccess: next.openAccess !== undefined ? next.openAccess : queryState.openAccess,
        sort: next.sort !== undefined ? next.sort : queryState.sort,
        page: next.page !== undefined ? next.page : 1,
      };
      setSearchParams(buildSearchUrlParams(merged));
    },
    [queryState, setSearchParams]
  );

  useEffect(() => {
    const trimmedQ = queryState.q.trim();
    if (!trimmedQ) {
      setPapers([]);
      setTotalResults(0);
      setRankingMeta(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchPapers(queryState, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setPapers(res.papers);
        setTotalResults(res.totalResults);
        setRankingMeta(res.rankingMeta ?? null);
        setLoading(false);

        // Save search history strictly for signed-in users (only once per unique query+filters)
        if (user && isSupabaseConfigured && queryState.page === 1) {
          const historyFilters: SearchFilters = {
            yearFrom: queryState.yearFrom,
            yearTo: queryState.yearTo,
            type: queryState.type,
            openAccess: queryState.openAccess,
            sort: queryState.sort,
          };
          const signature = `${user.id}|${trimmedQ}|${JSON.stringify(historyFilters)}`;
          if (signature !== lastHistorySignatureRef.current) {
            lastHistorySignatureRef.current = signature;
            void recordSearchHistory(user.id, trimmedQ, historyFilters).catch(() => {
              // Non-blocking history logging
            });
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setLoading(false);
        setPapers([]);
        setTotalResults(0);
        setRankingMeta(null);
        if (err instanceof SearchApiError) {
          setError({
            message: err.message,
            code: err.code,
            retryAfter: err.retryAfter,
          });
        } else {
          setError({
            message: 'Terjadi kesalahan yang tidak terduga saat memuat hasil pencarian.',
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [queryState, retryCounter, user, isSupabaseConfigured]);

  const handleSearchSubmit = useCallback(
    (nextQuery: string) => {
      updateUrlParams({ q: nextQuery, page: 1 });
    },
    [updateUrlParams]
  );

  const handleDebouncedSearch = useCallback(
    (nextQuery: string) => {
      if (!autoSearchEnabled) return;
      updateUrlParams({ q: nextQuery, page: 1 });
    },
    [autoSearchEnabled, updateUrlParams]
  );

  const handleApplyFilters = (
    next: Pick<SearchFilters, 'yearFrom' | 'yearTo' | 'type' | 'openAccess'>
  ) => {
    updateUrlParams({
      yearFrom: next.yearFrom ?? null,
      yearTo: next.yearTo ?? null,
      type: next.type ?? '',
      openAccess: Boolean(next.openAccess),
      page: 1,
    });
    setMobileFiltersOpen(false);
  };

  const handleResetFilters = () => {
    updateUrlParams({
      yearFrom: null,
      yearTo: null,
      type: '',
      openAccess: false,
      sort: 'relevance',
      page: 1,
    });
    setMobileFiltersOpen(false);
  };

  const handleSortChange = (nextSort: SortOption) => {
    updateUrlParams({ sort: nextSort, page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    updateUrlParams({ page: nextPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterLabels = summarizeFilters({
    yearFrom: queryState.yearFrom,
    yearTo: queryState.yearTo,
    type: queryState.type,
    openAccess: queryState.openAccess,
  });

  const activeFilterCount = activeFilterLabels.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Search Bar Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <SearchBar
          initialValue={queryState.q}
          onSubmit={handleSearchSubmit}
          onDebouncedChange={autoSearchEnabled ? handleDebouncedSearch : undefined}
          debounceMs={650}
          isLoading={loading}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
          <p>
            Cari berdasarkan kata kunci, judul makalah, topik riset, atau nomor DOI.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[#0F172A]">
            <input
              type="checkbox"
              checked={autoSearchEnabled}
              onChange={(e) => setAutoSearchEnabled(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span>Pencarian otomatis saat mengetik</span>
          </label>
        </div>
      </div>

      {/* Main Layout: Sidebar + Results */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FilterSidebar
              yearFrom={queryState.yearFrom ?? null}
              yearTo={queryState.yearTo ?? null}
              type={queryState.type ?? ''}
              openAccess={Boolean(queryState.openAccess)}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              disabled={loading}
            />
          </div>
        </aside>

        {/* Results Column */}
        <section aria-label="Daftar hasil pencarian" className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {queryState.q ? (
                <>
                  <h1 className="truncate text-lg font-bold tracking-tight text-[#0F172A]">
                    Hasil untuk &ldquo;{queryState.q}&rdquo;
                  </h1>
                  <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">
                    {loading
                      ? queryState.sort === 'tfidf'
                        ? 'Mengambil kandidat OpenAlex dan menghitung peringkat TF-IDF...'
                        : 'Mengambil publikasi dari OpenAlex...'
                      : error
                      ? 'Pencarian tidak dapat diselesaikan'
                      : rankingMeta
                      ? `${formatNumber(rankingMeta.candidatePoolSize)} kandidat diperingkat (dari ${formatNumber(rankingMeta.totalOpenAlexMatches)} hasil OpenAlex) · Halaman ${queryState.page}`
                      : `${formatNumber(totalResults)} publikasi ditemukan · Halaman ${queryState.page}`}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-bold tracking-tight text-[#0F172A]">
                    Pencarian Publikasi Ilmiah
                  </h1>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    Masukkan kata kunci di atas untuk mulai menelusuri literatur OpenAlex.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                aria-expanded={mobileFiltersOpen}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50 lg:hidden whitespace-nowrap"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-xs font-medium text-[#64748B] whitespace-nowrap">
                  Urutkan:
                </label>
                <select
                  id="sort-select"
                  value={queryState.sort}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  disabled={loading || !queryState.q}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none disabled:opacity-50"
                >
                  <option value="relevance">Paling Relevan (OpenAlex)</option>
                  <option value="tfidf">Rekomendasi Data Mining (TF-IDF)</option>
                  <option value="newest">Terbaru</option>
                  <option value="cited">Paling Banyak Disitasi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Collapsible Filter Panel */}
          {mobileFiltersOpen && (
            <div className="mt-4 lg:hidden">
              <FilterSidebar
                yearFrom={queryState.yearFrom ?? null}
                yearTo={queryState.yearTo ?? null}
                type={queryState.type ?? ''}
                openAccess={Boolean(queryState.openAccess)}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                disabled={loading}
              />
            </div>
          )}

          {/* Active Filters Summary Line (Clean unboxed text) */}
          {activeFilterLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100/80 px-3.5 py-2.5 text-xs text-[#0F172A]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-[#64748B]">Filter aktif:</span>
                {activeFilterLabels.map((label, idx) => (
                  <span key={label} className="inline-flex items-center gap-2 font-medium">
                    {idx > 0 && <span aria-hidden="true" className="text-slate-400">·</span>}
                    {label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:text-[#1D4ED8] whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset Filter
              </button>
            </div>
          )}

          {/* Transparent Data Mining Candidate Pool Disclosure */}
          {queryState.sort === 'tfidf' && rankingMeta && !loading && !error && (
            <div className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/50 px-4 py-3 text-xs leading-relaxed text-slate-700">
              <p className="font-medium text-[#0F172A] tabular-nums">
                Rekomendasi Data Mining (TF-IDF &amp; Cosine Similarity) —{' '}
                {formatNumber(rankingMeta.candidatePoolSize)} kandidat teratas dievaluasi
                {rankingMeta.totalOpenAlexMatches > rankingMeta.candidatePoolSize
                  ? ` dari ${formatNumber(rankingMeta.totalOpenAlexMatches)} publikasi cocok di OpenAlex`
                  : ''}
                .
              </p>
              <p className="mt-1 text-[#64748B]">
                Skor <span className="font-medium text-[#0F172A]">Kemiripan Teks</span> dihitung
                dari judul dan abstrak yang tersedia ({formatNumber(rankingMeta.papersWithAbstract)}{' '}
                kandidat memiliki abstrak) terhadap kata kunci Anda, bukan penilaian kualitas
                ilmiah maupun evaluasi seluruh basis data OpenAlex. Pencarian lintas bahasa
                (Indonesia–Inggris) dapat menghasilkan skor leksikal lebih rendah jika istilah
                berbeda.
              </p>
              {rankingMeta.queryTerms.length > 0 && (
                <p className="mt-1.5 text-[#64748B]">
                  Term kueri aktif:{' '}
                  <span className="font-mono text-[#0F172A]">
                    {rankingMeta.queryTerms.join(', ')}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Content Area States */}
          <div className="mt-5">
            {!queryState.q ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <h2 className="text-base font-semibold text-[#0F172A]">
                  Mulai pencarian akademik Anda
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
                  Masukkan kata kunci penelitian di kolom pencarian di atas atau pilih salah satu
                  contoh topik di bawah ini.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {EXAMPLE_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleSearchSubmit(topic)}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs font-medium text-[#0F172A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Memuat hasil pencarian">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-6"
                  >
                    <div className="h-3.5 w-64 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2.5 h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3.5 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex gap-2">
                        <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
                        <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
                      </div>
                      <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-white p-8 text-center"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                  {error.code === 'RATE_LIMITED' ? (
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <h2 className="mt-4 text-base font-semibold text-[#0F172A]">
                  {error.code === 'RATE_LIMITED'
                    ? 'Batas Laju Permintaan Tercapai'
                    : error.code === 'AUTH_ERROR'
                    ? 'Autentikasi OpenAlex Gagal'
                    : error.code === 'TIMEOUT'
                    ? 'Permintaan Melebihi Batas Waktu'
                    : error.code === 'INVALID_PARAMS'
                    ? 'Parameter Pencarian Tidak Valid'
                    : 'Gagal Memuat Hasil Pencarian'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#64748B]">
                  {error.message}
                </p>
                {error.retryAfter && (
                  <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                    Disarankan mencoba kembali dalam {error.retryAfter} detik.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRetryCounter((n) => n + 1)}
                    className="inline-flex h-10 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                  >
                    Coba Lagi
                  </button>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            ) : papers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#64748B]">
                  <SearchX className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-[#0F172A]">
                  Tidak ada publikasi yang ditemukan
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#64748B]">
                  Tidak ada hasil OpenAlex yang cocok dengan kata kunci &ldquo;{queryState.q}&rdquo;
                  {activeFilterCount > 0 ? ' dan kombinasi filter yang dipilih.' : '.'} Coba ubah
                  kata kunci atau longgarkan filter tahun/jenis publikasi.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {papers.map((paper) => (
                    <PaperCard key={paper.id} paper={paper} />
                  ))}
                </div>

                <div className="mt-8">
                  <Pagination
                    currentPage={queryState.page}
                    totalResults={totalResults}
                    perPage={queryState.perPage}
                    onPageChange={handlePageChange}
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
