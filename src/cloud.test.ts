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
