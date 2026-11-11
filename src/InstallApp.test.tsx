import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import InstallApp from './InstallApp'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function offerInstall(outcome: 'accepted' | 'dismissed' = 'dismissed', fail = false) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, {
    prompt: () => fail ? Promise.reject(new Error('Unavailable')) : Promise.resolve(),
    userChoice: Promise.resolve({ outcome }),
  })
  act(() => { window.dispatchEvent(event) })
  return event
}

it('shows manual installation help without a browser prompt', () => {
  render(<InstallApp />)
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }))
  expect(screen.getByRole('region', { name: 'Install Little moments' })).toBeVisible()
  expect(screen.getByText(/Chrome or Edge/)).toBeVisible()
  expect(screen.getByText(/internet connection/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close install help' }))
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
})

it('uses the browser prompt and allows a later attempt after dismissal', async () => {
  render(<InstallApp />)
  expect(offerInstall().defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }))
  await waitFor(() => expect(screen.getByText(/Installation was cancelled/)).toBeVisible())
  offerInstall('accepted')
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }))
  await waitFor(() => expect(screen.getByText(/Follow your browser/)).toBeVisible())
  act(() => { window.dispatchEvent(new Event('appinstalled')) })
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
})

it('recovers to manual instructions if the native prompt fails', async () => {
  render(<InstallApp />)
  offerInstall('dismissed', true)
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }))
  await waitFor(() => expect(screen.getByText(/Couldn’t open/)).toBeVisible())
  expect(screen.getByText(/Chrome or Edge/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Install app' })).toBeEnabled()
})

it('hides installation controls when already running in an app window', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  render(<InstallApp />)
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
})

it('remembers a completed install when the browser tab is reopened', () => {
  localStorage.clear()
  const app = render(<InstallApp />)
  act(() => { window.dispatchEvent(new Event('appinstalled')) })
  app.unmount()
  render(<InstallApp />)
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
})

it('detects an existing installation through the browser API', async () => {
  localStorage.clear()
  Object.defineProperty(navigator, 'getInstalledRelatedApps', { configurable: true, value: () => Promise.resolve([{ platform: 'webapp', id: new URL('/', location.href).href, url: new URL('/manifest.webmanifest', location.href).href }]) })
  try {
    render(<InstallApp />)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument())
  } finally { Reflect.deleteProperty(navigator, 'getInstalledRelatedApps') }
})

it('offers installation again when the browser reports a fresh install offer', () => {
  localStorage.clear()
  const app = render(<InstallApp />)
  act(() => { window.dispatchEvent(new Event('appinstalled')) })
  app.unmount()
  render(<InstallApp />)
  offerInstall()
  expect(screen.getByRole('button', { name: 'Install app' })).toBeVisible()
})

it('does not let a stale installed-app query hide a fresh install offer', async () => {
  let finish!: (apps: { platform: string; id: string }[]) => void
  Object.defineProperty(navigator, 'getInstalledRelatedApps', { configurable: true, value: () => new Promise(resolve => { finish = resolve }) })
  try {
    render(<InstallApp />)
    offerInstall()
    await act(async () => { finish([{ platform: 'webapp', id: new URL('/', location.href).href }]) })
    expect(screen.getByRole('button', { name: 'Install app' })).toBeVisible()
  } finally { Reflect.deleteProperty(navigator, 'getInstalledRelatedApps') }
})

it('still hides after installation if saving the preference is blocked', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  try {
    render(<InstallApp />)
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  } finally { write.mockRestore() }
})
