import { useState } from 'react'

const WORDS = [
  { answer: 'SMILE', clue: 'A happy expression' },
  { answer: 'PAUSE', clue: 'A brief break' },
  { answer: 'LIGHT', clue: 'What a lamp gives' },
  { answer: 'WATER', clue: 'Something to drink' },
  { answer: 'PLANT', clue: 'A leafy living thing' },
  { answer: 'DREAM', clue: 'A story during sleep' },
  { answer: 'LAUGH', clue: 'What a good joke may invite' },
] as const
export function puzzleForDay(now: Date) {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  const puzzle = WORDS[day % WORDS.length]
  return { ...puzzle, scrambled: puzzle.answer.slice(2) + puzzle.answer.slice(0, 2) }
}
export default function DailyPuzzle({ now }: { now: Date }) {
  const puzzle = puzzleForDay(now)
  const [guess, setGuess] = useState('')
  const [done, setDone] = useState(false)
  const [tried, setTried] = useState(false)
  const [hint, setHint] = useState(false)
  return <section className="daily-puzzle"><p>Move these letters into a word:</p><div className="puzzle-letters" aria-label={`Scrambled letters ${puzzle.scrambled}`}>{puzzle.scrambled}</div><p className="puzzle-clue">Clue: {puzzle.clue}</p><button className="text-button puzzle-hint" type="button" onClick={() => setHint(true)} disabled={hint}>{hint ? `Starts with ${puzzle.answer[0]}` : 'Show a hint'}</button><form onSubmit={event => { event.preventDefault(); setTried(true); if (guess.trim().toUpperCase() === puzzle.answer) setDone(true) }}><label htmlFor="puzzle-guess">Your answer</label><input id="puzzle-guess" value={guess} onChange={event => { setGuess(event.target.value); setTried(false) }} maxLength={puzzle.answer.length} autoComplete="off" disabled={done} placeholder="Type the word" /><button className="primary-button" type="submit" disabled={done || !guess.trim()}>{done ? 'Solved!' : 'Check answer'}</button></form>{tried && <p role="status">{done ? 'Nice one. Come back tomorrow for a new word.' : 'Not quite. Try another arrangement.'}</p>}</section>
}
