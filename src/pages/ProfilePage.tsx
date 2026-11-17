import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, formatTimestamp } from '../lib/formatters';

export function ProfilePage() {
  const { user, profile, bookmarks, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [university, setUniversity] = useState(profile?.university ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setUniversity(profile?.university ?? '');
  }, [profile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    if (fullName.trim().length < 2) {
      setError('Nama tampilan minimal terdiri dari 2 karakter.');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      full_name: fullName.trim(),
      university: university.trim(),
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Profil Pengguna
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Informasi akun dan afiliasi akademik Anda di ScholarFind.
        </p>
      </div>

      {/* Account Summary Strip */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">Email Terdaftar</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">
            {user?.email ?? 'Tidak tersedia'}
          </p>
          <p className="mt-1.5 text-xs text-[#64748B] tabular-nums">
            Terdaftar sejak {formatTimestamp(profile?.created_at ?? user?.created_at)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">Bookmark Tersimpan</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A] tabular-nums">
            {formatNumber(bookmarks.length)}
          </p>
          <div className="mt-1.5 flex gap-4 text-xs font-medium text-[#2563EB]">
            <Link to="/bookmarks" className="hover:text-[#1D4ED8]">
              Kelola Bookmark
            </Link>
            <Link to="/history" className="hover:text-[#1D4ED8]">
              Lihat Riwayat
            </Link>
          </div>
        </div>
      </div>

      {/* Editable Profile Form */}
      <form
        onSubmit={handleSave}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="text-base font-semibold text-[#0F172A]">Informasi Akademik</h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Perubahan akan disimpan langsung ke tabel profil Supabase Anda.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="profile-fullname" className="block text-sm font-medium text-[#0F172A]">
              Nama Tampilan
            </label>
            <input
              id="profile-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-university" className="block text-sm font-medium text-[#0F172A]">
              Universitas / Institusi
            </label>
            <input
              id="profile-university"
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="Contoh: Institut Teknologi Bandung"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}

        {savedNotice && (
          <p
            role="status"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Profil berhasil diperbarui.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-[#2563EB] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? 'Keluar...' : 'Keluar'}
          </button>
        </div>
      </form>
    </div>
  );
}
