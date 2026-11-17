# ScholarFind

ScholarFind adalah aplikasi web mesin pencari publikasi ilmiah berbahasa Indonesia untuk mahasiswa. Aplikasi ini mengambil data publikasi nyata secara langsung dari **OpenAlex REST API** melalui endpoint serverless yang aman, serta menggunakan **Supabase Auth & Database** untuk autentikasi pengguna, bookmark makalah, riwayat pencarian, dan profil akademik.

## Fitur Utama

- **Pencarian Literatur Nyata (OpenAlex)**: Pencarian berdasarkan kata kunci, judul, topik riset, maupun DOI melalui endpoint server-side `GET /api/search` dan `GET /api/paper`.
- **Filter & Pengurutan Akurat**:
  - Rentang tahun terbit (`Dari` – `Sampai`) dengan validasi batas tahun.
  - Jenis publikasi yang terpetakan langsung ke nilai OpenAlex (`article`, `review`, `preprint`).
  - Toggle `Hanya Open Access` (`is_oa:true`).
  - Pengurutan berdasarkan **Paling Relevan (OpenAlex)**, **Rekomendasi Data Mining (TF-IDF)**, **Terbaru**, dan **Paling Banyak Disitasi**.
  - Paginasi 10 hasil per halaman dengan sinkronisasi penuh pada parameter URL (tautan dapat dibagikan).
- **Detail Publikasi Transparan**: Menampilkan judul, daftar penulis, tanggal/tahun terbit, jurnal/sumber, penerbit (jika tersedia), DOI terverifikasi, abstrak hasil dekode `abstract_inverted_index`, jumlah sitasi, status akses terbuka, tautan sumber asli, tautan PDF terverifikasi (hanya jika tersedia dari OpenAlex), serta helper salin sitasi APA.
- **Autentikasi & Data Pribadi (Supabase)**:
  - Registrasi, masuk, dan keluar menggunakan Supabase Auth (Email/Password).
  - Halaman **Bookmark**, **Riwayat Pencarian**, dan **Profil** yang dilindungi autentikasi.
  - Pencegahan duplikat bookmark melalui constraint database `unique(user_id, paper_id)`.
  - Pencarian dan detail makalah tetap berfungsi penuh tanpa login; riwayat pencarian anonim tidak disimpan secara diam-diam.

## Struktur Proyek

```text
├── api/
│   ├── search.ts            # Vercel serverless function: GET /api/search
│   └── paper.ts             # Vercel serverless function: GET /api/paper
├── server/
│   ├── openalex.ts          # Validasi query, caching, dekode abstrak & normalisasi OpenAlex
│   └── tfidf.ts             # Pipeline Data Mining: preprocessing, TF-IDF & Cosine Similarity
├── server.ts                # Express dev/production server (lokal & preview)
├── src/
│   ├── components/          # Navbar, Footer, SearchBar, PaperCard, FilterSidebar, Pagination, dll.
│   ├── contexts/            # AuthContext (sesi Supabase, profil, sinkronisasi bookmark)
│   ├── lib/                 # Inisialisasi Supabase client & utilitas format/URL
│   ├── pages/               # Home, SearchResults, PaperDetail, Login, Register, Bookmarks, History, Profile, NotFound
│   ├── services/            # Client API (/api/search, /api/paper) & CRUD Supabase
│   └── types/               # Definisi tipe TypeScript Paper & UserData
├── vercel.json              # Konfigurasi rewrite SPA & serverless functions untuk Vercel
├── .env.example             # Template variabel lingkungan (tanpa nilai rahasia)
└── package.json
```

## Pipeline Data Mining (TF-IDF & Cosine Similarity)

Saat pengguna memilih pengurutan **Rekomendasi Data Mining (TF-IDF)** (`sort=tfidf`), backend (`server/openalex.ts` & `server/tfidf.ts`) menjalankan pemeringkatan berbasis konten secara nyata:

1. **Pengambilan Pool Kandidat Tetap**: Mengambil hingga **80 publikasi kandidat** nyata dari OpenAlex `/works` sesuai kueri dan seluruh filter aktif (tahun, jenis publikasi, Open Access) sebelum pemeringkatan dilakukan. Pool hasil peringkat di-cache (5 menit) sehingga perpindahan halaman (`page=1, 2, ...`) memotong kumpulan kandidat yang sama secara konsisten.
2. **Dekode & Ekstraksi Teks**: Menggabungkan judul (`title`) dan abstrak hasil dekode `abstract_inverted_index`. Jika abstrak tidak tersedia pada metadata sumber, makalah tetap dinilai secara aman menggunakan judul saja dan ditandai secara transparan (`judul saja`).
3. **Preprocessing Teks (`preprocessText`)**:
   - Normalisasi Unicode NFKD (penghapusan diakritik) dan konversi ke huruf kecil (*lowercase*).
   - Penghapusan tanda baca dan simbol non-alfanumerik.
   - Tokenisasi berbasis spasi dan penyaringan token tunggal/angka berdiri sendiri.
   - Penghapusan *stopwords* dwibahasa (**Bahasa Inggris & Bahasa Indonesia**) dengan tetap menjaga akronim teknis (`ai`, `ml`, `nlp`, `iot`, `cnn`, dll.).
