import { useState } from 'react'
import { ArrowRight, BookOpen, Puzzle } from 'lucide-react'
import Panel from './Panel'
import DailyPuzzle, { puzzleForDay } from './DailyPuzzle'
import { storyForDay } from './stories'

export default function DailyExtras({ now }: { now: Date }) {
  const [open, setOpen] = useState<'story' | 'puzzle' | null>(null)
  const [endingOpen, setEndingOpen] = useState(false)
  const story = storyForDay(now)
  const puzzle = puzzleForDay(now)
  return <>
    <div className="lifts-extras">
      <button type="button" className="extra-card" aria-haspopup="dialog" onClick={() => { setEndingOpen(false); setOpen('story') }}><BookOpen size={21} strokeWidth={1.7} /><span><strong>Today’s story</strong><small>{story.teaser}</small></span><ArrowRight size={18} /></button>
      <button type="button" className="extra-card" aria-haspopup="dialog" onClick={() => setOpen('puzzle')}><Puzzle size={21} strokeWidth={1.7} /><span><strong>Little puzzle</strong><small>Unscramble {puzzle.scrambled}</small></span><ArrowRight size={18} /></button>
    </div>
    {open === 'story' && <Panel title="A little story for today" onClose={() => setOpen(null)}><article className="story-reading"><h3>{story.title}</h3><p>{story.setup}</p>{endingOpen ? <p className="story-ending" role="status">{story.ending}</p> : <button type="button" className="primary-button" onClick={() => setEndingOpen(true)}>Read the ending <ArrowRight size={18} /></button>}<small>A different story tomorrow.</small></article></Panel>}
    {open === 'puzzle' && <Panel title="Today’s little puzzle" onClose={() => setOpen(null)}><DailyPuzzle now={now} /></Panel>}
  </>
}
