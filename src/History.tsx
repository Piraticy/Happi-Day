import { useRef, useState } from 'react'
import { ArrowRight, BookOpen, Trash2 } from 'lucide-react'
import { localDay, MOODS } from './model'
import type { Entry } from './model'
import { MoodFace } from './Icons'
import type { SaveResult } from './CheckIn'

export function EntryList({ entries, onDelete, compact = false }: { entries: Entry[]; onDelete: (entry: Entry) => SaveResult; compact?: boolean }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const deleteTriggers = useRef(new Map<string, HTMLButtonElement>())
  const [deleting, setDeleting] = useState(false)
  return <div className={`entry-list ${compact ? 'compact' : ''}`}>{[...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(entry => <article className="entry" key={entry.id} aria-label={`${MOODS.find(mood => mood.id === entry.mood)!.label} check-in`}>
    <MoodFace mood={entry.mood} />
    <div className="entry-content">
      <div className="entry-heading"><h3>{MOODS.find(mood => mood.id === entry.mood)!.label}</h3><time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
      {entry.reasons.length > 0 && <p className="entry-reasons">{entry.reasons.join(' · ')}</p>}
      {entry.note && <p className="entry-note">{entry.note}</p>}
      {confirmId === entry.id && <div className="delete-confirm"><p>Delete this check-in?</p><button disabled={deleting} type="button" className="text-button" onClick={async () => { setDeleting(true); try { const result = onDelete(entry); if (typeof result === 'boolean' ? result : await result) setConfirmId(null) } finally { setDeleting(false) } }}>{deleting ? 'Deleting…' : 'Delete'}</button><button disabled={deleting} autoFocus type="button" className="text-button neutral" onClick={() => { setConfirmId(null); deleteTriggers.current.get(entry.id)?.focus() }}>Keep it</button></div>}
    </div>
    <button disabled={deleting} ref={element => { if (element) deleteTriggers.current.set(entry.id, element); else deleteTriggers.current.delete(entry.id) }} type="button" className="icon-button delete-button" aria-label="Delete check-in" aria-expanded={confirmId === entry.id} onClick={() => setConfirmId(entry.id)}><Trash2 size={16} /></button>
  </article>)}</div>
}

export default function History({ entries, onDelete, onCheckIn }: { entries: Entry[]; onDelete: (entry: Entry) => SaveResult; onCheckIn: () => void }) {
  const [filter, setFilter] = useState('all')
  const filtered = entries.filter(entry => filter === 'all' || entry.mood === filter)
  const days = [...new Set(filtered.map(entry => localDay(new Date(entry.timestamp))))].sort().reverse()
  return <div className="history-page">
    <div className="page-intro"><h1>Your little<br />moments, kept.</h1><p>A place for every kind of day.</p></div>
    {entries.length > 0 && <div className="history-toolbar"><p>{entries.length} {entries.length === 1 ? 'moment' : 'moments'} recorded</p><label>Show <select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter history by mood"><option value="all">All moods</option>{MOODS.map(mood => <option key={mood.id} value={mood.id}>{mood.label}</option>)}</select></label></div>}
    {days.length === 0 ? <div className="empty-history"><BookOpen size={32} strokeWidth={1.4} /><h2>{entries.length ? 'No moments with this mood yet.' : 'Your story starts with a check-in.'}</h2><p>{entries.length ? 'Try another mood or show all your moments.' : 'The small moments count. Save your first one whenever you’re ready.'}</p>{!entries.length && <button className="primary-button" onClick={onCheckIn}>Make a check-in <ArrowRight size={18} /></button>}</div>
      : days.map(day => <section className="history-day" key={day}><h2>{new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2><EntryList entries={filtered.filter(entry => localDay(new Date(entry.timestamp)) === day)} onDelete={onDelete} /></section>)}
  </div>
}
