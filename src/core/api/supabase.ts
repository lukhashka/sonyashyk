import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Only the public anon key is ever used in the frontend; RLS is the real protection. */
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
  { auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true } },
);

/** Throw-away client that never touches the stored session (used to re-check a password). */
export function createEphemeralClient() {
  return createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
