import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AppUpdate from './AppUpdate'
import CheckIn from './CheckIn'
import SessionRecovery from './SessionRecovery'
import type { SupabaseClient } from '@supabase/supabase-js'
import { freshJournal } from './model'

let release = 'current'
let request: ReturnType<typeof vi.fn>
const flush = async () => { await act(async () => {}) }
beforeEach(() => {
  vi.useFakeTimers()
  release = 'current'
  request = vi.fn(async () => new Response(JSON.stringify({ version: release }), { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', request)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

it('checks the deployed version without caching and leaves current clients alone', async () => {
  render(<AppUpdate currentVersion="current" onUpdate={vi.fn()} />)
  await flush()
  expect(request).toHaveBeenCalledWith('/version.json', expect.objectContaining({ cache: 'no-store', credentials: 'omit', signal: expect.any(AbortSignal) }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Update available' })).not.toBeInTheDocument()
})

it('prompts two open device clients for the same new deployment', async () => {
  release = 'next'
  render(<><AppUpdate currentVersion="current" onUpdate={vi.fn()} /><AppUpdate currentVersion="current" onUpdate={vi.fn()} /></>)
  await flush()
  expect(screen.getAllByRole('dialog', { name: 'An update is ready' })).toHaveLength(2)
  expect(screen.getAllByText(/Save your unfinished check-in or changes first/)).toHaveLength(2)
})

it('Later preserves a draft and remembered session, and can reopen the update prompt', async () => {
  release = 'next'
  localStorage.setItem('remembered-auth', 'private-session')
  render(<><CheckIn onSave={() => true} /><AppUpdate currentVersion="current" onUpdate={vi.fn()} /></>)
  fireEvent.click(screen.getByLabelText('Good'))
  fireEvent.click(screen.getByRole('button', { name: 'Add a reason optional' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Your own reason' }), { target: { value: 'Keep my unfinished words' } })
  await flush()
  const prompt = screen.getByRole('dialog', { name: 'An update is ready' })
  fireEvent.click(within(prompt).getByRole('button', { name: 'Later' }))
  expect(screen.queryByRole('dialog', { name: 'An update is ready' })).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Your own reason' })).toHaveValue('Keep my unfinished words')
  expect(screen.getByLabelText('Good')).toBeChecked()
  expect(localStorage.getItem('remembered-auth')).toBe('private-session')
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(screen.queryByRole('dialog', { name: 'An update is ready' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Update available' }))
  expect(screen.getByRole('dialog', { name: 'An update is ready' })).toBeInTheDocument()
})

it('reloads only after Update now and leaves all saved state untouched', async () => {
  release = 'next'
  const update = vi.fn()
  localStorage.setItem('happi-day:v1', 'saved-journal')
  localStorage.setItem('remembered-auth', 'private-session')
  render(<AppUpdate currentVersion="current" onUpdate={update} />)
  await flush()
  expect(update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
  expect(update).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem('happi-day:v1')).toBe('saved-journal')
  expect(localStorage.getItem('remembered-auth')).toBe('private-session')
})

it('does not reload during an in-progress operation, then allows retry', async () => {
  release = 'next'
  const update = vi.fn()
  const { rerender } = render(<><form aria-busy="true" aria-label="Saving journal" /><AppUpdate currentVersion="current" onUpdate={update} /></>)
  await flush()
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
  expect(update).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/still finishing/)
  rerender(<><form aria-busy="false" aria-label="Saving journal" /><AppUpdate currentVersion="current" onUpdate={update} /></>)
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
  expect(update).toHaveBeenCalledTimes(1)
})

it('suppresses the dismissed release but prompts for a later release and checks on focus', async () => {
  release = 'next'
  render(<AppUpdate currentVersion="current" onUpdate={vi.fn()} />)
  await flush()
  fireEvent.click(screen.getByRole('button', { name: 'Later' }))
  fireEvent.focus(window)
  await flush()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  release = 'newer'
  fireEvent.focus(window)
  await flush()
  expect(screen.getByRole('dialog', { name: 'An update is ready' })).toBeInTheDocument()
})

it('quietly retries failed, missing and invalid version responses', async () => {
  request.mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(new Response('missing', { status: 404 }))
    .mockResolvedValueOnce(new Response('<html>Not JSON</html>'))
    .mockResolvedValueOnce(new Response(JSON.stringify({ version: { invalid: true } })))
  render(<AppUpdate currentVersion="current" onUpdate={vi.fn()} />)
  await flush()
  for (let retry = 0; retry < 3; retry++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }
  release = 'next'
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(screen.getByRole('dialog', { name: 'An update is ready' })).toBeInTheDocument()
})

it('skips hidden/offline clients and checks on return and reconnection', async () => {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  render(<AppUpdate currentVersion="current" onUpdate={vi.fn()} />)
  await flush()
  expect(request).not.toHaveBeenCalled()
  visibility.mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  await flush()
  expect(request).not.toHaveBeenCalled()
  online.mockReturnValue(true)
  fireEvent(window, new Event('online'))
  await flush()
  expect(request).toHaveBeenCalledTimes(1)
  release = 'next'
  fireEvent(document, new Event('visibilitychange'))
  await flush()
  expect(screen.getByRole('dialog', { name: 'An update is ready' })).toBeInTheDocument()
})

it('aborts stalled checks, avoids overlap and stops checking after unmount', async () => {
  const signals: AbortSignal[] = []
  request.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    signals.push(options.signal)
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  }))
  const { unmount } = render(<StrictMode><AppUpdate currentVersion="current" onUpdate={vi.fn()} /></StrictMode>)
  await flush()
  expect(signals[0].aborted).toBe(true)
  const active = signals.at(-1)!
  const count = request.mock.calls.length
  fireEvent.focus(window)
  await flush()
  expect(request).toHaveBeenCalledTimes(count)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(active.aborted).toBe(true)
  fireEvent.focus(window)
  await flush()
  expect(request).toHaveBeenCalledTimes(count + 1)
  unmount()
  expect(signals.at(-1)!.aborted).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000) })
  fireEvent.focus(window)
  expect(request).toHaveBeenCalledTimes(count + 1)
})

it('keeps an unmounted account request protected until it settles', async () => {
  release = 'next'
  const update = vi.fn()
  let finish!: (value: { error: Error | null }) => void
  const waiting = new Promise<{ error: Error | null }>(resolve => { finish = resolve })
  const client = { auth: { updateUser: () => waiting } } as unknown as SupabaseClient
  const { rerender } = render(<><SessionRecovery client={client} /><AppUpdate currentVersion="current" onUpdate={update} /></>)
  fireEvent.click(screen.getByText('Keep this journal accessible'))
  fireEvent.change(screen.getByLabelText('Recovery email'), { target: { value: 'owner@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
  await flush()
  rerender(<><AppUpdate currentVersion="current" onUpdate={update} /></>)
  await flush()
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
  expect(update).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/still finishing/)
  await act(async () => { finish({ error: new Error('Request failed') }); await waiting })
  fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
  expect(update).toHaveBeenCalledTimes(1)
})