4. **Perhitungan TF-IDF**:
   - **Term Frequency (TF)** ternormalisasi panjang dokumen: `tf(t, d) = count(t, d) / totalTokens(d)`.
   - **Smooth Inverse Document Frequency (IDF)**: `idf(t) = ln((N + 1) / (df(t) + 1)) + 1`, sehingga istilah kueri yang muncul di seluruh kandidat tetap memiliki bobot positif (`1.0`) dan bebas pembagian nol.
   - Bobot vektor: `tfidf(t, d) = tf(t, d) * idf(t)`.
5. **Cosine Similarity & Pemeringkatan**:
   - `cos(q, d) = (v_q · v_d) / (||v_q|| * ||v_d||)` dengan rentang terbatasi `[0, 1]`.
   - Seluruh kandidat diurutkan menurun berdasarkan skor **Kemiripan Teks** (tie-breaker deterministik: jumlah sitasi, lalu ID OpenAlex).
6. **Transparansi & Keterbatasan**:
   - Skor selalu ditampilkan sebagai **Kemiripan Teks**, bukan penilaian kualitas ilmiah.
   - Pemeringkatan hanya berlaku atas pool kandidat yang diambil dari OpenAlex, bukan seluruh basis data OpenAlex.
   - Karena TF-IDF bekerja pada kesamaan leksikal token, kueri berbahasa Indonesia terhadap abstrak berbahasa Inggris dapat menghasilkan skor kemiripan lebih rendah apabila istilah tidak saling tumpang tindih secara leksikal.

## Variabel Lingkungan

Salin `.env.example` menjadi `.env` untuk pengembangan lokal:

```bash
cp .env.example .env
```

Isi variabel berikut:

| Variabel | Scope | Keterangan |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client (Publik) | URL proyek Supabase Anda (contoh: `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Client (Publik) | Kunci `anon` publik dari pengaturan API Supabase. **Jangan pernah gunakan `service_role` key di frontend.** |
| `OPENALEX_API_KEY` | Server Only | API key OpenAlex (digunakan hanya di `api/` dan `server/`, tidak pernah diekspos ke browser). |
| `OPENALEX_MAILTO` | Server Only (Opsional) | Alamat email kontak untuk header `User-Agent` OpenAlex polite pool. |

> Jika `VITE_SUPABASE_URL` atau `VITE_SUPABASE_ANON_KEY` belum diatur, aplikasi tetap berjalan normal untuk pencarian OpenAlex dan menampilkan pesan konfigurasi yang jelas pada fitur autentikasi, bookmark, riwayat, dan profil.

## Skema Tabel Supabase yang Digunakan

ScholarFind dirancang untuk bekerja dengan tabel `public` yang sudah ada di proyek Supabase Anda beserta kebijakan **Row Level Security (RLS)** per pengguna (`auth.uid() = user_id` atau `auth.uid() = id`):

1. **`public.profiles`**
   - Kolom: `id` (`uuid`, primary key = `auth.users.id`), `full_name` (`text`), `university` (`text`), `created_at` (`timestamptz`)
2. **`public.bookmarks`**
   - Kolom: `id` (`uuid`), `user_id` (`uuid`), `paper_id` (`text`), `title` (`text`), `authors` (`text[]` atau `text`), `publication_year` (`int4`), `doi` (`text`), `paper_url` (`text`), `created_at` (`timestamptz`)
   - Constraint: `unique(user_id, paper_id)`
3. **`public.search_history`**
   - Kolom: `id` (`uuid`), `user_id` (`uuid`), `keyword` (`text`), `filters` (`jsonb`), `created_at` (`timestamptz`)

Pastikan **Email/Password provider** aktif di **Authentication → Providers** pada dashboard Supabase Anda, dan RLS mengizinkan pengguna terautentikasi melakukan `SELECT`, `INSERT`, `UPDATE`, dan `DELETE` hanya pada baris milik mereka sendiri.

## Pengembangan Lokal

1. Instal dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan (Express + Vite + `/api/search` & `/api/paper` pada port `3000`):
   ```bash
   npm run dev
   ```
3. Pemeriksaan tipe TypeScript & build produksi:
   ```bash
   npm run lint
   npm run build
   ```
4. Pratinjau hasil build:
   ```bash
   npm run preview
   ```

## Deployment ke GitHub & Vercel

1. Push repositori ke GitHub (pastikan `.env` tidak ikut terunggah; `.gitignore` sudah mengecualikan `.env*` selain `.env.example`).
2. Impor repositori ke **Vercel**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Tambahkan environment variables di **Vercel Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENALEX_API_KEY`
   - `OPENALEX_MAILTO` (opsional)
4. File `vercel.json` sudah mengonfigurasi rewrite agar seluruh rute SPA (`/search`, `/paper/:id`, `/bookmarks`, dll.) tetap bekerja saat halaman di-refresh, sementara `/api/search` dan `/api/paper` dijalankan sebagai Vercel Serverless Functions.
