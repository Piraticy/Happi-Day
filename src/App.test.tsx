import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DEMO_KEY, freshJournal, STORAGE_KEY } from './model'

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
  localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks()
})
afterEach(() => vi.unstubAllEnvs())

function enterDemo() {
  const result = render(<App />)
  fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'Alex' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }))
  return result
}

describe('Happi-Day local demo', () => {
  it('opens saved moments in a panel without expanding the main page', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('button', { name: /Today’s moments/ }))
    expect(screen.getByRole('dialog', { name: 'Today’s moments' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close today’s moments' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('swipes between sections without losing an unfinished check-in', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    const region = screen.getByRole('region', { name: 'Journal pages' })
    fireEvent.pointerDown(region, { pointerType: 'touch', isPrimary: true, clientX: 280, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(region, { pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 105, pointerId: 1 })
    expect(screen.getByRole('heading', { name: /A little lift/ })).toBeVisible()
    fireEvent.pointerDown(region, { pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 100, pointerId: 2 })
    fireEvent.pointerUp(region, { pointerType: 'touch', isPrimary: true, clientX: 280, clientY: 105, pointerId: 2 })
    expect(screen.getByRole('radio', { name: 'Good' })).toBeChecked()
  })

  it('ignores vertical, cancelled and form gestures', () => {
    enterDemo()
    const region = screen.getByRole('region', { name: 'Journal pages' })
    fireEvent.pointerDown(region, { pointerType: 'touch', clientX: 280, clientY: 100 })
    fireEvent.pointerUp(region, { pointerType: 'touch', clientX: 250, clientY: 260 })
    fireEvent.pointerDown(region, { pointerType: 'touch', clientX: 280, clientY: 100 })
    fireEvent.pointerCancel(region)
    fireEvent.pointerUp(region, { pointerType: 'touch', clientX: 100, clientY: 100 })
    const form = screen.getByRole('radio', { name: 'Good' }).closest('form')!
    fireEvent.pointerDown(form, { pointerType: 'touch', clientX: 280, clientY: 100 })
    fireEvent.pointerUp(form, { pointerType: 'touch', clientX: 100, clientY: 100 })
    expect(screen.queryByRole('heading', { name: /A little lift/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Good' })).toBeVisible()
  })

  it('keeps optional reasons collapsed until requested', () => {
    enterDemo()
    expect(screen.queryByLabelText('Your own reason')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    expect(screen.getByLabelText('Your own reason')).toBeVisible()
  })

  it('opens a separate daily lifts page with optional alternatives', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('button', { name: 'Little lifts' }))
    const heading = screen.getByRole('heading', { name: /A little lift/ })
    expect(heading).toBeVisible()
    const first = screen.getByRole('list', { name: 'Today’s activities' }).textContent
    fireEvent.click(screen.getByRole('button', { name: /Try other ideas/ }))
    expect(screen.getByRole('list', { name: 'Today’s activities' }).textContent).not.toBe(first)
  })

  it('refreshes daily ideas at local midnight while the app stays open', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 10, 23, 59, 50))
      enterDemo()
      fireEvent.click(screen.getByRole('button', { name: 'Little lifts' }))
      fireEvent.click(screen.getByRole('button', { name: /Try other ideas/ }))
      const previous = screen.getByRole('list', { name: 'Today’s activities' }).textContent
      act(() => { vi.advanceTimersByTime(30_000) })
      expect(screen.getByRole('list', { name: 'Today’s activities' }).textContent).not.toBe(previous)
    } finally { vi.useRealTimers() }
  })

  it('keeps a drafted reason when its panel is closed', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'A quiet day' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries[0].note).toBe('A quiet day')
  })

  it('enters without a password and saves mood, preset reasons, and custom words', () => {
    enterDemo()
    expect(screen.getByRole('button', { name: 'Save this moment' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Work' }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Finished a project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    fireEvent.click(screen.getByText('Today’s moments'))
    expect(screen.getByText('Finished a project')).toBeVisible()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.entries[0]).toMatchObject({ mood: 'good', reasons: ['Work'], note: 'Finished a project' })
    fireEvent.click(screen.getByRole('button', { name: 'Close today’s moments' }))
    expect(screen.queryByLabelText('Your own reason')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('')
    fireEvent.click(screen.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries).toHaveLength(2)
  })

  it('saves spontaneous moments with recorded timestamps and no assigned slot', () => {
    enterDemo()
    for (let count = 0; count < 4; count++) {
      fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    }
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.entries).toHaveLength(4)
    expect(saved.entries.every((entry: { slotId?: string; timestamp: string }) => !entry.slotId && Number.isFinite(Date.parse(entry.timestamp)))).toBe(true)
    expect(screen.queryByLabelText('Checking in for')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Your rhythm' })).not.toBeInTheDocument()
  })

  it('preserves the form when storage fails and saves it on retry', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Low' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Keep these words' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t save/i)
    fireEvent.click(screen.getByRole('button', { name: /Edit your reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('Keep these words')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    failure.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    fireEvent.click(screen.getByText('Today’s moments'))
    expect(screen.getByText('Keep these words')).toBeVisible()
  })

  it('shows saved history after reload and confirms deletion with an undo', () => {
    const journal = freshJournal()
    journal.name = 'Alex'
    journal.entries = [{ id: 'entry', mood: 'good', reasons: [], note: 'An earlier moment', timestamp: '2026-11-09T08:00:00.000Z' }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journal))
    sessionStorage.setItem(DEMO_KEY, 'active')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    const article = screen.getByRole('article')
    expect(within(article).getByText('An earlier moment')).toBeInTheDocument()
    const deleteTrigger = within(article).getByRole('button', { name: 'Delete check-in' })
    deleteTrigger.focus()
    fireEvent.click(deleteTrigger)
    expect(within(article).getByRole('button', { name: 'Keep it' })).toHaveFocus()
    fireEvent.click(within(article).getByRole('button', { name: 'Keep it' }))
    expect(deleteTrigger).toHaveFocus()
    fireEvent.click(deleteTrigger)
    fireEvent.click(within(article).getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('An earlier moment')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Undo delete' }))
    expect(screen.getByText('An earlier moment')).toBeInTheDocument()
  })

  it('keeps undo and keyboard focus inside the moments panel after deletion', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    fireEvent.click(screen.getByRole('button', { name: /Today’s moments/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete check-in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Today’s moments' })
    expect(within(dialog).getByRole('button', { name: 'Close today’s moments' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo delete' }))
    expect(within(dialog).getByRole('article')).toBeVisible()
  })

  it('shows failed deletion inside the moments panel without losing the entry', async () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    fireEvent.click(screen.getByRole('button', { name: /Today’s moments/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete check-in' }))
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      expect(within(screen.getByRole('dialog', { name: 'Today’s moments' })).getByRole('alert')).toHaveTextContent(/couldn’t save/i)
      expect(screen.getByRole('article')).toBeVisible()
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries).toHaveLength(1)
    } finally { write.mockRestore() }
  })

  it('leaves the demo without removing saved entries', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Great' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this moment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Journal options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave demo' }))
    expect(screen.getByRole('button', { name: 'Enter demo' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries).toHaveLength(1)
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull()
  })

  it('protects unreadable saved data rather than replacing it with an empty journal', () => {
    localStorage.setItem(STORAGE_KEY, 'broken saved data')
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t read/i)
    expect(screen.queryByRole('button', { name: 'Enter demo' })).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken saved data')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken saved data')
  })
})
