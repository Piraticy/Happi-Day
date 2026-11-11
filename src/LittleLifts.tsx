import { useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, RotateCcw } from 'lucide-react'
import Panel from './Panel'
import { dailyLifts, liftCount } from './lifts'
import type { Entry } from './model'

export default function LittleLifts({ entries, now }: { entries: Entry[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const count = liftCount(entries, now)
  const [index, setIndex] = useState(0)
  const [about, setAbout] = useState(false)
  const current = Math.min(index, count - 1)
  return <section className="lifts-page">
    <div className="page-intro"><h1>A little lift. At your pace.</h1><p>Small things to try. Every feeling is welcome.</p></div>
    <div className="lifts-daily"><Heart size={19} /><p>{count === 1 ? 'One small idea for today.' : `${count} small ideas for today.`} <span>Fresh ideas each day.</span></p></div>
    <ul className="lift-list" aria-label="Today’s activities">{dailyLifts(now, count, offset).slice(current, current + 1).map(lift => <li key={lift.id}>
      <div className="lift-heading"><h2>{lift.title}</h2><span>{lift.time}</span></div>
      <p>{lift.text}</p><span className="lift-theme">{lift.theme}</span>
    </li>)}</ul>
    <div className="page-controls"><button type="button" className="icon-button" aria-label="Previous activity" disabled={current === 0} onClick={() => setIndex(current - 1)}><ChevronLeft size={20} /></button><span aria-live="polite">Activity {current + 1} of {count}</span><button type="button" className="icon-button" aria-label="Next activity" disabled={current === count - 1} onClick={() => setIndex(current + 1)}><ChevronRight size={20} /></button></div>
    <div className="lift-actions"><button className="text-button lift-alternatives" onClick={() => { setOffset(value => value + count); setIndex(0) }}><RotateCcw size={16} /> Try other ideas</button><button className="text-button neutral" aria-haspopup="dialog" onClick={() => setAbout(true)}>About these ideas</button></div>
    {about && <Panel title="About these ideas" onClose={() => setAbout(false)}><p>Start with one idea, then two and up to three as you check in on new days. Try any, skip any. There’s no catching up.</p><p>These everyday wellbeing suggestions draw on connection, movement, learning, kindness and present-moment awareness. They may help you find a small pause; they don’t promise a particular mood or replace professional care.</p><a href="https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/" target="_blank" rel="noreferrer">Read the NHS wellbeing guide</a></Panel>}

  </section>
}
