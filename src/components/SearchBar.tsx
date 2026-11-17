import { useEffect, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  initialValue?: string;
  onSubmit: (query: string) => void;
  onDebouncedChange?: (query: string) => void;
  debounceMs?: number;
  size?: 'hero' | 'compact';
  placeholder?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
}

export function SearchBar({
  initialValue = '',
  onSubmit,
  onDebouncedChange,
  debounceMs = 600,
  size = 'compact',
  placeholder = 'Cari judul makalah, topik riset, penulis, atau DOI (mis. machine learning)...',
  autoFocus = false,
  isLoading = false,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setValidationError(null);
  }, [initialValue]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue.trim() || trimmed.length < 3) {
      return;
    }
    const timer = window.setTimeout(() => {
      onDebouncedChange(trimmed);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [value, initialValue, onDebouncedChange, debounceMs]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Masukkan kata kunci, topik penelitian, atau DOI terlebih dahulu.');
      return;
    }
    if (trimmed.length > 250) {
      setValidationError('Kata kunci pencarian maksimal 250 karakter.');
      return;
    }
    setValidationError(null);
    onSubmit(trimmed);
  };

  const isHero = size === 'hero';

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={handleSubmit}
        noValidate
        className={`flex w-full items-center rounded-xl border bg-white transition-colors focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100 ${
          validationError ? 'border-red-300' : 'border-slate-200'
        } ${isHero ? 'p-2 shadow-sm' : 'p-1.5'}`}
      >
        <label htmlFor={`scholarfind-search-${size}`} className="sr-only">
          Cari publikasi ilmiah
        </label>
        <Search
          className={`shrink-0 text-[#64748B] ${isHero ? 'ml-3 h-5 w-5' : 'ml-2.5 h-4 w-4'}`}
          aria-hidden="true"
        />
        <input
          id={`scholarfind-search-${size}`}
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={250}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? `search-error-${size}` : undefined}
          className={`w-full min-w-0 bg-transparent text-[#0F172A] placeholder:text-slate-400 focus:outline-none ${
            isHero ? 'px-3.5 py-2.5 text-base' : 'px-3 py-2 text-sm'
          }`}
        />

        {value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setValidationError(null);
            }}
            aria-label="Hapus kata kunci"
            className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`shrink-0 rounded-lg bg-[#2563EB] font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap ${
            isHero ? 'h-11 px-6 text-sm' : 'h-9 px-4 text-sm'
          }`}
        >
          {isLoading ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      {validationError && (
        <p
          id={`search-error-${size}`}
          role="alert"
          className="mt-2 text-left text-xs font-medium text-red-600"
        >
          {validationError}
        </p>
      )}
    </div>
  );
}
