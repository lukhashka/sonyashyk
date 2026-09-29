import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/core/api/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** Signed in with a password but the TOTP second step is still pending. */
  needsMfa: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; mfa: boolean }>;
  verifyMfa: (code: string) => Promise<boolean>;
  signOut: (everywhere?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function readNeedsMfa(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setNeedsMfa(await readNeedsMfa());
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setNeedsMfa(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Generic message: never reveal whether the account exists.
    if (error) return { error: 'invalid', mfa: false };
    const mfa = await readNeedsMfa();
    setNeedsMfa(mfa);
    return { error: null, mfa };
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (!factor) return false;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return false;
    setNeedsMfa(await readNeedsMfa());
    return true;
  }, []);

  const signOut = useCallback(async (everywhere = false) => {
    await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' });
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, loading, needsMfa, signIn, verifyMfa, signOut }),
    [session, loading, needsMfa, signIn, verifyMfa, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
