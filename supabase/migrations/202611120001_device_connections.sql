begin;

-- Devices have independent Auth sessions. Only a verified membership changes their active journal.
create table public.happi_devices (
  device_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null check (length(btrim(device_label)) between 1 and 40),
  connected_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (device_id <> owner_id)
);
create index happi_devices_owner on public.happi_devices(owner_id) where revoked_at is null;
create table public.happi_device_codes (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);
create table public.happi_device_attempts (
  device_id uuid primary key references auth.users(id) on delete cascade,
  window_started timestamptz not null,
  attempts integer not null check (attempts between 1 and 6)
);
alter table public.happi_devices enable row level security;
alter table public.happi_device_codes enable row level security;
alter table public.happi_device_attempts enable row level security;
revoke all on public.happi_devices, public.happi_device_codes, public.happi_device_attempts from public, anon, authenticated;

create function public.happi_journal_owner()
returns uuid language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.happi_devices where device_id = auth.uid())
    then (select owner_id from public.happi_devices where device_id = auth.uid() and revoked_at is null)
    else auth.uid() end
$$;
revoke all on function public.happi_journal_owner() from public, anon;
grant execute on function public.happi_journal_owner() to authenticated;

create function public.happi_create_device_code(p_display_name text, p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); connection_code text; expiry timestamptz;
begin
  if current_user_id is null then raise exception 'Sign in before connecting a device.'; end if;
  if exists (select 1 from public.happi_devices where device_id = current_user_id) then
    raise exception 'Create the connection code on the original device.';
  end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 40
    or not public.happi_valid_schedule(p_schedule) then raise exception 'Invalid journal settings.'; end if;
  -- Preserve an existing profile; a journal that only has entries still needs its original name on PC.
  insert into public.happi_profiles(user_id, display_name, schedule)
    values(current_user_id, btrim(p_display_name), p_schedule) on conflict(user_id) do nothing;
  connection_code := upper(substr(encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'hex'), 1, 20));
  expiry := clock_timestamp() + interval '10 minutes';
  insert into public.happi_device_codes(owner_id, code_hash, expires_at)
    values(current_user_id, encode(sha256(convert_to(connection_code, 'UTF8')), 'hex'), expiry)
    on conflict(owner_id) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at;
  return jsonb_build_object('code', connection_code, 'expires_at', expiry);
end $$;
revoke all on function public.happi_create_device_code(text,jsonb) from public, anon;
grant execute on function public.happi_create_device_code(text,jsonb) to authenticated;

create function public.happi_redeem_device_code(p_code text, p_device_label text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); used_attempts integer; code_owner uuid; code_expiry timestamptz; normalized text;
begin
  if current_user_id is null then raise exception 'Sign in before connecting a device.'; end if;
  -- Return failed attempts normally: raising would roll back the rate-limit counter.
  insert into public.happi_device_attempts(device_id,window_started,attempts)
    values(current_user_id,clock_timestamp(),1)
    on conflict(device_id) do update set
      attempts = case when happi_device_attempts.window_started < clock_timestamp()-interval '15 minutes' then 1 else least(happi_device_attempts.attempts+1,6) end,
      window_started = case when happi_device_attempts.window_started < clock_timestamp()-interval '15 minutes' then clock_timestamp() else happi_device_attempts.window_started end
    returning attempts into used_attempts;
  if used_attempts > 5 then return jsonb_build_object('ok',false,'message','Too many attempts. Wait 15 minutes before trying again.'); end if;
  normalized := upper(regexp_replace(coalesce(p_code,''), '[[:space:]-]', '', 'g'));
  if length(normalized) <> 20 or normalized !~ '^[A-F0-9]{20}$' then
    return jsonb_build_object('ok',false,'message','That code is invalid, expired or already used. Generate a new code on your phone.');
  end if;
  if p_device_label is null or length(btrim(p_device_label)) not between 1 and 40 then
    return jsonb_build_object('ok',false,'message','Name this device using 1–40 characters.');
  end if;
  select owner_id,expires_at into code_owner,code_expiry from public.happi_device_codes
    where code_hash=encode(sha256(convert_to(normalized,'UTF8')),'hex') and expires_at > clock_timestamp() for update;
  if code_owner is null or code_expiry <= clock_timestamp() or code_owner=current_user_id or exists(select 1 from public.happi_devices where device_id=code_owner) then
    return jsonb_build_object('ok',false,'message','That code is invalid, expired or already used. Generate a new code on your phone.');
  end if;
  if exists(select 1 from public.happi_devices where device_id=current_user_id and revoked_at is null) then
    return jsonb_build_object('ok',false,'message','This device is already connected to a journal.');
  end if;
  if exists(select 1 from public.happi_entries where user_id=current_user_id)
    or exists(select 1 from public.happi_profiles where user_id=current_user_id)
    or exists(select 1 from public.happi_devices where owner_id=current_user_id) then
    return jsonb_build_object('ok',false,'message','This device already has its own journal. Use a fresh browser profile to connect without losing access to it.');
  end if;
  if (select count(*) from public.happi_devices where owner_id=code_owner and revoked_at is null) >= 10 then
    return jsonb_build_object('ok',false,'message','Remove an old connected device on your phone before adding another.');
  end if;
  insert into public.happi_devices(device_id,owner_id,device_label)
    values(current_user_id,code_owner,btrim(p_device_label))
    on conflict(device_id) do update set owner_id=excluded.owner_id,device_label=excluded.device_label,connected_at=now(),revoked_at=null;
  delete from public.happi_device_codes where owner_id=code_owner;
  return jsonb_build_object('ok',true,'owner_id',code_owner);
end $$;
revoke all on function public.happi_redeem_device_code(text,text) from public, anon;
grant execute on function public.happi_redeem_device_code(text,text) to authenticated;

create function public.happi_list_devices()
returns table(device_id uuid, device_label text, connected_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select device_id,device_label,connected_at from public.happi_devices
    where owner_id=auth.uid() and revoked_at is null order by connected_at
$$;
revoke all on function public.happi_list_devices() from public, anon;
grant execute on function public.happi_list_devices() to authenticated;

create function public.happi_revoke_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.happi_devices set revoked_at=clock_timestamp()
    where owner_id=auth.uid() and device_id=p_device_id and revoked_at is null;
  return found;
end $$;
revoke all on function public.happi_revoke_device(uuid) from public, anon;
grant execute on function public.happi_revoke_device(uuid) to authenticated;

-- Each device can read/write only its effective journal; ownership cannot be reassigned.
alter policy profiles_read_own on public.happi_profiles using ((select public.happi_journal_owner())=user_id);
alter policy profiles_insert_own on public.happi_profiles with check ((select public.happi_journal_owner())=user_id);
alter policy profiles_update_own on public.happi_profiles using ((select public.happi_journal_owner())=user_id) with check ((select public.happi_journal_owner())=user_id);
alter policy entries_read_own on public.happi_entries using ((select public.happi_journal_owner())=user_id);
alter policy entries_insert_own on public.happi_entries with check ((select public.happi_journal_owner())=user_id);
alter policy entries_update_own on public.happi_entries using ((select public.happi_journal_owner())=user_id) with check ((select public.happi_journal_owner())=user_id);

notify pgrst, 'reload schema';
commit;
