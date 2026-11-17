import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, RotateCw, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  buildSearchUrlParams,
  formatNumber,
  formatTimestamp,
  summarizeFilters,
} from '../lib/formatters';
import {
  clearAllSearchHistory,
  deleteSearchHistoryById,
  fetchSearchHistory,
} from '../services/userData';
import type { SearchHistoryRecord } from '../types/user';

export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<SearchHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSearchHistory(user.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat pencarian.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleRerun = (entry: SearchHistoryRecord) => {
    const sp = buildSearchUrlParams({
      q: entry.keyword,
      yearFrom: entry.filters?.yearFrom ?? null,
      yearTo: entry.filters?.yearTo ?? null,
      type: entry.filters?.type ?? '',
      openAccess: Boolean(entry.filters?.openAccess),
      sort: entry.filters?.sort ?? 'relevance',
      page: 1,
    });
    navigate(`/search?${sp.toString()}`);
  };

  const handleDelete = async (historyId: string) => {
    if (!user) return;
    setDeletingId(historyId);
    setError(null);
    try {
      await deleteSearchHistoryById(user.id, historyId);
      setItems((prev) => prev.filter((item) => item.id !== historyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus riwayat.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!user || items.length === 0) return;
    setClearingAll(true);
    setError(null);
    try {
      await clearAllSearchHistory(user.id);
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengosongkan riwayat.');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Riwayat Pencarian
          </h1>
          <p className="mt-1 text-sm text-[#64748B] tabular-nums">
            {loading
              ? 'Memuat riwayat pencarian...'
              : `${formatNumber(items.length)} pencarian tersimpan di akun Anda.`}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="inline-flex h-10 items-center gap-1.5 self-start rounded-lg border border-red-200 bg-white px-3.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 sm:self-auto whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {clearingAll ? 'Menghapus...' : 'Hapus Semua Riwayat'}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                <div className="mt-2.5 h-3.5 w-40 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#64748B]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#0F172A]">
              Belum ada riwayat pencarian
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
              Setiap pencarian yang Anda lakukan saat masuk akan tercatat di sini beserta filter
              yang digunakan agar mudah dijalankan ulang.
            </p>
            <Link
              to="/search"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Mulai Pencarian
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {items.map((entry) => {
              const filterSummary = summarizeFilters(entry.filters);
              const isDeleting = deletingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#0F172A]">
                      {entry.keyword}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#64748B]">
                      <span className="tabular-nums">{formatTimestamp(entry.created_at)}</span>
                      {filterSummary.length > 0 ? (
                        filterSummary.map((label) => (
                          <span key={label} className="inline-flex items-center gap-2 text-slate-700">
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            {label}
                          </span>
                        ))
                      ) : (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span>Tanpa filter tambahan</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRerun(entry)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap"
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Cari Lagi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={isDeleting}
                      aria-label={`Hapus riwayat ${entry.keyword}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#64748B] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {isDeleting ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
