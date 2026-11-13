import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import LittleLifts from './LittleLifts'
import type { Entry } from './model'

it('lets people page through all daily activities without expanding the page', () => {
  const entries: Entry[] = [9, 10, 11].map(day => ({ id: String(day), timestamp: new Date(2026, 10, day, 12).toISOString(), mood: 'good', reasons: [], note: '' }))
  render(<LittleLifts entries={entries} now={new Date(2026, 10, 11, 12)} />)
  expect(screen.getByText('Activity 1 of 3')).toBeVisible()
  const first = screen.getByRole('list', { name: 'Today’s activities' }).textContent
  fireEvent.click(screen.getByRole('button', { name: 'Next activity' }))
  expect(screen.getByText('Activity 2 of 3')).toBeVisible()
  expect(screen.getByRole('list', { name: 'Today’s activities' }).textContent).not.toBe(first)
  fireEvent.click(screen.getByRole('button', { name: 'Next activity' }))
  expect(screen.getByText('Activity 3 of 3')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Next activity' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'About these ideas' }))
  expect(screen.getByRole('dialog', { name: 'About these ideas' })).toBeVisible()
})

it('opens a longer daily story and reveals its ending', () => {
  const view = render(<LittleLifts entries={[]} now={new Date(2026, 10, 13, 12)} />)
  const story = screen.getByRole('button', { name: /Today’s story/ }).textContent
  expect(screen.getByRole('button', { name: /Little puzzle/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /Today’s story/ }))
  const dialog = screen.getByRole('dialog', { name: 'A little story for today' })
  expect(dialog.textContent!.length).toBeGreaterThan(200)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Read the ending' }))
  expect(screen.getByRole('status')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close a little story for today' }))
  view.rerender(<LittleLifts entries={[]} now={new Date(2026, 10, 14, 12)} />)
  expect(screen.getByRole('button', { name: /Today’s story/ }).textContent).not.toBe(story)
  fireEvent.click(screen.getByRole('button', { name: /Little puzzle/ }))
  expect(screen.getByRole('dialog', { name: 'Today’s little puzzle' })).toBeVisible()
})

it('swipes between daily activities without leaving the lift page', () => {
  const entries: Entry[] = [9, 10, 11].map(day => ({ id: String(day), timestamp: new Date(2026, 10, day, 12).toISOString(), mood: 'good', reasons: [], note: '' }))
  render(<LittleLifts entries={entries} now={new Date(2026, 10, 11, 12)} />)
  const list = screen.getByRole('list', { name: 'Today’s activities' })
  fireEvent.pointerDown(list, { pointerType: 'touch', isPrimary: true, clientX: 280, clientY: 100, pointerId: 1 })
  fireEvent.pointerUp(list, { pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 105, pointerId: 1 })
  expect(screen.getByText('Activity 2 of 3')).toBeVisible()
  fireEvent.pointerDown(list, { pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 100, pointerId: 2 })
  fireEvent.pointerUp(list, { pointerType: 'touch', isPrimary: true, clientX: 280, clientY: 104, pointerId: 2 })
  expect(screen.getByText('Activity 1 of 3')).toBeVisible()
})
