begin;

create function public.happi_valid_schedule(slots jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := '{}'; times text[] := '{}';
begin
  if jsonb_typeof(slots) is distinct from 'array' then return false; end if;
  if jsonb_array_length(slots) < 3 or jsonb_array_length(slots) > 1440 then return false; end if;
  for item in select value from jsonb_array_elements(slots) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or length(item->>'id') not between 1 and 100
      or jsonb_typeof(item->'label') is distinct from 'string'
      or length(btrim(item->>'label')) < 1 or length(item->>'label') > 30
      or jsonb_typeof(item->'time') is distinct from 'string'
      or (item->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (item->>'id') = any(ids) or (item->>'time') = any(times)
    then return false; end if;
    ids := array_append(ids,item->>'id'); times := array_append(times,item->>'time');
  end loop;
  return true;
end $$;
revoke all on function public.happi_valid_schedule(jsonb) from public;
grant execute on function public.happi_valid_schedule(jsonb) to authenticated;

create table public.happi_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) >= 1 and length(display_name) <= 40),
  schedule jsonb not null check (public.happi_valid_schedule(schedule))
);

create table public.happi_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  mood text not null check (mood in ('low','down','okay','good','great')),
  reasons text[] not null default '{}' check (
    cardinality(reasons) <= 6 and coalesce(array_ndims(reasons),1)=1 and array_position(reasons,null) is null
    and reasons <@ array['Me time','Work','Sleep','Friends','Family','Health']::text[]
  ),
  note text not null default '' check (length(note) <= 500),
  occurred_at timestamptz not null check (isfinite(occurred_at)),
  slot_id text check (length(slot_id) between 1 and 100),
  deleted_at timestamptz,
  primary key(user_id,id)
);
create index happi_entries_history on public.happi_entries(user_id,occurred_at,id) where deleted_at is null;

alter table public.happi_profiles enable row level security;
alter table public.happi_entries enable row level security;
revoke all on public.happi_profiles, public.happi_entries from public, anon, authenticated;
grant select,insert,update on public.happi_profiles, public.happi_entries to authenticated;

create policy profiles_read_own on public.happi_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy profiles_insert_own on public.happi_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy profiles_update_own on public.happi_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy entries_read_own on public.happi_entries for select to authenticated using ((select auth.uid())=user_id);
create policy entries_insert_own on public.happi_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy entries_update_own on public.happi_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

commit;
