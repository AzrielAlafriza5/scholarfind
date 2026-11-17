import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-[#0F172A]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563EB] text-white">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>ScholarFind</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Mesin pencari literatur akademik untuk mahasiswa Indonesia. Metadata publikasi
              diambil secara langsung dari indeks terbuka{' '}
              <a
                href="https://openalex.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#0F172A] underline decoration-slate-300 underline-offset-4 hover:text-[#2563EB] hover:decoration-[#2563EB]"
              >
                OpenAlex
              </a>
              .
            </p>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link to="/" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
              Beranda
            </Link>
            <Link to="/search" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
              Pencarian
            </Link>
            <Link to="/bookmarks" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
              Bookmark
            </Link>
            <Link to="/history" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
              Riwayat
            </Link>
            <Link to="/profile" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
              Profil
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} ScholarFind. Dirancang untuk riset dan studi akademik.</p>
          <p>
            Ketersediaan abstrak, tautan PDF, dan status akses terbuka bergantung pada metadata asli penerbit.
          </p>
        </div>
      </div>
    </footer>
  );
}
