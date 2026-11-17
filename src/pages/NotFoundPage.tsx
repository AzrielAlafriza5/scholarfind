import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold text-[#2563EB] tabular-nums">404</p>
      <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-[#0F172A]">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
        Tautan yang Anda buka mungkin sudah dipindahkan, dihapus, atau alamat URL tidak sesuai.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-lg bg-[#2563EB] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
        >
          Kembali ke Beranda
        </Link>
        <Link
          to="/search"
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-slate-50"
        >
          Buka Pencarian
        </Link>
      </div>
    </div>
  );
}
