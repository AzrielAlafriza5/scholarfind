import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SupabaseNotice } from '../components/SupabaseNotice';
import { useAuth } from '../contexts/AuthContext';

interface LoginLocationState {
  from?: string;
  message?: string;
}

export function LoginPage() {
  const { user, signIn, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LoginLocationState | null) ?? {};

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={state.from || '/bookmarks'} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (!password) {
      setError('Masukkan kata sandi Anda.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmedEmail, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(state.from || '/bookmarks', { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Masuk ke ScholarFind
        </h1>
        <p className="mt-1.5 text-sm text-[#64748B]">
          Kelola bookmark publikasi, riwayat pencarian, dan profil akademik Anda.
        </p>

        {state.message && (
          <div
            role="status"
            className="mt-5 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs font-medium text-blue-900"
          >
            {state.message}
          </div>
        )}

        {!isSupabaseConfigured ? (
          <div className="mt-6">
            <SupabaseNotice compact />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#0F172A]">
                Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="block text-sm font-medium text-[#0F172A]">
                Kata Sandi
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
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
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        )}

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-[#64748B]">
          Belum memiliki akun?{' '}
          <Link
            to="/register"
            state={state}
            className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
