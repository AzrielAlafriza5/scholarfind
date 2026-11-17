import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../lib/formatters';

interface PaginationProps {
  currentPage: number;
  totalResults: number;
  perPage: number;
  maxPages?: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
}

function buildPageList(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  if (end < total - 1) {
    pages.push('ellipsis');
  }

  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalResults,
  perPage,
  maxPages = 100,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const totalPages = Math.min(maxPages, Math.max(1, Math.ceil(totalResults / perPage)));
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalResults);

  return (
    <nav
      aria-label="Navigasi halaman hasil pencarian"
      className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row"
    >
      <p className="text-xs text-[#64748B] tabular-nums">
        Menampilkan{' '}
        <span className="font-medium text-[#0F172A]">
          {formatNumber(startItem)}–{formatNumber(endItem)}
        </span>{' '}
        dari <span className="font-medium text-[#0F172A]">{formatNumber(totalResults)}</span> hasil
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Sebelumnya
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden="true"
                className="inline-flex h-10 w-8 items-center justify-center text-xs text-[#64748B]"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={disabled}
                aria-current={item === currentPage ? 'page' : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2.5 text-xs font-medium tabular-nums transition-colors ${
                  item === currentPage
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <span className="px-2 text-xs font-medium text-[#64748B] tabular-nums sm:hidden">
          Hal. {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
