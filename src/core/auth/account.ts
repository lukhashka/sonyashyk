import { z } from 'zod';
import { createEphemeralClient, supabase } from '@/core/api/supabase';

export const changePasswordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(10).max(72),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'mismatch' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'same' });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Re-checks a password on a throw-away client so the current session (and its MFA level) is untouched. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const { error } = await createEphemeralClient().auth.signInWithPassword({ email, password });
  return !error;
}

export type ChangePasswordResult = 'ok' | 'wrong_current' | 'error';

export async function changePassword(
  email: string,
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  const values = changePasswordSchema.parse(input);
  if (!(await verifyPassword(email, values.current))) return 'wrong_current';
  const { error } = await supabase.auth.updateUser({ password: values.next });
  return error ? 'error' : 'ok';
}

// --- TOTP two-factor authentication -------------------------------------------------------

export async function getTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp[0]?.id ?? null; // `totp` only lists verified factors
}

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  // Abandoned earlier attempts would block a new enrollment.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Sonyashyk',
  });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmTotp(factorId: string, code: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return !error;
}

export async function removeTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// --- Data export & account deletion -------------------------------------------------------

export function buildExport(
  user: { id: string; email?: string; created_at?: string },
  profile: unknown,
  now = new Date(),
  extra: Record<string, unknown> = {},
) {
  return {
    exported_at: now.toISOString(),
    account: { id: user.id, email: user.email ?? null, created_at: user.created_at ?? null },
    profile,
    ...extra,
  };
}

export async function exportMyData(): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');
  const { data: profile, error } = await supabase.from('profiles').select('*').single();
  if (error) throw error;
  // Rows are limited to the caller's own by RLS.
  const tables = [
    'daily_plans',
    'daily_tasks',
    'xp_events',
    'streaks',
    'ew_user_words',
    'ew_reviews',
    'ew_settings',
  ] as const;
  const extra: Record<string, unknown> = {};
  for (const table of tables) {
    const { data, error: tableError } = await supabase.from(table).select('*');
    if (tableError) throw tableError;
    extra[table] = data;
  }
  // The shared dictionary is not personal data; only the user's own custom words are exported.
  const { data: custom, error: customError } = await supabase
    .from('ew_words')
    .select('*')
    .not('owner_id', 'is', null);
  if (customError) throw customError;
  extra.ew_custom_words = custom;
  const payload = buildExport(userData.user, profile, new Date(), extra);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sonyashyk-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type DeleteAccountResult = 'ok' | 'wrong_password' | 'error';

export async function deleteMyAccount(
  email: string,
  password: string,
): Promise<DeleteAccountResult> {
  if (!(await verifyPassword(email, password))) return 'wrong_password';
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return 'error';
  await supabase.auth.signOut({ scope: 'local' });
  return 'ok';
}
