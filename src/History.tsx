import { useRef, useState } from 'react'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { localDay, MOODS } from './model'
import type { Entry } from './model'
import Panel from './Panel'
import { MoodFace } from './Icons'
import type { SaveResult } from './CheckIn'

export function EntryList({ entries, onDelete, compact = false }: { entries: Entry[]; onDelete: (entry: Entry) => SaveResult; compact?: boolean }) {
  const [reading, setReading] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const deleteTriggers = useRef(new Map<string, HTMLButtonElement>())
  const [deleting, setDeleting] = useState(false)
  return <div className={`entry-list ${compact ? 'compact' : ''}`}>{[...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(entry => <article className="entry" key={entry.id} aria-label={`${MOODS.find(mood => mood.id === entry.mood)!.label} check-in`}>
    <MoodFace mood={entry.mood} />
    <div className="entry-content">
      <div className="entry-heading"><h3>{MOODS.find(mood => mood.id === entry.mood)!.label}</h3><time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
      {entry.reasons.length > 0 && <p className="entry-reasons">{entry.reasons.join(' · ')}</p>}
      {entry.note && <button type="button" className="entry-note-preview" aria-label="Read note" aria-haspopup="dialog" onClick={() => setReading(entry)}><span className="entry-note">{entry.note}</span><span className="entry-read">Read note <ArrowRight size={12} /></span></button>}
      {confirmId === entry.id && <div className="delete-confirm"><p>Delete this check-in?</p><button disabled={deleting} type="button" className="text-button" onClick={async () => { setDeleting(true); try { const result = onDelete(entry); if (typeof result === 'boolean' ? result : await result) setConfirmId(null) } finally { setDeleting(false) } }}>{deleting ? 'Deleting…' : 'Delete'}</button><button disabled={deleting} autoFocus type="button" className="text-button neutral" onClick={() => { setConfirmId(null); deleteTriggers.current.get(entry.id)?.focus() }}>Keep it</button></div>}
    </div>
    <button disabled={deleting} ref={element => { if (element) deleteTriggers.current.set(entry.id, element); else deleteTriggers.current.delete(entry.id) }} type="button" className="icon-button delete-button" aria-label="Delete check-in" aria-expanded={confirmId === entry.id} onClick={() => setConfirmId(entry.id)}><Trash2 size={16} /></button>
  </article>)}{reading && <Panel title="Your moment" onClose={() => setReading(null)}><p className="moment-detail-meta">{new Date(reading.timestamp).toLocaleString()} · {MOODS.find(mood => mood.id === reading.mood)!.label}</p>{reading.reasons.length > 0 && <p>{reading.reasons.join(' · ')}</p>}<p className="entry-note-full">{reading.note}</p></Panel>}</div>
}

export default function History({ entries, onDelete, onCheckIn }: { entries: Entry[]; onDelete: (entry: Entry) => SaveResult; onCheckIn: () => void }) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const filtered = entries.filter(entry => filter === 'all' || entry.mood === filter).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 2))
  const currentPage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(currentPage * 2, currentPage * 2 + 2)
  const days = [...new Set(visible.map(entry => localDay(new Date(entry.timestamp))))].sort().reverse()
  return <div className="history-page">
    <div className="page-intro"><h1>Your little moments, kept.</h1><p>A place for every kind of day.</p></div>
    {entries.length > 0 && <div className="history-toolbar"><p>{entries.length} {entries.length === 1 ? 'moment' : 'moments'} recorded</p><label>Show <select value={filter} onChange={event => { setFilter(event.target.value); setPage(0) }} aria-label="Filter history by mood"><option value="all">All moods</option>{MOODS.map(mood => <option key={mood.id} value={mood.id}>{mood.label}</option>)}</select></label></div>}
    {days.length === 0 ? <div className="empty-history"><BookOpen size={32} strokeWidth={1.4} /><h2>{entries.length ? 'No moments with this mood yet.' : 'Your story starts with a check-in.'}</h2><p>{entries.length ? 'Try another mood or show all your moments.' : 'The small moments count. Save your first one whenever you’re ready.'}</p>{!entries.length && <button className="primary-button" onClick={onCheckIn}>Make a check-in <ArrowRight size={18} /></button>}</div>
      : days.map(day => <section className="history-day" key={day}><h2>{new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2><EntryList entries={visible.filter(entry => localDay(new Date(entry.timestamp)) === day)} onDelete={onDelete} /></section>)}
    {filtered.length > 2 && <div className="page-controls"><button type="button" className="icon-button" aria-label="Newer moments" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={20} /></button><span aria-live="polite">Page {currentPage + 1} of {totalPages}</span><button type="button" className="icon-button" aria-label="Older moments" disabled={currentPage === totalPages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={20} /></button></div>}
  </div>
}
