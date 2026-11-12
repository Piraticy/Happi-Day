import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CloudAccount from './CloudAccount'
import CheckIn from './CheckIn'
import { freshJournal, STORAGE_KEY } from './model'

const clients: SupabaseClient[] = []
beforeEach(() => localStorage.clear())
afterEach(() => { clients.splice(0).forEach(client => client.auth.stopAutoRefresh()); vi.restoreAllMocks(); vi.useRealTimers() })

function backend() {
  const entries = new Map<string, Record<string, unknown>[]>()
  const requests: { path: string; body: Record<string, unknown> }[] = []
  let failReads = false
  let failWrites = false
  let failSignup = false
  let failRecovery = false
  let sequence = 0
  let deviceSetup = true
  let memberInvites = true
  let dropRedeemResponse = false
  const memberships = new Map<string, string | null>()
  const codes = new Map<string, string>()
  const profiles = new Map<string, Record<string, unknown>>()
  const deviceLabels = new Map<string, string>()
  const users = new Map<string, Record<string, unknown>>()
  function token(id: string) { return `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.test` }
  const gates = new Map<string, Promise<void>>()
  function makeClient(persistSession = true) {
  const client = createClient('https://cloud-test.example', 'sb_publishable_test', {
    auth: { persistSession, autoRefreshToken: false, detectSessionInUrl: false, storageKey: crypto.randomUUID() },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const headers = new Headers(init?.headers)
      let owner = ''
      try { owner = JSON.parse(atob((headers.get('authorization') ?? '').split('.')[1])).sub } catch { /* Public auth requests have no user token. */ }
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      requests.push({ path: url.pathname, body })
      const effective = memberships.has(owner) ? memberships.get(owner) : owner
      if (url.pathname.endsWith('/rpc/happi_journal_owner')) return deviceSetup ? Response.json(effective) : Response.json({ code: 'PGRST202', message: 'Missing migration' }, { status: 404 })
      if (url.pathname.endsWith('/rpc/happi_create_device_code')) {
        if (!memberInvites && memberships.has(owner)) return Response.json({ message: 'Create the connection code on the original device.' }, { status: 400 })
        if (!effective) return Response.json({ message: 'This device was disconnected.' }, { status: 400 })
        const code = 'ABCD1234ABCD1234ABCD'
        codes.set(code, effective)
        if (!profiles.has(effective)) profiles.set(effective, { display_name: body.p_display_name, schedule: body.p_schedule })
        return Response.json({ code, expires_at: new Date(Date.now() + 600_000).toISOString() })
      }
      if (url.pathname.endsWith('/rpc/happi_redeem_device_code')) {
        const original = codes.get(String(body.p_code))
        if (!original) return Response.json({ ok: false, message: 'That code is invalid, expired or already used.' })
        memberships.set(owner, original); deviceLabels.set(owner, String(body.p_device_label)); codes.delete(String(body.p_code))
        if (dropRedeemResponse) { dropRedeemResponse = false; throw new Error('Response lost after commit') }
        return Response.json({ ok: true, owner_id: original })
      }
      if (url.pathname.endsWith('/rpc/happi_list_devices')) return Response.json([...memberships].filter(([, original]) => original === owner).map(([id]) => ({ device_id: id, device_label: deviceLabels.get(id), connected_at: new Date().toISOString() })))
      if (url.pathname.endsWith('/rpc/happi_revoke_device')) {
        const id = String(body.p_device_id)
        if (memberships.get(id) !== owner) return Response.json(false)
        memberships.set(id, null); for (const [code, journal] of codes) if (journal === owner) codes.delete(code); return Response.json(true)
      }
      if (url.pathname.endsWith('/signup')) {
        if (failSignup) return Response.json({ message: 'Signup unavailable' }, { status: 400 })
        const id = `anonymous-${++sequence}`
        const user = { id, email: '', is_anonymous: true, user_metadata: body.data, app_metadata: {}, aud: 'authenticated', created_at: '2026-11-10T00:00:00Z' }
        users.set(id, user)
        return Response.json({ access_token: token(id), token_type: 'bearer', expires_in: 3600, refresh_token: `refresh-${id}`, user })
      }
      if (url.pathname.endsWith('/user') && init?.method === 'PUT' && failRecovery) return Response.json({ message: 'Recovery unavailable' }, { status: 400 })
      if (url.pathname.endsWith('/user')) return Response.json(users.get(owner) ?? { id: owner, email: `${owner}@example.com`, user_metadata: { first_name: owner }, app_metadata: {}, aud: 'authenticated', created_at: '2026-11-10T00:00:00Z' })
      if (url.pathname.endsWith('/otp') || url.pathname.endsWith('/logout')) return Response.json({})
      if (failReads && (!init?.method || init.method === 'GET')) return Response.json({ message: 'Unavailable' }, { status: 400 })
      const target = (url.searchParams.get('user_id') ?? '').replace(/^eq\./, '') || owner
      if (url.pathname.endsWith('/happi_profiles')) return Response.json(effective === target && profiles.has(target) ? [profiles.get(target)] : [])
      if (url.pathname.endsWith('/happi_entries')) {
        if (!init?.method || init.method === 'GET') { await gates.get(owner); return Response.json(effective === target ? (entries.get(target) ?? []).filter(entry => !entry.deleted_at) : []) }
        if (failWrites) return Response.json({ message: 'Unavailable' }, { status: 400 })
        if (!effective) return Response.json({ message: 'Access removed' }, { status: 403 })
        const current = entries.get(effective) ?? []
        for (const row of (Array.isArray(body) ? body : [body])) {
          const index = current.findIndex(entry => entry.id === row.id)
          if (index < 0) current.push(row); else current[index] = row
        }
        entries.set(effective, current)
        return new Response(null, { status: 201 })
      }
      return Response.json({ message: 'Unexpected test request' }, { status: 500 })
    } },
  })
  clients.push(client)
  return client
  }
  const client = makeClient()
  async function login(id: string) {
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.test`
    await act(async () => { const result = await client.auth.setSession({ access_token: token, refresh_token: `refresh-${id}` }); expect(result.error).toBeNull() })
  }
  function holdReads(id: string) { let release!: () => void; gates.set(id, new Promise<void>(resolve => { release = resolve })); return release }
  return { client, entries, requests, login, holdReads, makeClient, memberships, codes, profiles, deviceLabels, memberInvites: (enabled: boolean) => { memberInvites = enabled }, dropRedeemResponse: () => { dropRedeemResponse = true }, deviceSetup: (enabled: boolean) => { deviceSetup = enabled }, failReads: () => { failReads = true }, failWrites: (fail: boolean) => { failWrites = fail }, failSignup: (fail: boolean) => { failSignup = fail }, failRecovery: (fail: boolean) => { failRecovery = fail } }
}

describe('real SDK integration at the network boundary', () => {
  it('automatically retrieves other-device changes without losing an unfinished check-in', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    fireEvent.click(await screen.findByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Still writing here' } })
    server.entries.set('alex', [{ id: 'from-phone', mood: 'okay', reasons: [], note: 'Saved on my phone', occurred_at: new Date().toISOString(), slot_id: null, deleted_at: null }])
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(screen.getByLabelText('Your own reason')).toHaveValue('Still writing here')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('radio', { name: 'Good' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /Today’s moments/ }))
    expect(screen.getByText('Saved on my phone')).toBeVisible()
    server.entries.set('alex', [])
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(screen.queryByText('Saved on my phone')).not.toBeInTheDocument()
  })

  it('pauses automatic reads while hidden or offline, resumes online, and avoids overlapping reads', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const server = backend()
    const app = render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    await screen.findByRole('radio', { name: 'Good' })
    const reads = () => server.requests.filter(request => request.path.endsWith('/happi_entries')).length
    const initialReads = reads()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(reads()).toBe(initialReads)
    visibility.mockReturnValue('visible')
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(reads()).toBe(initialReads)
    const release = server.holdReads('alex')
    online.mockReturnValue(true)
    await act(async () => { fireEvent(window, new Event('online')) })
    await waitFor(() => expect(reads()).toBe(initialReads + 1))
    fireEvent(window, new Event('focus'))
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(reads()).toBe(initialReads + 1)
    await act(async () => { release() })
    app.unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(reads()).toBe(initialReads + 1)
  })

  it('creates a private username session, saves a mood and reopens without another signup', async () => {
    const server = backend()
    const app = render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: ' Alex ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    expect(screen.getByRole('button', { name: 'Journal options' })).toHaveTextContent('Alex')
    expect(server.requests.find(request => request.path.endsWith('/signup'))?.body.data).toEqual({ first_name: 'Alex' })
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get('anonymous-1')).toHaveLength(1))
    app.unmount()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await screen.findByRole('radio', { name: 'Good' })
    fireEvent.click(screen.getByText('Today’s moments'))
    expect(screen.getByRole('article')).toBeVisible()
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1)
  })

  it('does not create a username session when browser storage is blocked', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/allow this site to save data/i)
    expect(server.requests.some(request => request.path.endsWith('/signup'))).toBe(false)
  })

  it('keeps the username on failed signup and allows retry', async () => {
    const server = backend(); server.failSignup(true)
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t start/i)
    expect(screen.getByLabelText('Username')).toHaveValue('Alex')
    server.failSignup(false)
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
  })

  it('protects anonymous sign-out and does not recover a journal by a duplicate username', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get('anonymous-1')).toHaveLength(1))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('button', { name: 'Save check-in' })).toBeInTheDocument()
    expect(server.requests.some(request => request.path.endsWith('/logout'))).toBe(false)
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(2)
    expect(server.entries.get('anonymous-1')).toHaveLength(1)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('links a recovery email to the same session without claiming it is verified', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Keep this journal accessible'))
    fireEvent.change(screen.getByLabelText('Recovery email'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/confirm/i)
    const request = server.requests.find(request => request.path.endsWith('/user') && request.body.email)
    expect(request?.body.email).toBe('alex@example.com')
    expect(screen.getByRole('button', { name: 'Save check-in' })).toBeInTheDocument()
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1)
  })

  it('does not create duplicate identities when the username form is submitted twice', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    const input = await screen.findByLabelText('Username')
    fireEvent.change(input, { target: { value: 'Alex' } })
    fireEvent.submit(input.closest('form')!)
    fireEvent.submit(input.closest('form')!)
    await screen.findByRole('radio', { name: 'Good' })
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1)
  })

  it('keeps the same journal usable when recovery email delivery fails', async () => {
    const server = backend(); server.failRecovery(true)
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Keep this journal accessible'))
    fireEvent.change(screen.getByLabelText('Recovery email'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t send/i)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Recovery email')).toHaveValue('alex@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Close your journal' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get('anonymous-1')).toHaveLength(1))
  })

  it('only says an email was sent after the provider accepts the magic-link request', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Use an email link instead' }))
    await screen.findByLabelText('Email address')
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send sign-in link' }))
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
    expect(server.requests.find(request => request.path.endsWith('/otp'))?.body.email).toBe('alex@example.com')
    expect(screen.queryByRole('button', { name: 'Save check-in' })).not.toBeInTheDocument()
  })

  it('saves cloud moods without writing or automatically importing the shared demo journal', async () => {
    const local = freshJournal()
    local.entries = [{ id: 'demo-only', mood: 'low', reasons: [], note: 'Local private words', timestamp: '2026-11-09T09:00:00.000Z' }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    await screen.findByRole('radio', { name: 'Good' })
    expect(screen.queryByText('Local private words')).not.toBeInTheDocument()
    expect(server.entries.size).toBe(0)
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Cloud moment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get('alex')?.[0].note).toBe('Cloud moment'))
    fireEvent.click(screen.getByText('Today’s moments'))
    expect(await screen.findByText('Cloud moment')).toBeVisible()
    expect(server.entries.get('alex')?.[0].note).toBe('Cloud moment')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(local))
    await server.login('sam')
    await screen.findByText('sam', { exact: true })
    await waitFor(() => expect(screen.queryByText('Cloud moment')).not.toBeInTheDocument())
  })

  it('blocks the journal when the first cloud load fails', async () => {
    const server = backend(); server.failReads()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load/i)
    expect(screen.queryByRole('button', { name: 'Save check-in' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument()
  })

  it('imports only after an explicit choice and clears private history on sign-out', async () => {
    const local = freshJournal()
    local.entries = [{ id: 'local-id', mood: 'good', reasons: [], note: 'My local moment', timestamp: '2026-11-09T09:00:00.000Z' }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    await screen.findByRole('button', { name: 'Journal options' })
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    await screen.findByRole('button', { name: 'Add demo entries' })
    expect(server.entries.size).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Add demo entries' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add demo entries' })).not.toBeInTheDocument())
    expect(server.entries.get('alex')?.[0].note).toBe('My local moment')
    fireEvent.click(screen.getByRole('button', { name: 'Close your journal' }))
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('My local moment')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByLabelText('Username')
    expect(screen.queryByText('My local moment')).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(local))
  })

  it('ignores an old user’s slow response after switching accounts', async () => {
    const server = backend()
    server.entries.set('alex', [{ id: 'private', mood: 'good', reasons: [], note: 'Alex private words', occurred_at: '2026-11-10T09:00:00Z', slot_id: 'morning' }])
    const release = server.holdReads('alex')
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    await waitFor(() => expect(server.requests.some(request => request.path.endsWith('/happi_entries'))).toBe(true))
    await server.login('sam')
    await screen.findByRole('radio', { name: 'Good' })
    await act(async () => { release(); await Promise.resolve() })
    expect(screen.getByText('sam', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Alex private words')).not.toBeInTheDocument()
  })

  it('keeps an async save draft and reuses its ID on retry', async () => {
    const savedIds: string[] = []
    let complete!: (value: boolean) => void
    const onSave = (entry: { id: string }) => { savedIds.push(entry.id); return new Promise<boolean>(resolve => { complete = resolve }) }
    const view = render(<CheckIn slots={freshJournal().schedule} entries={[]} onSave={onSave} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Keep this draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    await act(async () => complete(false))
    fireEvent.click(screen.getByRole('button', { name: /Edit your reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('Keep this draft')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    view.rerender(<CheckIn slots={freshJournal().schedule} entries={[{ id: savedIds[0], mood: 'okay', reasons: [], note: 'Keep this draft', timestamp: '2026-11-10T09:00:00.000Z', slotId: 'morning' }]} onSave={onSave} />)
    expect(screen.getByLabelText('Checking in for')).toHaveValue('morning')
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(savedIds[0]).toBe(savedIds[1])
    await act(async () => complete(true))
    expect(screen.queryByLabelText('Your own reason')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('')
  })

  it('allows manual refresh again when a save fails during a pending refresh', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('alex')
    await screen.findByRole('radio', { name: 'Good' })
    const release = server.holdReads('alex')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }))
    await screen.findByRole('button', { name: 'Refreshing…' })
    server.failWrites(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Refresh history' })).toBeEnabled()
    await act(async () => { release(); await Promise.resolve() })
  })
})

describe('phone-to-PC connection', () => {
  const phoneId = '11111111-1111-4111-8111-111111111111'
  it('opens the existing phone rows on a separately authenticated PC and saves back to that journal', async () => {
    const server = backend()
    server.profiles.set(phoneId, { display_name: 'Phone journal', schedule: freshJournal().schedule })
    server.entries.set(phoneId, [{ user_id: phoneId, id: 'phone-one', mood: 'good', reasons: [], note: 'Already saved on phone', occurred_at: '2026-11-11T09:00:00.000Z', slot_id: null, deleted_at: null }])
    await server.login(phoneId)
    const pcClient = server.makeClient()
    const screens = render(<><section aria-label="Phone"><CloudAccount client={server.client} onDemo={() => {}} /></section><section aria-label="PC"><CloudAccount client={pcClient} createDeviceClient={() => server.makeClient(false)} onDemo={() => {}} /></section></>)
    const phone = within(screen.getByRole('region', { name: 'Phone' }))
    const pc = within(screen.getByRole('region', { name: 'PC' }))
    fireEvent.click(await phone.findByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Connect another device'))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate connection code' }))
    const code = await screen.findByLabelText('One-use connection code')
    fireEvent.click(await pc.findByRole('button', { name: /Connect existing journal/ }))
    fireEvent.change(pc.getByLabelText('Connection code'), { target: { value: (code as HTMLInputElement).value } })
    fireEvent.click(pc.getByRole('button', { name: 'Connect my journal' }))
    await pc.findByRole('radio', { name: 'Good' })
    expect(within(pc.getByRole('main')).getByText('Connected: Phone journal', { exact: false })).toBeVisible()
    const pcUser = (await pcClient.auth.getSession()).data.session!.user.id
    expect(pcUser).not.toBe(phoneId)
    expect(server.memberships.get(pcUser)).toBe(phoneId)
    fireEvent.click(pc.getByRole('button', { name: 'History' }))
    expect(pc.getByText('Already saved on phone')).toBeVisible()
    fireEvent.click(pc.getByRole('button', { name: 'Today' }))
    fireEvent.click(pc.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(pc.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get(phoneId)).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: 'Close your journal' }))
    fireEvent.click(phone.getByRole('button', { name: 'Refresh history' }))
    fireEvent.click(phone.getByRole('button', { name: 'History' }))
    await waitFor(() => expect(phone.getAllByRole('article')).toHaveLength(2))
    expect(server.entries.has(pcUser)).toBe(false)
    expect(server.requests.some(request => request.path.endsWith('/otp'))).toBe(false)
    screens.unmount()
  })

  it('clears the displayed invitation when removing a device invalidates it', async () => {
    const server = backend()
    server.memberships.set('linked', phoneId)
    server.deviceLabels.set('linked', 'My tablet')
    await server.login(phoneId)
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Connect another device'))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate connection code' }))
    await screen.findByLabelText('One-use connection code')
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh devices' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove My tablet' }))
    await waitFor(() => expect(screen.queryByLabelText('One-use connection code')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Generate connection code' })).toBeEnabled()
  })

  it('explains the one-time setup when a recovered device still uses the old database function', async () => {
    const server = backend()
    server.memberInvites(false)
    server.memberships.set('recovered', phoneId)
    await server.login('recovered')
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Connect another device'))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate connection code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/one-time setup update/)
    expect(screen.queryByLabelText('One-use connection code')).not.toBeInTheDocument()
  })

  it('generates an invitation from a recovered dashboard and opens the same journal on a third device', async () => {
    const server = backend()
    server.memberships.set('recovered', phoneId)
    server.profiles.set(phoneId, { display_name: 'Recovered journal', schedule: freshJournal().schedule })
    server.entries.set(phoneId, [{ id: 'original-entry', mood: 'good', reasons: [], note: 'Original history', occurred_at: new Date().toISOString(), slot_id: null, deleted_at: null }])
    await server.login('recovered')
    const recovered = render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Connect another device'))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate connection code' }))
    const code = (await screen.findByLabelText('One-use connection code') as HTMLInputElement).value
    expect(screen.queryByRole('button', { name: 'Refresh devices' })).not.toBeInTheDocument()
    recovered.unmount()
    const nextClient = server.makeClient()
    render(<CloudAccount client={nextClient} createDeviceClient={() => server.makeClient(false)} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: /Connect existing journal/ }))
    fireEvent.change(screen.getByLabelText('Connection code'), { target: { value: code } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText('Original history')).toBeVisible()
    expect(server.memberships.get((await nextClient.auth.getSession()).data.session!.user.id)).toBe(phoneId)
  })

  it('recovers when redemption commits but the response is lost', async () => {
    const server = backend()
    server.codes.set('ABCD1234ABCD1234ABCD', phoneId)
    server.profiles.set(phoneId, { display_name: 'Phone journal', schedule: freshJournal().schedule })
    server.dropRedeemResponse()
    render(<CloudAccount client={server.client} createDeviceClient={() => server.makeClient(false)} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: /Connect existing journal/ }))
    fireEvent.change(screen.getByLabelText('Connection code'), { target: { value: 'ABCD1234ABCD1234ABCD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    const id = (await server.client.auth.getSession()).data.session!.user.id
    expect(server.memberships.get(id)).toBe(phoneId)
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1)
  })

  it('keeps a failed code out of persisted PC auth and reuses its temporary session on retry', async () => {
    const server = backend()
    render(<CloudAccount client={server.client} createDeviceClient={() => server.makeClient(false)} onDemo={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: /Connect existing journal/ }))
    fireEvent.change(screen.getByLabelText('Connection code'), { target: { value: '0000-0000-0000-0000-0000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect my journal' }))
    await screen.findByRole('alert')
    expect((await server.client.auth.getSession()).data.session).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Connect my journal' }))
    await waitFor(() => expect(server.requests.filter(request => request.path.endsWith('/rpc/happi_redeem_device_code'))).toHaveLength(2))
    expect(server.requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1)
    expect(screen.getByLabelText('Connection code')).toHaveValue('0000-0000-0000-0000-0000')
  })

  it('keeps legacy phone history working before the migration is installed', async () => {
    const server = backend(); server.deviceSetup(false)
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('legacy')
    fireEvent.click(await screen.findByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() => expect(server.entries.get('legacy')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByText('Connect another device'))
    expect(screen.getByText(/Connecting devices isn’t available yet/)).toBeVisible()
  })

  it('clears private drafts when the effective journal changes on refresh', async () => {
    const server = backend()
    const other = '22222222-2222-4222-8222-222222222222'
    server.memberships.set('pc', phoneId)
    server.profiles.set(other, { display_name: 'Other journal', schedule: freshJournal().schedule })
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('pc')
    fireEvent.click(await screen.findByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'A draft for the earlier owner' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    server.memberships.set('pc', other)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Journal options' })).toHaveTextContent('Other journal'))
    expect(screen.getByRole('radio', { name: 'Good' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('')
  })

  it('retains a draft and reports removed access instead of saving to a blank journal', async () => {
    const server = backend()
    server.memberships.set('pc', phoneId)
    render(<CloudAccount client={server.client} onDemo={() => {}} />)
    await server.login('pc')
    fireEvent.click(await screen.findByRole('radio', { name: 'Okay' }))
    server.memberships.set('pc', null)
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/was disconnected/)
    expect(screen.getByRole('radio', { name: 'Okay' })).toBeChecked()
    expect(server.entries.size).toBe(0)
  })
})
