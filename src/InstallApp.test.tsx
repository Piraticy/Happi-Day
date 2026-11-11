import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import InstallApp from './InstallApp'

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
