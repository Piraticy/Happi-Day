import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { freshJournal, isJournal } from './model'
import type { Entry, Journal } from './model'

export function publicConfig(url: string, key: string) {
  if (!url && !key) return null
  if (!url || !key) throw new Error('Set both the Supabase URL and publishable key to enable cloud sign-in.')
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('Use HTTPS for your cloud project URL.')
  let anon = false
  try { anon = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' } catch { /* New publishable keys are not JWTs. */ }
  if (!key.startsWith('sb_publishable_') && !anon) throw new Error('Use a public publishable key, never a secret or service-role key.')
  return { url: url.replace(/\/$/, ''), key }
}

export function cloudSetup(): { client: SupabaseClient | null; error: string; createDeviceClient?: () => SupabaseClient } {
  try {
    const config = publicConfig(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')
    if (!config) return { client: null, error: '' }
    let storage: Storage
    try {
      storage = window.localStorage
      const key = `happi-day:storage-check:${crypto.randomUUID()}`
      storage.setItem(key, '1'); storage.removeItem(key)
    } catch { throw new Error('Allow browser storage, then reload to keep your private session available.') }
    return { client: createClient(config.url, config.key, { auth: { storage, flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }), error: '', createDeviceClient: () => createClient(config.url, config.key, { auth: { storageKey: `happi-device:${crypto.randomUUID()}`, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) }
  } catch (error) { return { client: null, error: (error as Error).message } }
}

export type Changes = { added: Entry[]; removed: string[]; profile: Pick<Journal, 'name' | 'schedule'> | null }
export function cloudChanges(before: Journal, after: Journal): Changes {
  const oldIds = new Set(before.entries.map(entry => entry.id))
  const newIds = new Set(after.entries.map(entry => entry.id))
  return {
    added: after.entries.filter(entry => !oldIds.has(entry.id)),
    removed: before.entries.filter(entry => !newIds.has(entry.id)).map(entry => entry.id),
    profile: before.name !== after.name || JSON.stringify(before.schedule) !== JSON.stringify(after.schedule) ? { name: after.name, schedule: after.schedule } : null,
  }
}

export function mergeCloudChanges(current: Journal, changes: Changes): Journal {
  const replaced = new Set([...changes.removed, ...changes.added.map(entry => entry.id)])
  return { ...current, ...changes.profile, entries: [...current.entries.filter(entry => !replaced.has(entry.id)), ...changes.added] }
}

function row(entry: Entry, userId: string) {
  return { user_id: userId, id: entry.id, mood: entry.mood, reasons: entry.reasons, note: entry.note, occurred_at: entry.timestamp, slot_id: entry.slotId ?? null, deleted_at: null }
}

export async function journalOwner(client: SupabaseClient, self: string): Promise<{ ownerId: string; connections: boolean }> {
  const { data, error } = await client.rpc('happi_journal_owner')
  // shortcut: keep existing journals available until the device-connection migration is applied.
  if (error?.code === 'PGRST202' || error?.code === '42883') return { ownerId: self, connections: false }
  if (error) throw new Error('Your journal connection couldn’t be checked. Try again in a moment.')
  if (data === null) throw new Error('This device’s connection was removed. Your original journal is safe on the phone. Connect this device again using a new phone code.')
  if (typeof data !== 'string' || !data) throw new Error('Your journal connection needs attention. No data has been changed.')
  return { ownerId: data, connections: true }
}

export function cloudRepository(client: SupabaseClient, user: Pick<User, 'id' | 'email' | 'user_metadata'>) {
  return {
    async load(): Promise<{ journal: Journal; ownerId: string; connections: boolean }> {
      const identity = await journalOwner(client, user.id)
      const target = identity.ownerId
      const { data: profile, error } = await client.from('happi_profiles').select('display_name,schedule').eq('user_id', target).maybeSingle()
      if (error) throw new Error('Your cloud history couldn’t load. Check your connection and try again.')
      const entries: Entry[] = []
      for (let offset = 0; ; offset += 500) {
        const page = await client.from('happi_entries').select('id,mood,reasons,note,occurred_at,slot_id').eq('user_id', target).is('deleted_at', null).order('occurred_at').order('id').range(offset, offset + 499)
        if (page.error) throw new Error('Your cloud history couldn’t load. Check your connection and try again.')
        for (const item of page.data) entries.push({ id: item.id, mood: item.mood, reasons: item.reasons, note: item.note, timestamp: new Date(item.occurred_at).toISOString(), ...(item.slot_id ? { slotId: item.slot_id } : {}) })
        if (page.data.length < 500) break
      }
      const journal = { ...freshJournal(), name: profile?.display_name ?? String(user.user_metadata.first_name || user.email?.split('@')[0] || 'You').slice(0, 40), ...(profile ? { schedule: profile.schedule } : {}), entries }
      if (!isJournal(journal)) throw new Error('Your cloud journal needs attention. No data has been changed.')
      return { journal, ...identity }
    },
    async apply(changes: Changes, expectedOwner: string) {
      const { ownerId: target } = await journalOwner(client, user.id)
      if (target !== expectedOwner) throw new Error('Your connected journal changed. Refresh history before saving; your draft is still here.')
      if (changes.added.length) {
        const { error } = await client.from('happi_entries').upsert(changes.added.map(entry => row(entry, target)), { onConflict: 'user_id,id' })
        if (error) throw new Error('Your check-in couldn’t save to the cloud. Your words are still here; try again.')
      }
      if (changes.removed.length) {
        const { data, error } = await client.from('happi_entries').update({ deleted_at: new Date().toISOString() }).eq('user_id', target).in('id', changes.removed).select('id')
        if (error || data.length !== changes.removed.length) throw new Error('The check-in couldn’t be deleted. Refresh your history and try again.')
      }
      if (changes.profile) {
        const { error } = await client.from('happi_profiles').upsert({ user_id: target, display_name: changes.profile.name, schedule: changes.profile.schedule })
        if (error) throw new Error('Your rhythm couldn’t save to the cloud. Keep your changes here and try again.')
      }
    },
    async importEntries(entries: Entry[], expectedOwner: string) {
      const { ownerId: target } = await journalOwner(client, user.id)
      if (target !== expectedOwner) throw new Error('Your connected journal changed. Refresh history before importing.')
      for (let offset = 0; offset < entries.length; offset += 100) {
        const { error } = await client.from('happi_entries').upsert(entries.slice(offset, offset + 100).map(entry => row(entry, target)), { onConflict: 'user_id,id', ignoreDuplicates: true })
        if (error) throw new Error('Import didn’t finish. Your local original is safe. Retry to import the remaining entries without duplicates.')
      }
    },
  }
}
