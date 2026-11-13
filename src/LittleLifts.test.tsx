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

it('offers a different light story on the next day', () => {
  const view = render(<LittleLifts entries={[]} now={new Date(2026, 10, 13, 12)} />)
  const story = screen.getByText('A little story for today').parentElement!.textContent
  expect(screen.getByText('Today’s little puzzle')).toBeVisible()
  view.rerender(<LittleLifts entries={[]} now={new Date(2026, 10, 14, 12)} />)
  expect(screen.getByText('A little story for today').parentElement!.textContent).not.toBe(story)
})
