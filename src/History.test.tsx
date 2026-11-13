import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import History from './History'
import type { Entry } from './model'

it('pages through every moment and resets paging when filtering', () => {
  const entries: Entry[] = Array.from({ length: 8 }, (_, index) => ({ id: String(index), timestamp: `2026-11-0${index + 1}T12:00:00.000Z`, mood: index % 2 ? 'good' : 'low', note: `Moment ${index}`, reasons: [] }))
  render(<History entries={entries} onDelete={() => true} onCheckIn={() => {}} />)
  expect(screen.getAllByRole('article')).toHaveLength(6)
  expect(screen.getByText('Moment 7')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Older moments' }))
  expect(screen.getByText('Moment 0')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Older moments' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Filter history by mood'), { target: { value: 'good' } })
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.getByText('Moment 3')).toBeVisible()
})

it('opens the full text of a long note in a panel', () => {
  const note = 'A long personal note. '.repeat(20)
  render(<History entries={[{ id: 'one', timestamp: '2026-11-11T12:00:00.000Z', mood: 'good', reasons: [], note }]} onDelete={() => true} onCheckIn={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Read note' }))
  expect(screen.getByRole('dialog', { name: 'Your moment' })).toHaveTextContent(note.trim())
})

it('downloads the complete saved history on desktop', async () => {
  let file: Blob | undefined
  const objectUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { file = blob as Blob; return 'blob:history' })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<History entries={[{ id: 'saved', timestamp: '2026-11-11T12:00:00.000Z', mood: 'good', reasons: ['Friends'], note: 'A private moment' }]} onDelete={() => true} onCheckIn={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Download history' }))
  expect(click).toHaveBeenCalledOnce()
  expect(JSON.parse(await file!.text()).entries).toEqual([{ id: 'saved', timestamp: '2026-11-11T12:00:00.000Z', mood: 'good', reasons: ['Friends'], note: 'A private moment' }])
  objectUrl.mockRestore(); click.mockRestore()
})
