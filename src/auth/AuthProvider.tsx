import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppRole, ProfileWithOrganization } from '@/types/database';

interface SignUpInput {
  nama: string;
  email: string;
  password: string;
  accountType: Extract<AppRole, 'warga' | 'pembeli'>;
}

interface AuthContextValue {
  session: Session | null;
  profile: ProfileWithOrganization | null;
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: SignUpInput) => Promise<{
    error: string | null;
    needsConfirmation: boolean;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_SELECT = `
  id, nama, role, org_id, avatar_url, created_at,
  organizations (
    id, nama, tipe, status, kota, provinsi, alamat, telepon,
    lat, lng, logo_url
  )
`;

const sleep = (duration: number) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithOrganization | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const currentRequest = ++requestId.current;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle();

      if (currentRequest !== requestId.current) return;

      if (error) {
        setProfileError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data as unknown as ProfileWithOrganization);
        setProfileError(null);
        setLoading(false);
        return;
      }

      // Trigger pembuatan profil berjalan bersamaan dengan proses sign-up.
      await sleep(250);
      if (currentRequest !== requestId.current) return;
    }

    setProfile(null);
    setProfileError('Profil pengguna tidak ditemukan. Coba muat ulang halaman.');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let disposed = false;

    const bootstrap = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (disposed) return;

      setSession(activeSession);
      if (activeSession?.user) {
        await fetchProfile(activeSession.user.id);
      } else {
        setLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (disposed) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT') {
        requestId.current += 1;
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        queryClient.clear();
        return;
      }

      if (event === 'TOKEN_REFRESHED') return;

      if (
        nextSession?.user &&
        (event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION')
      ) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setLoading(true);
          setProfileError(null);
        }

        // Hindari deadlock: jangan await Supabase lain di dalam callback auth.
        window.setTimeout(() => {
          if (!disposed) void fetchProfile(nextSession.user.id);
        }, 0);
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile, queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/masuk`,
        data: {
          nama: input.nama.trim(),
          account_type: input.accountType,
        },
      },
    });

    if (error) return { error: error.message, needsConfirmation: false };

    return {
      error: null,
      needsConfirmation: !data.session,
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await fetchProfile(user.id);
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }
  return context;
}
