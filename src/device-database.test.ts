// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'

const ids = Array.from({ length: 8 }, (_, index) => `${index + 1}`.repeat(8) + '-1111-4111-8111-' + `${index + 1}`.repeat(12))
const [phone, pc, stranger, expiredDevice, limited, occupied, otherPc] = ids
const schedule = [{ id: 'morning', label: 'Morning', time: '09:00' }, { id: 'afternoon', label: 'Afternoon', time: '14:00' }, { id: 'evening', label: 'Evening', time: '20:00' }]
let db: PGlite
let consumedCode: string
async function asUser(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
  await db.exec('set role authenticated')
}
async function issue() {
  await asUser(phone)
  const result = await db.query<{ result: { code: string; expires_at: string } }>('select public.happi_create_device_code($1,$2::jsonb) as result', ['Phone journal', JSON.stringify(schedule)])
  return result.rows[0].result.code
}
async function redeem(code: string, id: string) {
  await asUser(id)
  return (await db.query<{ result: { ok: boolean; message?: string } }>('select public.happi_redeem_device_code($1,$2) as result', [code, 'My PC'])).rows[0].result
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
  for (const id of ids) await db.query('insert into auth.users values($1)', [id])
  for (const name of ['202611100001_cloud_journal.sql','202611120001_device_connections.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'))
  await asUser(phone)
  await db.query("insert into public.happi_entries(user_id,id,mood,note,occurred_at) values($1,'phone-entry','good','Already on phone',now())", [phone])
}, 30_000)
afterAll(async () => { await db?.close() })

it('links a fresh independently authenticated device to the original rows', async () => {
  await asUser(pc)
  expect((await db.query('select * from public.happi_entries')).rows).toEqual([])
  consumedCode = await issue()
  expect(consumedCode).toMatch(/^[A-F0-9]{20}$/)
  expect(await redeem(consumedCode.toLowerCase().match(/.{4}/g)!.join('-'), pc)).toMatchObject({ ok: true })
  expect((await db.query<{ owner: string }>('select public.happi_journal_owner() as owner')).rows[0].owner).toBe(phone)
  expect((await db.query<{ note: string }>('select note from public.happi_entries')).rows).toEqual([{ note: 'Already on phone' }])
  expect((await db.query<{ display_name: string }>('select display_name from public.happi_profiles')).rows[0].display_name).toBe('Phone journal')
})

it('allows writes from both devices and keeps strangers out', async () => {
  await asUser(pc)
  await db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'pc-entry','okay',now())", [phone])
  await asUser(phone)
  expect((await db.query('select id from public.happi_entries')).rows).toHaveLength(2)
  await asUser(stranger)
  expect((await db.query('select * from public.happi_entries')).rows).toEqual([])
  await expect(db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'bad','good',now())", [phone])).rejects.toThrow(/row-level security/)
})

it('consumes codes atomically and does not let a member issue further access', async () => {
  expect(await redeem(consumedCode, stranger)).toMatchObject({ ok: false })
  await asUser(pc)
  await expect(db.query('select public.happi_create_device_code($1,$2::jsonb)', ['PC', JSON.stringify(schedule)])).rejects.toThrow(/original device/)
  expect((await db.query('select * from public.happi_list_devices()')).rows).toEqual([])
  await expect(db.query('select * from public.happi_device_codes')).rejects.toThrow(/permission denied/)
})

it('cannot reassign entry ownership or physically delete history', async () => {
  await asUser(pc)
  await expect(db.query('update public.happi_entries set user_id=$1', [pc])).rejects.toThrow(/row-level security/)
  await expect(db.query('delete from public.happi_entries')).rejects.toThrow(/permission denied/)
})

it('invalidates replaced and expired codes', async () => {
  const replaced = await issue(), fresh = await issue()
  expect(await redeem(replaced, expiredDevice)).toMatchObject({ ok: false })
  await db.exec('reset role')
  await db.exec("update public.happi_device_codes set expires_at=now()-interval '1 minute'")
  expect(await redeem(fresh, expiredDevice)).toMatchObject({ ok: false })
})

it('persists failed-attempt limits and permits retry after the window expires', async () => {
  const valid = await issue()
  for (let attempt = 0; attempt < 5; attempt++) expect(await redeem('00000000000000000000', limited)).toMatchObject({ ok: false })
  expect(await redeem(valid, limited)).toMatchObject({ ok: false, message: expect.stringMatching(/15 minutes/) })
  await db.exec('reset role')
  await db.query("update public.happi_device_attempts set window_started=now()-interval '16 minutes' where device_id=$1", [limited])
  expect(await redeem(valid, limited)).toMatchObject({ ok: true })
})

it('refuses to overwrite or hide a device’s existing journal and leaves the code usable', async () => {
  await asUser(occupied)
  await db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'existing','good',now())", [occupied])
  const code = await issue()
  expect(await redeem(code, occupied)).toMatchObject({ ok: false, message: expect.stringMatching(/already has its own journal/) })
  expect((await db.query('select id from public.happi_entries')).rows).toEqual([{ id: 'existing' }])
  expect(await redeem(code, otherPc)).toMatchObject({ ok: true })
})

it('revokes access without touching the original phone journal', async () => {
  await asUser(stranger)
  expect((await db.query<{ ok: boolean }>('select public.happi_revoke_device($1) as ok', [pc])).rows[0].ok).toBe(false)
  await asUser(phone)
  expect((await db.query('select * from public.happi_list_devices()')).rows).toHaveLength(3)
  expect((await db.query<{ ok: boolean }>('select public.happi_revoke_device($1) as ok', [pc])).rows[0].ok).toBe(true)
  await asUser(pc)
  expect((await db.query<{ owner: null }>('select public.happi_journal_owner() as owner')).rows[0].owner).toBeNull()
  expect((await db.query('select * from public.happi_entries')).rows).toEqual([])
  await expect(db.query("insert into public.happi_entries(user_id,id,mood,occurred_at) values($1,'new','good',now())", [pc])).rejects.toThrow(/row-level security/)
  await asUser(phone)
  expect((await db.query('select id from public.happi_entries')).rows).toHaveLength(2)
})

it('denies every device RPC and private table to unauthenticated callers', async () => {
  await db.exec('reset role; set role anon')
  await expect(db.query('select public.happi_journal_owner()')).rejects.toThrow(/permission denied/)
  await expect(db.query("select public.happi_redeem_device_code('00000000000000000000','PC')")).rejects.toThrow(/permission denied/)
  await expect(db.query('select * from public.happi_devices')).rejects.toThrow(/permission denied/)
})
