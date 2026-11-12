-- Run once after the existing cloud-journal and device-connection migrations.
-- Existing entries, profiles, sessions and ownership stay in place.
begin;

create or replace function public.happi_create_device_code(p_display_name text, p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); connection_code text; expiry timestamptz; journal_id uuid; removed_at timestamptz;
begin
  if current_user_id is null then raise exception 'Sign in before connecting a device.'; end if;
  -- Serialize invitations with removal of this device; never trust a caller-supplied owner.
  select owner_id, revoked_at into journal_id, removed_at
    from public.happi_devices where device_id = current_user_id for update;
  if found then
    if removed_at is not null then raise exception 'This device was disconnected.'; end if;
  else
    journal_id := current_user_id;
  end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 40
    or not public.happi_valid_schedule(p_schedule) then raise exception 'Invalid journal settings.'; end if;
  -- Preserve an existing profile; a journal that only has entries still needs its original name on PC.
  insert into public.happi_profiles(user_id, display_name, schedule)
    values(journal_id, btrim(p_display_name), p_schedule) on conflict(user_id) do nothing;
  connection_code := upper(substr(encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'hex'), 1, 20));
  expiry := clock_timestamp() + interval '10 minutes';
  insert into public.happi_device_codes(owner_id, code_hash, expires_at)
    values(journal_id, encode(sha256(convert_to(connection_code, 'UTF8')), 'hex'), expiry)
    on conflict(owner_id) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at;
  return jsonb_build_object('code', connection_code, 'expires_at', expiry);
end $$;
revoke all on function public.happi_create_device_code(text,jsonb) from public, anon;
grant execute on function public.happi_create_device_code(text,jsonb) to authenticated;

create or replace function public.happi_revoke_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.happi_devices set revoked_at=clock_timestamp()
    where owner_id=auth.uid() and device_id=p_device_id and revoked_at is null;
  if not found then return false; end if;
  -- Invalidate outstanding invitations when access changes, including codes issued by the removed device.
  delete from public.happi_device_codes where owner_id = auth.uid();
  return true;
end $$;
revoke all on function public.happi_revoke_device(uuid) from public, anon;
grant execute on function public.happi_revoke_device(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
