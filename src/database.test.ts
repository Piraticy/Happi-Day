// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
let db: PGlite
const schedule = JSON.stringify([{ id: 'morning', label: 'Morning', time: '09:00' }, { id: 'afternoon', label: 'Afternoon', time: '14:00' }, { id: 'evening', label: 'Evening', time: '20:00' }])

async function asUser(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('set role authenticated')
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'), ('${B}');`)
  const migration = await readFile(new URL('../supabase/migrations/202611100001_cloud_journal.sql', import.meta.url), 'utf8')
  await db.exec(migration)
}, 30_000)
afterAll(async () => { await db?.close() })

describe('actual PostgreSQL row-level policies', () => {
  it('lets each user create and read their own entries and profile', async () => {
    for (const id of [A, B]) {
      await asUser(id)
      await db.query('insert into public.happi_profiles(user_id,display_name,schedule) values($1,$2,$3::jsonb)', [id, id === A ? 'Alex' : 'Sam', schedule])
      await db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'same-id','good','2026-11-10T09:00:00Z')", [id])
    }
    await asUser(A)
    expect((await db.query<{ user_id: string }>('select user_id from public.happi_entries')).rows).toEqual([{ user_id: A }])
    expect((await db.query<{ display_name: string }>('select display_name from public.happi_profiles')).rows).toEqual([{ display_name: 'Alex' }])
  })

  it('blocks cross-account writes and ownership reassignment', async () => {
    await asUser(A)
    await expect(db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'intrusion','good',now())", [B])).rejects.toThrow(/row-level security/)
    await expect(db.query('update public.happi_entries set user_id=$1', [B])).rejects.toThrow(/row-level security/)
    expect((await db.query('update public.happi_entries set note=$1 where user_id=$2 returning id', ['intrusion', B])).rows).toEqual([])
    expect((await db.query('update public.happi_profiles set display_name=$1 where user_id=$2 returning user_id', ['intrusion', B])).rows).toEqual([])
  })

  it('rejects invalid mood, reason, notes and schedule at the database boundary', async () => {
    await asUser(A)
    for (const [column, value] of [['mood', 'invalid'], ['note', 'x'.repeat(501)]]) {
      await expect(db.query(`update public.happi_entries set ${column}=$1 where id='same-id'`, [value])).rejects.toThrow(/check constraint/)
    }
    await expect(db.query("update public.happi_entries set reasons=array['not a preset']")).rejects.toThrow(/check constraint/)
    await expect(db.query("update public.happi_profiles set schedule='[]'::jsonb")).rejects.toThrow(/check constraint/)
    const bad = JSON.parse(schedule); bad[1].time = '09:00'
    await expect(db.query('update public.happi_profiles set schedule=$1::jsonb', [JSON.stringify(bad)])).rejects.toThrow(/check constraint/)
  })

  it('preserves a deletion tombstone across repeated imports and allows explicit undo', async () => {
    await asUser(A)
    await db.exec("update public.happi_entries set deleted_at=now() where id='same-id'")
    await db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'same-id','good',now()) on conflict(user_id,id) do nothing", [A])
    expect((await db.query('select id from public.happi_entries where deleted_at is null')).rows).toEqual([])
    await db.exec("update public.happi_entries set deleted_at=null where id='same-id'")
    expect((await db.query('select id from public.happi_entries where deleted_at is null')).rows).toEqual([{ id: 'same-id' }])
  })

  it('denies unauthenticated access and physical deletion', async () => {
    await db.exec('reset role; set role anon')
    await expect(db.query('select * from public.happi_entries')).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from public.happi_profiles')).rejects.toThrow(/permission denied/)
    await asUser(A)
    await expect(db.query('delete from public.happi_entries')).rejects.toThrow(/permission denied/)
  })
})
