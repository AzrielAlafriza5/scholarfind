import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseNotice } from './SupabaseNotice';

interface ProtectedRouteProps {
  children: ReactNode;
  pageTitle: string;
}

export function ProtectedRoute({ children, pageTitle }: ProtectedRouteProps) {
  const { user, authLoading, isSupabaseConfigured } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-[#0F172A]">{pageTitle}</h1>
        <SupabaseNotice />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 space-y-4">
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
          message: `Silakan masuk untuk mengakses halaman ${pageTitle}.`,
        }}
      />
    );
  }

  return <>{children}</>;
}
