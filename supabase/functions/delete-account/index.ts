// Deletes the calling user's account: avatar files first, then the auth user
// (profiles and every other user-owned row cascade via `on delete cascade`).
// The service-role key is provided by the Supabase runtime and never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !anonKey || !serviceKey || !authorization)
    return json({ error: 'unauthorized' }, 401);

  // Identify the caller from their own JWT; never trust a user id from the request body.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);
  const userId = data.user.id;

  const admin = createClient(url, serviceKey);

  const { data: files } = await admin.storage.from('avatars').list(userId);
  if (files?.length) {
    await admin.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ ok: true });
});
