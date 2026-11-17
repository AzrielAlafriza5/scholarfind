import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  FileText,
  LockOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  buildApaCitation,
  formatNumber,
  formatPublicationDate,
  formatPublicationTypeLabel,
  getDoiUrl,
} from '../lib/formatters';
import { fetchPaperById, SearchApiError } from '../services/searchApi';
import type { Paper } from '../types/paper';

interface LocationState {
  paper?: Paper;
}

export function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { bookmarkedPaperIds, toggleBookmark } = useAuth();

  const initialPaper = (location.state as LocationState | null)?.paper;
  const matchedInitial =
    initialPaper && id && initialPaper.id.toUpperCase() === id.toUpperCase()
      ? initialPaper
      : null;

  const [paper, setPaper] = useState<Paper | null>(matchedInitial);
  const [loading, setLoading] = useState<boolean>(!matchedInitial);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [bookmarkBusy, setBookmarkBusy] = useState<boolean>(false);
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'doi' | 'citation' | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID publikasi tidak ditemukan.');
      setLoading(false);
      return;
    }

    if (matchedInitial) {
      setPaper(matchedInitial);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPaperById(id, controller.signal)
      .then((fetched) => {
        if (controller.signal.aborted) return;
        setPaper(fetched);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setLoading(false);
        setError(
          err instanceof SearchApiError
            ? err.message
            : 'Gagal memuat detail publikasi dari OpenAlex.'
        );
      });

    return () => controller.abort();
  }, [id, matchedInitial, retryCount]);

  const handleCopy = async (text: string, type: 'doi' | 'citation') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(type);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleToggleBookmark = async () => {
    if (!paper) return;
    setBookmarkBusy(true);
    setBookmarkMessage(null);
    const result = await toggleBookmark(paper);
    setBookmarkBusy(false);

    if (result.requiresLogin) {
      navigate('/login', {
        state: {
          from: location.pathname,
          message: 'Masuk terlebih dahulu untuk menyimpan publikasi ini ke bookmark.',
        },
      });
      return;
    }

    if (result.error) {
      setBookmarkMessage(result.error);
    } else {
      setBookmarkMessage(
        result.saved
          ? 'Publikasi berhasil disimpan ke daftar bookmark.'
          : 'Publikasi dihapus dari daftar bookmark.'
      );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-8 w-full animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-8 space-y-2.5">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Pencarian
        </Link>

        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-white p-8 text-center"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#0F172A]">
            Detail Publikasi Tidak Dapat Dimuat
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
            {error ?? 'Publikasi tidak ditemukan.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex h-10 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8]"
            >
              Coba Lagi
            </button>
            <Link
              to="/search"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
            >
              Ke Halaman Pencarian
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarkedPaperIds.has(paper.id);
  const doiUrl = getDoiUrl(paper.doi);
  const apaCitation = buildApaCitation(paper);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali
        </button>
        <Link
          to="/search"
          className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
        >
          Pencarian Baru
        </Link>
      </div>

      {/* Main Paper Detail Card */}
      <article className="mt-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        {/* Clean unboxed top metadata */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#64748B]">
          <span className="font-medium text-[#0F172A] tabular-nums">
            {formatPublicationDate(paper.publicationDate, paper.year)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatPublicationTypeLabel(paper.publicationType)}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatNumber(paper.citedByCount)} sitasi</span>
          <span aria-hidden="true">·</span>
          {paper.isOpenAccess ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Open Access
            </span>
          ) : (
            <span>Akses Terbatas / Berlangganan</span>
          )}
        </div>

        <h1 className="mt-3 text-balance text-2xl font-bold leading-snug tracking-tight text-[#0F172A] sm:text-3xl">
          {paper.title}
        </h1>

        {/* Authors */}
        <div className="mt-4">
          <h2 className="text-xs font-semibold text-[#64748B]">Penulis</h2>
          {paper.authors.length > 0 ? (
            <p className="mt-1 text-sm leading-relaxed text-[#0F172A]">
              {paper.authors.join(', ')}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              Informasi penulis tidak tersedia pada metadata sumber.
            </p>
          )}
        </div>

        {/* Action Strip */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-slate-100 py-5">
          {paper.paperUrl && (
            <a
              href={paper.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap"
            >
              Buka Sumber Asli
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}

          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-4 text-sm font-medium text-[#2563EB] transition-colors hover:bg-blue-100/70 whitespace-nowrap"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Buka PDF Terverifikasi
            </a>
          )}

          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarkBusy}
            aria-pressed={isBookmarked}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60 whitespace-nowrap ${
              isBookmarked
                ? 'border-blue-200 bg-blue-50 text-[#2563EB] hover:bg-blue-100'
                : 'border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                {bookmarkBusy ? 'Memproses...' : 'Tersimpan di Bookmark'}
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {bookmarkBusy ? 'Menyimpan...' : 'Simpan Bookmark'}
              </>
            )}
          </button>

          {!paper.pdfUrl && (
            <span className="text-xs text-[#64748B]">
              Tautan PDF langsung tidak tersedia dari metadata sumber.
            </span>
          )}
        </div>

        {bookmarkMessage && (
          <p role="status" className="mt-3 text-xs font-medium text-[#2563EB]">
            {bookmarkMessage}
          </p>
        )}

        {/* Abstract Section */}
        <section aria-labelledby="abstract-heading" className="mt-6">
          <h2 id="abstract-heading" className="text-base font-semibold text-[#0F172A]">
            Abstrak
          </h2>
          {paper.abstract ? (
            <p className="mt-2.5 text-sm leading-7 text-slate-700">
              {paper.abstract}
            </p>
          ) : (
            <p className="mt-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              Abstrak tidak tersedia pada metadata OpenAlex untuk publikasi ini. Silakan buka
              halaman sumber asli atau tautan DOI untuk meninjau ringkasan langsung dari penerbit.
            </p>
          )}
        </section>

        {/* Structured Metadata Table */}
        <section
          aria-labelledby="metadata-heading"
          className="mt-8 border-t border-slate-100 pt-6"
        >
          <h2 id="metadata-heading" className="text-base font-semibold text-[#0F172A]">
            Metadata Publikasi
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-[#64748B]">Jurnal / Sumber Publikasi</dt>
              <dd className="mt-1 text-sm text-[#0F172A]">
                {paper.sourceName ?? 'Tidak tersedia'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Penerbit</dt>
              <dd className="mt-1 text-sm text-[#0F172A]">
                {paper.publisher ?? 'Tidak tersedia'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Tanggal / Tahun Terbit</dt>
              <dd className="mt-1 text-sm text-[#0F172A] tabular-nums">
                {formatPublicationDate(paper.publicationDate, paper.year)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Jumlah Sitasi</dt>
              <dd className="mt-1 text-sm font-medium text-[#0F172A] tabular-nums">
                {formatNumber(paper.citedByCount)} sitasi
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Jenis Publikasi</dt>
              <dd className="mt-1 text-sm text-[#0F172A]">
                {formatPublicationTypeLabel(paper.publicationType)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Status Open Access</dt>
              <dd className="mt-1 text-sm text-[#0F172A]">
                {paper.isOpenAccess ? 'Tersedia Open Access' : 'Tidak berstatus Open Access'}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-[#64748B]">DOI</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                {paper.doi && doiUrl ? (
                  <>
                    <a
                      href={doiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[#2563EB] underline decoration-blue-200 underline-offset-4 hover:text-[#1D4ED8]"
                    >
                      {paper.doi}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(paper.doi!, 'doi')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
                    >
                      {copiedKey === 'doi' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Salin DOI
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400">DOI tidak tersedia</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#64748B]">Sumber Indeks</dt>
              <dd className="mt-1 text-sm text-[#0F172A]">
                {paper.source}{' '}
                <span className="font-mono text-xs text-[#64748B]">({paper.id})</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Citation Helper */}
        <section
          aria-labelledby="citation-heading"
          className="mt-8 border-t border-slate-100 pt-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="citation-heading" className="text-base font-semibold text-[#0F172A]">
              Format Sitasi (APA)
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(apaCitation, 'citation')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
            >
              {copiedKey === 'citation' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Sitasi Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Salin Sitasi
                </>
              )}
            </button>
          </div>
          <p className="mt-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC] p-4 text-xs leading-relaxed text-slate-700">
            {apaCitation}
          </p>
          <p className="mt-3 text-xs text-[#64748B]">
            Catatan: Metadata disajikan langsung dari OpenAlex. ScholarFind tidak mengklaim status
            indeksasi SINTA/Scopus maupun status peer-review tanpa verifikasi sumber resmi.
          </p>
        </section>
      </article>
    </div>
  );
}
