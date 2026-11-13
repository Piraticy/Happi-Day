import { useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, RotateCcw } from 'lucide-react'
import Panel from './Panel'
import { dailyLifts, liftCount } from './lifts'
import type { Entry } from './model'
import DailyPuzzle from './DailyPuzzle'

export default function LittleLifts({ entries, now }: { entries: Entry[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const count = liftCount(entries, now)
  const [index, setIndex] = useState(0)
  const [about, setAbout] = useState(false)
  const current = Math.min(index, count - 1)
  const stories = [
    'The plant on my desk has been thriving since I started saying good morning to it. My printer remains unimpressed.',
    'I tried to make a to-do list for my cat. She looked at it, sat on it, and completed the first item: rest.',
    'The elevator stopped at every floor. By the top, we had become a very quiet neighborhood.',
    'I bought a notebook for my brilliant ideas. Its first page says: remember where you put the notebook.',
    'The pigeon outside walked like it had three meetings and was late for all of them.',
    'I waved at someone who was waving behind me. We both committed to the bit and became friends for five seconds.',
    'My umbrella turned inside out in the wind. For a moment, it seemed more interested in flying than I was.',
    'I asked my kettle to hurry. It clicked off immediately. We have an understanding now.',
    'The sock that vanished in the laundry returned inside a pillowcase, like it had been on holiday.',
    'A dog carried a stick twice its size and looked extremely pleased with its engineering.',
    'My phone suggested a walk after I walked to the fridge. It was technically correct.',
    'The pancake looked nothing like a circle. We agreed it was a map of somewhere lovely.',
  ]
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return <section className="lifts-page">
    <div className="page-intro"><h1>A little lift. At your pace.</h1><p>Small things to try. Every feeling is welcome.</p></div>
    <div className="lifts-daily"><Heart size={19} /><p>{count === 1 ? 'One small idea for today.' : `${count} small ideas for today.`} <span>Fresh ideas each day.</span></p></div>
    <ul className="lift-list" aria-label="Today’s activities">{dailyLifts(now, count, offset).slice(current, current + 1).map(lift => <li key={lift.id}>
      <div className="lift-heading"><h2>{lift.title}</h2><span>{lift.time}</span></div>
      <p>{lift.text}</p><span className="lift-theme">{lift.theme}</span>
    </li>)}</ul>
    <div className="page-controls"><button type="button" className="icon-button" aria-label="Previous activity" disabled={current === 0} onClick={() => setIndex(current - 1)}><ChevronLeft size={20} /></button><span aria-live="polite">Activity {current + 1} of {count}</span><button type="button" className="icon-button" aria-label="Next activity" disabled={current === count - 1} onClick={() => setIndex(current + 1)}><ChevronRight size={20} /></button></div>
    <div className="lift-actions"><button className="text-button lift-alternatives" onClick={() => { setOffset(value => value + count); setIndex(0) }}><RotateCcw size={16} /> Try other ideas</button><button className="text-button neutral" aria-haspopup="dialog" onClick={() => setAbout(true)}>About these ideas</button></div>
    <div className="lifts-extras"><section className="daily-story"><h2>A little story for today</h2><p>{stories[day % stories.length]}</p><span>A new one tomorrow</span></section><DailyPuzzle now={now} /></div>
    {about && <Panel title="About these ideas" onClose={() => setAbout(false)}><p>Start with one idea, then two and up to three as you check in on new days. Try any, skip any. There’s no catching up.</p><p>These everyday wellbeing suggestions draw on connection, movement, learning, kindness and present-moment awareness. They may help you find a small pause; they don’t promise a particular mood or replace professional care.</p><a href="https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/" target="_blank" rel="noreferrer">Read the NHS wellbeing guide</a></Panel>}

  </section>
}
