import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CloudAccount from './CloudAccount'
import CheckIn from './CheckIn'
import { freshJournal, STORAGE_KEY } from './model'

const clients: SupabaseClient[] = []
beforeEach(() => localStorage.clear())
afterEach(() => { clients.splice(0).forEach(client => client.auth.stopAutoRefresh()); vi.restoreAllMocks() })

function backend() {
  const entries = new Map<string, Record<string, unknown>[]>()
  const requests: { path: string; body: Record<string, unknown> }[] = []
  let failReads = false
  let failWrites = false
  let failSignup = false
  let failRecovery = false
  let sequence = 0
  const users = new Map<string, Record<string, unknown>>()
  function token(id: string) { return `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.test` }
  const gates = new Map<string, Promise<void>>()
  const client = createClient('https://cloud-test.example', 'sb_publishable_test', {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, storageKey: crypto.randomUUID() },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const headers = new Headers(init?.headers)
      let owner = ''
      try { owner = JSON.parse(atob((headers.get('authorization') ?? '').split('.')[1])).sub } catch { /* Public auth requests have no user token. */ }
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      requests.push({ path: url.pathname, body })
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
      if (url.pathname.endsWith('/happi_profiles')) return Response.json([])
      if (url.pathname.endsWith('/happi_entries')) {
        if (!init?.method || init.method === 'GET') { await gates.get(owner); return Response.json(entries.get(owner) ?? []) }
        if (failWrites) return Response.json({ message: 'Unavailable' }, { status: 400 })
        const current = entries.get(owner) ?? []
        for (const row of (Array.isArray(body) ? body : [body])) {
          const index = current.findIndex(entry => entry.id === row.id)
          if (index < 0) current.push(row); else current[index] = row
        }
        entries.set(owner, current)
        return new Response(null, { status: 201 })
      }
      return Response.json({ message: 'Unexpected test request' }, { status: 500 })
    } },
  })
  clients.push(client)
  async function login(id: string) {
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.test`
    await act(async () => { const result = await client.auth.setSession({ access_token: token, refresh_token: `refresh-${id}` }); expect(result.error).toBeNull() })
  }
  function holdReads(id: string) { let release!: () => void; gates.set(id, new Promise<void>(resolve => { release = resolve })); return release }
  return { client, entries, requests, login, holdReads, failReads: () => { failReads = true }, failWrites: (fail: boolean) => { failWrites = fail }, failSignup: (fail: boolean) => { failSignup = fail }, failRecovery: (fail: boolean) => { failRecovery = fail } }
}

describe('real SDK integration at the network boundary', () => {
  it('creates a private username session, saves a mood and reopens without another signup', async () => {
    const server = backend()
    const app = render(<CloudAccount client={server.client} onDemo={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: ' Alex ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start my journal' }))
    await screen.findByRole('radio', { name: 'Good' })
    expect(screen.getByText('Alex', { exact: true })).toBeVisible()
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
    expect(await screen.findByRole('alert')).toHaveTextContent(/browser storage/i)
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
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('button', { name: 'Save check-in' })).toBeInTheDocument()
    expect(server.requests.some(request => request.path.endsWith('/logout'))).toBe(false)
    confirm.mockReturnValue(true)
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
    fireEvent.click(screen.getByText('Keep this journal accessible'))
    fireEvent.change(screen.getByLabelText('Recovery email'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t send/i)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Recovery email')).toHaveValue('alex@example.com')
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
    await screen.findByRole('button', { name: 'Import local entries' })
    expect(server.entries.size).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Import local entries' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Import local entries' })).not.toBeInTheDocument())
    expect(server.entries.get('alex')?.[0].note).toBe('My local moment')
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('My local moment')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByLabelText('Your own reason')).toHaveValue('Keep this draft')
    await act(async () => complete(false))
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
