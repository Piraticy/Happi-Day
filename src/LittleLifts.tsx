import { useState } from 'react'
import { Heart, RotateCcw } from 'lucide-react'
import { dailyLifts, liftCount } from './lifts'
import type { Entry } from './model'

export default function LittleLifts({ entries, now }: { entries: Entry[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const count = liftCount(entries, now)
  return <section className="lifts-page">
    <div className="page-intro"><h1>A little lift.<br />At your pace.</h1><p>Small things to try. Every feeling is welcome.</p></div>
    <div className="lifts-daily"><Heart size={19} /><p>{count === 1 ? 'One small idea for today.' : `${count} small ideas for today.`} <span>Fresh ideas each day.</span></p></div>
    <ul className="lift-list" aria-label="Today’s activities">{dailyLifts(now, count, offset).map(lift => <li key={lift.id}>
      <div className="lift-heading"><h2>{lift.title}</h2><span>{lift.time}</span></div>
      <p>{lift.text}</p><span className="lift-theme">{lift.theme}</span>
    </li>)}</ul>
    <button className="text-button lift-alternatives" onClick={() => setOffset(current => current + count)}><RotateCcw size={16} /> Try other ideas</button>
    <p className="lifts-note">Start with one idea, then two and up to three as you check in on new days. Try any, skip any. There’s no catching up.</p>
    <details className="lifts-about"><summary>About these ideas</summary><p>These everyday wellbeing suggestions draw on connection, movement, learning, kindness and present-moment awareness. They may help you find a small pause; they don’t promise a particular mood or replace professional care.</p><a href="https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/" target="_blank" rel="noreferrer">Read the NHS wellbeing guide</a></details>
  </section>
}
