import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Filter,
  Search,
} from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

const POPULAR_KEYWORDS = [
  'machine learning',
  'energi terbarukan',
  'kesehatan masyarakat',
  'ekonomi digital',
  'deep learning medical imaging',
  'climate change adaptation',
];

const FEATURES = [
  {
    icon: Search,
    title: 'Indeks Publikasi Ilmiah Nyata',
    description:
      'Setiap pencarian terhubung langsung ke OpenAlex API untuk menampilkan jurnal, artikel tinjauan, dan pracetak nyata beserta sitasi dan DOI.',
  },
  {
    icon: Filter,
    title: 'Filter Akademik Presisi',
    description:
      'Saring literatur berdasarkan rentang tahun terbit, jenis publikasi yang terpetakan akurat, status Open Access, serta urutan relevansi atau sitasi.',
  },
  {
    icon: Bookmark,
    title: 'Bookmark & Riwayat Terkelola',
    description:
      'Masuk dengan akun Anda untuk menyimpan referensi penting, meninjau kembali riwayat pencarian beserta filternya, dan melengkapi profil kampus.',
  },
];

export function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-medium text-[#2563EB]">
            Pencarian Literatur Akademik untuk Mahasiswa
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[#0F172A] sm:text-5xl sm:leading-[1.15]">
            Temukan makalah ilmiah terpercaya untuk riset dan tugas akhir Anda
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#64748B] sm:text-lg">
            Telusuri jutaan publikasi ilmiah nyata dari indeks terbuka OpenAlex. Filter berdasarkan
            tahun, akses terbuka, dan jumlah sitasi, lalu simpan referensi penting ke akun Anda.
          </p>

          <div className="mx-auto mt-9 max-w-2xl">
            <SearchBar
              size="hero"
              autoFocus
              onSubmit={handleSearch}
              placeholder="Cari topik riset, judul makalah, penulis, atau DOI (mis. 10.1038/...)"
            />
          </div>

          {/* Popular Research Keywords */}
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="text-xs font-medium text-[#64748B]">Topik pencarian populer:</p>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
              {POPULAR_KEYWORDS.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => handleSearch(keyword)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs font-medium text-[#0F172A] transition-colors hover:border-[#2563EB] hover:bg-blue-50/60 hover:text-[#2563EB] whitespace-nowrap"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Dirancang untuk alur kerja riset mahasiswa
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Fokus pada keakuratan metadata, kemudahan penyaringan, dan transparansi sumber asli
            tanpa gangguan visual.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#0F172A]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search Tips Callout */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <h3 className="text-base font-semibold text-[#0F172A]">
                Tips pencarian yang lebih efektif
              </h3>
              <p className="text-sm leading-relaxed text-[#64748B]">
                Gunakan istilah akademik dalam bahasa Inggris atau Indonesia untuk cakupan jurnal
                yang lebih luas, atau tempel langsung nomor DOI (contoh:{' '}
                <span className="font-mono text-xs text-[#0F172A]">10.1038/nature14539</span>) untuk
                menemukan publikasi spesifik.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSearch('machine learning')}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap"
            >
              Coba Pencarian Sekarang
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
