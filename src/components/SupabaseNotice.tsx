import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUPABASE_UNCONFIGURED_MESSAGE } from '../lib/supabase';

interface SupabaseNoticeProps {
  title?: string;
  compact?: boolean;
}

export function SupabaseNotice({
  title = 'Konfigurasi Supabase Diperlukan',
  compact = false,
}: SupabaseNoticeProps) {
  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-200 bg-amber-50/70 ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-950">{title}</h2>
          <p className="text-sm leading-relaxed text-amber-900">
            {SUPABASE_UNCONFIGURED_MESSAGE}
          </p>
          {!compact && (
            <div className="pt-2">
              <p className="text-xs text-amber-800">
                Pencarian makalah ilmiah OpenAlex tetap dapat digunakan secara penuh tanpa masuk.
              </p>
              <Link
                to="/search"
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-4 text-xs font-medium text-white transition-colors hover:bg-[#1D4ED8]"
              >
                Lanjutkan Pencarian Tanpa Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
