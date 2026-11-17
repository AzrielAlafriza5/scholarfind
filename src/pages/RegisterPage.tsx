import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { SupabaseNotice } from '../components/SupabaseNotice';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const { user, signUp, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedUni = university.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setError('Masukkan nama lengkap Anda (minimal 2 karakter).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      email: trimmedEmail,
      password,
      fullName: trimmedName,
      university: trimmedUni,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }

    navigate('/profile', { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Daftar Akun ScholarFind
        </h1>
        <p className="mt-1.5 text-sm text-[#64748B]">
          Buat akun mahasiswa untuk menyimpan bookmark makalah dan riwayat pencarian.
        </p>

        {!isSupabaseConfigured ? (
          <div className="mt-6">
            <SupabaseNotice compact />
          </div>
        ) : confirmationSent ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-emerald-950">
                  Pendaftaran Berhasil
                </h2>
                <p className="text-sm leading-relaxed text-emerald-900">
                  Tautan konfirmasi telah dikirim ke <span className="font-medium">{email}</span>.
                  Silakan verifikasi email Anda sebelum masuk ke akun.
                </p>
                <Link
                  to="/login"
                  className="mt-2 inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-4 text-xs font-medium text-white hover:bg-[#1D4ED8]"
                >
                  Ke Halaman Masuk
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-[#0F172A]">
                Nama Lengkap
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Nadia Pratama"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="register-university" className="block text-sm font-medium text-[#0F172A]">
                Universitas / Institusi <span className="font-normal text-[#64748B]">(Opsional)</span>
              </label>
              <input
                id="register-university"
                type="text"
                autoComplete="organization"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="Contoh: Universitas Indonesia"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-[#0F172A]">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@universitas.ac.id"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-[#0F172A]">
                Kata Sandi
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-[#0F172A]">
                Konfirmasi Kata Sandi
              </label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Mendaftarkan...' : 'Daftar Akun'}
            </button>
          </form>
        )}

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-[#64748B]">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="font-medium text-[#2563EB] hover:text-[#1D4ED8]">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
