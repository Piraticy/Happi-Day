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
  it('opens today’s saved moments on desktop and collapses them on phone', () => {
    const media = new EventTarget() as MediaQueryList
    Object.assign(media, { matches: true })
    vi.stubGlobal('matchMedia', () => media)
    try {
      enterDemo()
      const details = screen.getByText('Today’s moments').closest('details')!
      expect(details.open).toBe(true)
      act(() => { Object.assign(media, { matches: false }); media.dispatchEvent(new Event('change')) })
      expect(details.open).toBe(false)
    } finally { vi.unstubAllGlobals() }
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
    fireEvent.click(screen.getByRole('button', { name: /Your reason/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries[0].note).toBe('A quiet day')
  })

  it('enters without a password and saves mood, preset reasons, and custom words', () => {
    enterDemo()
    expect(screen.getByRole('button', { name: 'Save check-in' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Work' }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Finished a project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    fireEvent.click(screen.getByText('Today’s moments'))
    expect(screen.getByText('Finished a project')).toBeVisible()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.entries[0]).toMatchObject({ mood: 'good', reasons: ['Work'], note: 'Finished a project' })
    expect(screen.queryByLabelText('Your own reason')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    expect(screen.getByLabelText('Your own reason')).toHaveValue('')
    fireEvent.click(screen.getByRole('radio', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries).toHaveLength(2)
  })

  it('edits check-in times, adds a fourth time, and keeps them after remounting', () => {
    const app = enterDemo()
    fireEvent.click(screen.getByRole('button', { name: 'Your rhythm' }))
    fireEvent.change(screen.getByLabelText('Time for Morning'), { target: { value: '08:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a check-in time' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save rhythm' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.schedule).toHaveLength(4)
    expect(saved.schedule.find((slot: { id: string }) => slot.id === 'morning').time).toBe('08:30')
    expect(screen.getByText(/rhythm saved/i)).toBeInTheDocument()
    app.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Your rhythm' }))
    expect(screen.getByLabelText('Time for Morning')).toHaveValue('08:30')
    expect(screen.getByLabelText('Name for check-in 4')).toBeInTheDocument()
  })

  it('permits a fourth entry after all three planned check-ins are complete', () => {
    enterDemo()
    for (let count = 0; count < 4; count++) {
      fireEvent.click(screen.getByRole('radio', { name: 'Good' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    }
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.entries).toHaveLength(4)
    expect(saved.entries.slice(0, 3).map((entry: { slotId: string }) => entry.slotId)).toEqual(['morning', 'afternoon', 'evening'])
    expect(saved.entries[3].slotId).toBeUndefined()
    expect(screen.getByLabelText('Checking in for')).toHaveValue('')
  })

  it('preserves the form when storage fails and saves it on retry', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Low' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a reason/ }))
    fireEvent.change(screen.getByLabelText('Your own reason'), { target: { value: 'Keep these words' } })
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t save/i)
    expect(screen.getByLabelText('Your own reason')).toHaveValue('Keep these words')
    failure.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
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

  it('leaves the demo without removing saved entries', () => {
    enterDemo()
    fireEvent.click(screen.getByRole('radio', { name: 'Great' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }))
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
