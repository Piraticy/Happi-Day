import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import DailyPuzzle, { puzzleForDay } from './DailyPuzzle'

it('rotates its word by day and accepts the unscrambled answer', () => {
  const today = new Date(2026, 10, 13)
  const puzzle = puzzleForDay(today)
  expect(puzzleForDay(new Date(2026, 10, 14)).answer).not.toBe(puzzle.answer)
  render(<DailyPuzzle now={today} />)
  fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: puzzle.answer.toLowerCase() } })
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
  expect(screen.getByRole('status')).toHaveTextContent(/come back tomorrow/i)
})
