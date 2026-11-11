import { describe, expect, it, vi } from 'vitest'
import { freshJournal } from './model'
import { cloudChanges, cloudSetup, mergeCloudChanges, publicConfig } from './cloud'

describe('cloud data boundaries', () => {
  it('refuses an unpersisted client at blocked startup and can initialize after storage is allowed', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://storage-test.example')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    try {
      const setup = cloudSetup()
      expect(setup.client).toBeNull()
      expect(setup.error).toMatch(/browser storage.*reload/i)
      blocked.mockRestore()
      const restored = cloudSetup()
      expect(restored.error).toBe('')
      expect(restored.client).not.toBeNull()
      await restored.client?.auth.stopAutoRefresh()
    } finally { blocked.mockRestore(); vi.unstubAllEnvs() }
  })

  it('writes individual added/deleted entries rather than replacing another device’s history', () => {
    const before = freshJournal()
    before.entries = [{ id: 'one', mood: 'good', reasons: [], note: '', timestamp: '2026-11-10T09:00:00.000Z' }]
    const after = { ...before, entries: [{ ...before.entries[0], id: 'two' }] }
    const changes = cloudChanges(before, after)
    expect(changes.added.map(entry => entry.id)).toEqual(['two'])
    expect(changes.removed).toEqual(['one'])
    expect(changes.profile).toBeNull()
    const otherDevice = { ...before, entries: [...before.entries, { ...before.entries[0], id: 'three' }] }
    expect(mergeCloudChanges(otherDevice, changes).entries.map(entry => entry.id)).toEqual(['three', 'two'])
  })

  it('does not change profile settings when saving just a mood', () => {
    const before = freshJournal()
    const after = { ...before, name: 'Alex', schedule: before.schedule.map(slot => slot.id === 'morning' ? { ...slot, time: '08:30' } : slot) }
    expect(cloudChanges(before, after).profile).toEqual({ name: 'Alex', schedule: after.schedule })
  })

  it('accepts only public browser configuration and reports incomplete setup', () => {
    expect(publicConfig('', '')).toBeNull()
    expect(publicConfig('https://example.supabase.co', 'sb_publishable_example')).toEqual({ url: 'https://example.supabase.co', key: 'sb_publishable_example' })
    expect(() => publicConfig('https://example.supabase.co', 'sb_secret_do_not_expose')).toThrow(/publishable/i)
    expect(() => publicConfig('http://insecure.example', 'sb_publishable_example')).toThrow(/https/i)
    expect(() => publicConfig('https://example.supabase.co', '')).toThrow(/both/i)
  })
})

it('creates temporary connection sessions without persisting them as the main browser journal', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://device-storage-test.example')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  const id = '11111111-1111-4111-8111-111111111111'
  const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`
  vi.stubGlobal('fetch', async () => Response.json({ access_token: token, refresh_token: 'temporary-test-token', expires_in: 3600, token_type: 'bearer', user: { id, is_anonymous: true, aud: 'authenticated', user_metadata: {} } }))
  localStorage.clear()
  const setup = cloudSetup()
  const temporary = setup.createDeviceClient!()
  try {
    const result = await temporary.auth.signInAnonymously()
    expect(result.error).toBeNull()
    expect((await temporary.auth.getSession()).data.session?.user.id).toBe(id)
    expect((await setup.client!.auth.getSession()).data.session).toBeNull()
    expect(localStorage.length).toBe(0)
  } finally { await temporary.auth.stopAutoRefresh(); await setup.client?.auth.stopAutoRefresh(); vi.unstubAllGlobals(); vi.unstubAllEnvs() }
})
