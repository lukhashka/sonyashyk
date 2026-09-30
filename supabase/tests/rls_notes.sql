-- RLS test for the Notes tables. Rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nt-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nt-b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

do $$
declare v_folder uuid; v_note uuid; n int;
begin
  insert into public.nt_folders (name) values ('Цивільне право') returning id into v_folder;
  perform set_config('test.folder_a', v_folder::text, true);
  insert into public.nt_notes (folder_id, title, body_md, tags)
  values (v_folder, 'IRAC: договір', 'Issue: чи є порушення договору? liability', '{ЦК,договір}')
  returning id into v_note;
  perform set_config('test.note_a', v_note::text, true);

  -- Full-text search: Ukrainian (exact word, prefix) and English (stemmed).
  select count(*) into n from public.nt_notes where search @@ to_tsquery('simple', 'договір:*');
  if n <> 1 then raise exception 'FAIL: Ukrainian search found % rows', n; end if;
  select count(*) into n from public.nt_notes where search @@ to_tsquery('english', 'liabilities');
  if n <> 1 then raise exception 'FAIL: English stemmed search found % rows', n; end if;

  -- The preview is a short excerpt.
  select count(*) into n from public.nt_notes where char_length(preview) <= 160;
  if n <> 1 then raise exception 'FAIL: preview too long'; end if;

  -- Size limit is a DB constraint.
  begin
    insert into public.nt_notes (body_md) values (repeat('x', 100001));
    raise exception 'FAIL: oversized body accepted';
  exception when check_violation then null; end;

  -- Permanent delete only from the trash.
  delete from public.nt_notes where id = v_note;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: deleted a note that was not in the trash'; end if;
  update public.nt_notes set deleted_at = now() where id = v_note;
end $$;

-- B sees nothing of A and cannot touch it or file notes into A's folder.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

do $$
declare n int; v_note uuid := current_setting('test.note_a')::uuid; v_folder uuid := current_setting('test.folder_a')::uuid;
begin
  select count(*) into n from public.nt_notes;
  if n <> 0 then raise exception 'FAIL: B sees % of A''s notes', n; end if;
  select count(*) into n from public.nt_folders;
  if n <> 0 then raise exception 'FAIL: B sees A''s folders'; end if;
  update public.nt_notes set title = 'hacked' where id = v_note;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A''s note'; end if;
  delete from public.nt_notes where id = v_note;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s trashed note'; end if;
  begin
    insert into public.nt_notes (folder_id, title) values (v_folder, 'into A''s folder');
    raise exception 'FAIL: B filed a note into A''s folder';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.nt_notes (user_id, title) values ('00000000-0000-0000-0000-0000000000a2', 'forged');
    raise exception 'FAIL: B inserted a note owned by A';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.nt_folders (user_id, name) values ('00000000-0000-0000-0000-0000000000a2', 'forged');
    raise exception 'FAIL: B inserted a folder owned by A';
  exception when insufficient_privilege then null; end;
end $$;

-- A can restore/delete their own trashed note; anon sees nothing.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
do $$
declare n int; v_note uuid := current_setting('test.note_a')::uuid;
begin
  delete from public.nt_notes where id = v_note;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A could not delete a trashed note'; end if;
end $$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.nt_notes;
    raise exception 'FAIL: anon can read notes';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'rls_notes: OK' as result;
