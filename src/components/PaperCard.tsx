import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  LockOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  formatAuthorsShort,
  formatNumber,
  formatPublicationTypeLabel,
  formatSimilarityPercent,
} from '../lib/formatters';
import type { Paper } from '../types/paper';
import { DataMiningAnalysisModal } from './DataMiningAnalysisModal';

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  const { bookmarkedPaperIds, toggleBookmark } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const isBookmarked = bookmarkedPaperIds.has(paper.id);

  const handleToggleBookmark = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await toggleBookmark(paper);
    setBusy(false);

    if (result.requiresLogin) {
      navigate('/login', {
        state: {
          from: location.pathname + location.search,
          message: 'Masuk terlebih dahulu untuk menyimpan publikasi ke daftar bookmark Anda.',
        },
      });
      return;
    }

    if (result.error) {
      setFeedback(result.error);
    }
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 sm:p-6">
      {/* Clean Unboxed Metadata Line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#64748B]">
          <span className="font-medium text-[#0F172A] tabular-nums">
            {paper.year ?? 'Tahun tidak diketahui'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatPublicationTypeLabel(paper.publicationType)}</span>
          {paper.sourceName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="max-w-xs truncate text-[#0F172A]">{paper.sourceName}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatNumber(paper.citedByCount)} sitasi</span>
          {paper.isOpenAccess && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <LockOpen className="h-3 w-3" aria-hidden="true" />
                Open Access
              </span>
            </>
          )}
        </div>

        {typeof paper.similarityScore === 'number' && (
          <div
            className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums"
            title="Skor Cosine Similarity berbasis TF-IDF antara kata kunci dan teks makalah (bukan penilaian kualitas ilmiah)"
          >
            {paper.analysis?.rankPosition && (
              <>
                <span className="font-medium text-[#0F172A]">
                  #{paper.analysis.rankPosition}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
              </>
            )}
            <span className="text-[#64748B]">Kemiripan Teks:</span>
            <span className="font-semibold text-[#2563EB]">
              {formatSimilarityPercent(paper.similarityScore)}
            </span>
            <span className="text-slate-400">
              ({paper.similarityScore.toFixed(3)})
            </span>
            {paper.matchedWithAbstract === false && (
              <span className="text-slate-400">· judul saja</span>
            )}
          </div>
        )}
      </div>

      {/* Primary Title */}
      <h2 className="mt-2.5 text-lg font-semibold leading-snug text-[#0F172A]">
        <Link
          to={`/paper/${encodeURIComponent(paper.id)}`}
          state={{ paper }}
          className="transition-colors hover:text-[#2563EB]"
        >
          {paper.title}
        </Link>
      </h2>

      {/* Authors */}
      <p className="mt-1.5 text-sm text-[#64748B]">
        {formatAuthorsShort(paper.authors, 4)}
      </p>

      {/* Abstract Preview */}
      {paper.abstract ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">
          {paper.abstract}
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          Abstrak tidak tersedia pada metadata sumber.
        </p>
      )}

      {/* DOI line when present */}
      {paper.doi && (
        <p className="mt-2.5 text-xs text-[#64748B] tabular-nums">
          DOI: <span className="font-mono text-slate-700">{paper.doi}</span>
        </p>
      )}

      {/* Action Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/paper/${encodeURIComponent(paper.id)}`}
            state={{ paper }}
            className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-3.5 text-xs font-medium text-[#0F172A] transition-colors hover:bg-slate-200 whitespace-nowrap"
          >
            Lihat Detail
          </Link>

          {paper.analysis && (
            <button
              type="button"
              onClick={() => setAnalysisOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 text-xs font-medium text-[#2563EB] transition-colors hover:bg-blue-50 whitespace-nowrap"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              Lihat Analisis
            </button>
          )}

          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 text-xs font-medium text-[#2563EB] transition-colors hover:bg-blue-100/70 whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              PDF Terverifikasi
            </a>
          )}

          {paper.paperUrl && (
            <a
              href={paper.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-[#0F172A] transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              Sumber Asli
              <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={busy}
          aria-pressed={isBookmarked}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-medium transition-colors disabled:opacity-60 whitespace-nowrap ${
            isBookmarked
              ? 'border-blue-200 bg-blue-50 text-[#2563EB] hover:bg-blue-100'
              : 'border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          {isBookmarked ? (
            <>
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? 'Memproses...' : 'Tersimpan'}
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? 'Menyimpan...' : 'Simpan'}
            </>
          )}
        </button>
      </div>

      {feedback && (
        <p role="alert" className="mt-2.5 text-xs font-medium text-amber-700">
          {feedback}
        </p>
      )}

      {analysisOpen && paper.analysis && (
        <DataMiningAnalysisModal
          paper={paper}
          onClose={() => setAnalysisOpen(false)}
        />
      )}
    </article>
  );
}
