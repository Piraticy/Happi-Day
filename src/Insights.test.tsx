import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import Insights from './Insights'

it('describes recorded moods and reasons without claiming a cause', () => {
  render(<Insights entries={[
    { id: 'a', mood: 'low', reasons: ['Sleep'], note: '', timestamp: '2026-11-12T10:00:00.000Z' },
    { id: 'b', mood: 'low', reasons: ['Sleep'], note: '', timestamp: '2026-11-13T10:00:00.000Z' },
    { id: 'c', mood: 'good', reasons: ['Friends'], note: '', timestamp: '2026-11-13T11:00:00.000Z' },
  ]} />)
  expect(screen.getByRole('region', { name: 'Mood insights' })).toHaveTextContent(/Low.*appeared most often \(2\)/)
  expect(screen.getByRole('region', { name: 'Mood insights' })).toHaveTextContent(/Sleep.*most often/)
  expect(screen.getByRole('region', { name: 'Mood insights' })).toHaveTextContent(/not explanations of why/)
})
