import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  SUPABASE_UNCONFIGURED_MESSAGE,
} from '../lib/supabase';
import {
  createBookmark,
  deleteBookmarkById,
  deleteBookmarkByPaperId,
  fetchBookmarks,
  fetchUserProfile,
  upsertUserProfile,
} from '../services/userData';
import type { Paper } from '../types/paper';
import type { BookmarkRecord, UserProfile } from '../types/user';

interface AuthActionResult {
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

interface ToggleBookmarkResult {
  saved: boolean;
  error: string | null;
  requiresLogin?: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  authLoading: boolean;
  isSupabaseConfigured: boolean;
  bookmarks: BookmarkRecord[];
  bookmarksLoading: boolean;
  bookmarkedPaperIds: Set<string>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    university: string;
  }) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  updateProfile: (payload: { full_name: string; university: string }) => Promise<AuthActionResult>;
  refreshBookmarks: () => Promise<void>;
  toggleBookmark: (paper: Paper) => Promise<ToggleBookmarkResult>;
  removeBookmarkById: (bookmarkId: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi tidak sesuai. Periksa kembali kredensial Anda.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email Anda belum diverifikasi. Periksa kotak masuk email Anda untuk konfirmasi.';
  }
  if (lower.includes('user already registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.';
  }
  if (lower.includes('password should be at least')) {
    return 'Kata sandi harus terdiri dari minimal 6 karakter.';
  }
  if (lower.includes('rate limit')) {
    return 'Terlalu banyak percobaan autentikasi. Mohon tunggu sebentar sebelum mencoba lagi.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState<boolean>(false);

  const loadUserRecords = useCallback(async (activeUser: User | null) => {
    if (!activeUser || !supabase) {
      setProfile(null);
      setBookmarks([]);
      setBookmarksLoading(false);
      return;
    }

    setBookmarksLoading(true);
    try {
      const [profileData, bookmarkData] = await Promise.all([
        fetchUserProfile(activeUser.id).catch(() => null),
        fetchBookmarks(activeUser.id).catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
      } else {
        const metaName =
          typeof activeUser.user_metadata?.full_name === 'string'
            ? activeUser.user_metadata.full_name
            : null;
        const metaUniversity =
          typeof activeUser.user_metadata?.university === 'string'
            ? activeUser.user_metadata.university
            : null;
        setProfile({
          id: activeUser.id,
          full_name: metaName,
          university: metaUniversity,
          created_at: activeUser.created_at ?? null,
        });
      }

      setBookmarks(bookmarkData);
    } finally {
      setBookmarksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const currentSession = data.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setAuthLoading(false);
        void loadUserRecords(currentSession?.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthLoading(false);
      void loadUserRecords(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserRecords]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return { error: SUPABASE_UNCONFIGURED_MESSAGE };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(
    async (params: {
      email: string;
      password: string;
      fullName: string;
      university: string;
    }): Promise<AuthActionResult> => {
      if (!supabase) {
        return { error: SUPABASE_UNCONFIGURED_MESSAGE };
      }

      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            university: params.university.trim(),
          },
        },
      });

      if (error) {
        return { error: translateAuthError(error.message) };
      }

      if (data.user && data.session) {
        try {
          const savedProfile = await upsertUserProfile(data.user.id, {
            full_name: params.fullName.trim(),
            university: params.university.trim(),
          });
          setProfile(savedProfile);
        } catch {
          // Profile row may be initialized via database trigger or created later on profile edit
        }
        return { error: null, requiresEmailConfirmation: false };
      }

      return { error: null, requiresEmailConfirmation: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setBookmarks([]);
  }, []);

  const updateProfile = useCallback(
    async (payload: { full_name: string; university: string }): Promise<AuthActionResult> => {
      if (!supabase || !user) {
        return { error: 'Anda harus masuk terlebih dahulu untuk memperbarui profil.' };
      }
      try {
        const updated = await upsertUserProfile(user.id, payload);
        setProfile(updated);
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'Gagal memperbarui profil.',
        };
      }
    },
    [user]
  );

  const refreshBookmarks = useCallback(async () => {
    if (!user || !supabase) {
      setBookmarks([]);
      return;
    }
    setBookmarksLoading(true);
    try {
      const list = await fetchBookmarks(user.id);
      setBookmarks(list);
    } finally {
      setBookmarksLoading(false);
    }
  }, [user]);

  const bookmarkedPaperIds = useMemo(
    () => new Set(bookmarks.map((item) => item.paper_id)),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (paper: Paper): Promise<ToggleBookmarkResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return { saved: false, error: SUPABASE_UNCONFIGURED_MESSAGE };
      }
      if (!user) {
        return {
          saved: false,
          error: 'Masuk terlebih dahulu untuk menyimpan publikasi ke bookmark.',
          requiresLogin: true,
        };
      }

      const alreadySaved = bookmarkedPaperIds.has(paper.id);
      try {
        if (alreadySaved) {
          await deleteBookmarkByPaperId(user.id, paper.id);
          setBookmarks((prev) => prev.filter((item) => item.paper_id !== paper.id));
          return { saved: false, error: null };
        }

        const { record, duplicate } = await createBookmark(user.id, paper);
        if (duplicate) {
          await refreshBookmarks();
          return { saved: true, error: null };
        }
        if (record) {
          setBookmarks((prev) => [record, ...prev.filter((item) => item.paper_id !== record.paper_id)]);
        }
        return { saved: true, error: null };
      } catch (err) {
        return {
          saved: alreadySaved,
          error: err instanceof Error ? err.message : 'Operasi bookmark gagal.',
        };
      }
    },
    [bookmarkedPaperIds, refreshBookmarks, user]
  );

  const removeBookmarkById = useCallback(
    async (bookmarkId: string): Promise<string | null> => {
      if (!user || !supabase) {
        return 'Anda harus masuk untuk menghapus bookmark.';
      }
      try {
        await deleteBookmarkById(user.id, bookmarkId);
        setBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Gagal menghapus bookmark.';
      }
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    session,
    profile,
    authLoading,
    isSupabaseConfigured,
    bookmarks,
    bookmarksLoading,
    bookmarkedPaperIds,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshBookmarks,
    toggleBookmark,
    removeBookmarkById,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
