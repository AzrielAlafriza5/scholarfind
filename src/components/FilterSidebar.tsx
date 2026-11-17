import { useEffect, useState, type FormEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import type { PublicationTypeFilter, SearchFilters } from '../types/paper';

interface FilterSidebarProps {
  yearFrom: number | null;
  yearTo: number | null;
  type: PublicationTypeFilter;
  openAccess: boolean;
  onApply: (next: Pick<SearchFilters, 'yearFrom' | 'yearTo' | 'type' | 'openAccess'>) => void;
  onReset: () => void;
  disabled?: boolean;
}

const PUBLICATION_TYPES: Array<{ value: PublicationTypeFilter; label: string }> = [
  { value: '', label: 'Semua Jenis' },
  { value: 'article', label: 'Artikel Jurnal' },
  { value: 'review', label: 'Artikel Tinjauan (Review)' },
  { value: 'preprint', label: 'Pracetak (Preprint)' },
];

export function FilterSidebar({
  yearFrom,
  yearTo,
  type,
  openAccess,
  onApply,
  onReset,
  disabled = false,
}: FilterSidebarProps) {
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear + 1, 2027);
  const [fromInput, setFromInput] = useState(yearFrom ? String(yearFrom) : '');
  const [toInput, setToInput] = useState(yearTo ? String(yearTo) : '');
  const [selectedType, setSelectedType] = useState<PublicationTypeFilter>(type);
  const [oaOnly, setOaOnly] = useState<boolean>(openAccess);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFromInput(yearFrom ? String(yearFrom) : '');
    setToInput(yearTo ? String(yearTo) : '');
    setSelectedType(type);
    setOaOnly(openAccess);
    setError(null);
  }, [yearFrom, yearTo, type, openAccess]);

  const hasActiveFilters = Boolean(yearFrom || yearTo || type || openAccess);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedFrom: number | null = null;
    if (fromInput.trim()) {
      const n = Number(fromInput.trim());
      if (!Number.isInteger(n) || n < 1900 || n > maxYear) {
        setError(`Tahun mulai harus antara 1900 dan ${maxYear}.`);
        return;
      }
      parsedFrom = n;
    }

    let parsedTo: number | null = null;
    if (toInput.trim()) {
      const n = Number(toInput.trim());
      if (!Number.isInteger(n) || n < 1900 || n > maxYear) {
        setError(`Tahun akhir harus antara 1900 dan ${maxYear}.`);
        return;
      }
      parsedTo = n;
    }

    if (parsedFrom !== null && parsedTo !== null && parsedFrom > parsedTo) {
      setError('Tahun mulai tidak boleh melebihi tahun akhir.');
      return;
    }

    onApply({
      yearFrom: parsedFrom,
      yearTo: parsedTo,
      type: selectedType,
      openAccess: oaOnly,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5"
      aria-label="Filter pencarian publikasi"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <h2 className="text-sm font-semibold text-[#0F172A]">Filter Hasil</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {/* Rentang Tahun */}
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-[#0F172A]">Tahun Publikasi</legend>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="filter-year-from" className="block text-xs text-[#64748B]">
              Dari
            </label>
            <input
              id="filter-year-from"
              type="number"
              inputMode="numeric"
              min={1900}
              max={maxYear}
              placeholder="2018"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0F172A] tabular-nums placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="filter-year-to" className="block text-xs text-[#64748B]">
              Sampai
            </label>
            <input
              id="filter-year-to"
              type="number"
              inputMode="numeric"
              min={1900}
              max={maxYear}
              placeholder={String(new Date().getFullYear())}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0F172A] tabular-nums placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* Jenis Publikasi */}
      <fieldset className="mt-5 border-t border-slate-100 pt-4">
        <legend className="text-xs font-semibold text-[#0F172A]">Jenis Publikasi</legend>
        <div className="mt-2.5 space-y-2">
          {PUBLICATION_TYPES.map((option) => (
            <label
              key={option.value || 'all'}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
            >
              <input
                type="radio"
                name="publication-type"
                value={option.value}
                checked={selectedType === option.value}
                onChange={() => setSelectedType(option.value)}
                className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Open Access */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={oaOnly}
            onChange={(e) => setOaOnly(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span>
            <span className="block text-sm font-medium text-[#0F172A]">Hanya Open Access</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[#64748B]">
              Tampilkan publikasi dengan status akses terbuka di OpenAlex.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={disabled}
          className="h-10 w-full rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Terapkan Filter
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Reset Semua Filter
          </button>
        )}
      </div>
    </form>
  );
}
