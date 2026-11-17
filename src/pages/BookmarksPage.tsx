import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  formatAuthorsShort,
  formatNumber,
  formatTimestamp,
  getDoiUrl,
} from '../lib/formatters';

export function BookmarksPage() {
  const { bookmarks, bookmarksLoading, removeBookmarkById } = useAuth();
  const [filterText, setFilterText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredBookmarks = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(q);
      const inAuthors = item.authors.some((a) => a.toLowerCase().includes(q));
      const inDoi = item.doi?.toLowerCase().includes(q) ?? false;
      return inTitle || inAuthors || inDoi;
    });
  }, [bookmarks, filterText]);

  const handleRemove = async (bookmarkId: string) => {
    setDeletingId(bookmarkId);
    setError(null);
    const errMsg = await removeBookmarkById(bookmarkId);
    setDeletingId(null);
    if (errMsg) {
      setError(errMsg);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Bookmark Publikasi
          </h1>
          <p className="mt-1 text-sm text-[#64748B] tabular-nums">
            {bookmarksLoading
              ? 'Memuat daftar bookmark...'
              : `${formatNumber(bookmarks.length)} publikasi tersimpan di akun Anda.`}
          </p>
        </div>

        {bookmarks.length > 0 && (
          <div className="relative w-full sm:w-72">
            <label htmlFor="bookmark-filter" className="sr-only">
              Saring daftar bookmark
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              id="bookmark-filter"
              type="search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Saring judul atau penulis..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
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
        {bookmarksLoading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#64748B]">
              <Bookmark className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#0F172A]">
              Belum ada publikasi tersimpan
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
              Simpan makalah yang relevan saat menelusuri hasil pencarian agar mudah dibuka
              kembali untuk daftar pustaka Anda.
            </p>
            <Link
              to="/search"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Mulai Mencari Publikasi
            </Link>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-[#64748B]">
              Tidak ada bookmark yang cocok dengan kata kunci &ldquo;{filterText}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item) => {
              const doiUrl = getDoiUrl(item.doi);
              const externalUrl = item.paper_url || doiUrl;
              const isRemoving = deletingId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#64748B]">
                    <span className="font-medium text-[#0F172A] tabular-nums">
                      {item.publication_year ?? 'Tahun tidak diketahui'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      Disimpan {formatTimestamp(item.created_at)}
                    </span>
                    {item.doi && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600">DOI: {item.doi}</span>
                      </>
                    )}
                  </div>

                  <h2 className="mt-2 text-lg font-semibold leading-snug text-[#0F172A]">
                    <Link
                      to={`/paper/${encodeURIComponent(item.paper_id)}`}
                      className="transition-colors hover:text-[#2563EB]"
                    >
                      {item.title}
                    </Link>
                  </h2>

                  <p className="mt-1.5 text-sm text-[#64748B]">
                    {formatAuthorsShort(item.authors, 4)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to={`/paper/${encodeURIComponent(item.paper_id)}`}
                        className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-3.5 text-xs font-medium text-[#0F172A] hover:bg-slate-200 whitespace-nowrap"
                      >
                        Lihat Detail
                      </Link>
                      {externalUrl && (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50 whitespace-nowrap"
                        >
                          Sumber Asli
                          <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={isRemoving}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {isRemoving ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
