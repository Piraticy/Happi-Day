import { useState } from 'react'
import { ArrowRight, Check, Clock3, Plus, Trash2 } from 'lucide-react'
import { validateSchedule } from './model'
import type { Entry, ScheduleSlot } from './model'
import type { SaveResult } from './CheckIn'

export function DailyRhythm({ slots, entries, onEdit }: { slots: ScheduleSlot[]; entries: Entry[]; onEdit: () => void }) {
  const done = slots.filter(slot => entries.some(entry => entry.slotId === slot.id)).length
  return <section className="daily-rhythm">
    <div className="section-heading"><h2>Your daily rhythm</h2><button type="button" className="text-button" onClick={onEdit}>Edit times <Plus size={14} /></button></div>
    <p className="rhythm-description">{done === slots.length ? 'A little space for you, all through the day.' : `${done} of ${slots.length} planned moments checked in`}</p>
    <ol className="daily-slots">{slots.slice(0, 3).map(slot => {
      const checked = entries.some(entry => entry.slotId === slot.id)
      return <li key={slot.id} className={checked ? 'done' : ''}><span className="slot-marker" aria-hidden="true">{checked ? <Check size={15} /> : <Clock3 size={15} />}</span><span className="slot-label">{slot.label}</span><time>{slot.time}</time><span className="slot-status">{checked ? 'Checked in' : 'Planned'}</span></li>
    })}</ol>
    {slots.length > 3 && <button type="button" className="text-button" onClick={onEdit}>View all {slots.length} times <ArrowRight size={14} /></button>}
    <p className="rhythm-note">Your day doesn’t have to follow a plan. You can always add an extra moment.</p>
  </section>
}

export default function Schedule({ slots, onSave }: { slots: ScheduleSlot[]; onSave: (slots: ScheduleSlot[]) => SaveResult }) {
  const [draft, setDraft] = useState(() => slots.map(slot => ({ ...slot })))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const changed = JSON.stringify(draft) !== JSON.stringify(slots)
  function update(id: string, field: 'label' | 'time', value: string) {
    setSaved(false)
    setDraft(current => current.map(slot => slot.id === id ? { ...slot, [field]: value } : slot))
  }
  function addSlot() {
    let minute = (Number(draft.at(-1)!.time.slice(0, 2)) * 60 + Number(draft.at(-1)!.time.slice(3)) + 60) % 1440
    if (!Number.isFinite(minute)) minute = 720
    let time = ''
    for (let attempt = 0; attempt < 1440; attempt++) {
      time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      if (!draft.some(slot => slot.time === time)) break
      minute = (minute + 1) % 1440
    }
    setDraft(current => [...current, { id: crypto.randomUUID(), label: `Check-in ${current.length + 1}`, time }])
    setSaved(false)
  }
  return <div className="schedule-page">
    <div className="page-intro"><h1>A rhythm that’s yours.</h1><p>Three little pauses to start. Make room for more.</p></div>
    <form className="schedule-form" aria-busy={saving} onSubmit={async event => {
      event.preventDefault()
      if (saving) return
      const validation = validateSchedule(draft)
      if (validation) { setError(validation); return }
      const sorted = draft.map(slot => ({ ...slot, label: slot.label.trim() })).sort((a, b) => a.time.localeCompare(b.time))
      setSaving(true)
      try { const result = onSave(sorted); if (typeof result === 'boolean' ? result : await result) { setDraft(sorted); setError(''); setSaved(true) } }
      finally { setSaving(false) }
    }}>
      <div className="schedule-labels"><span>A moment for you</span><span>Time</span></div>
      <div className="schedule-rows">{draft.map((slot, index) => <div className="schedule-row" key={slot.id}>
        <span className="schedule-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <label className="sr-only" htmlFor={`name-${slot.id}`}>Name for check-in {index + 1}</label>
        <input disabled={saving} id={`name-${slot.id}`} value={slot.label} maxLength={30} required onChange={event => update(slot.id, 'label', event.target.value)} />
        <label className="sr-only" htmlFor={`time-${slot.id}`}>Time for {slot.label}</label>
        <input disabled={saving} id={`time-${slot.id}`} type="time" value={slot.time} required onChange={event => update(slot.id, 'time', event.target.value)} />
        <button type="button" className="icon-button" disabled={saving || draft.length <= 3} aria-label={`Remove ${slot.label}`} title={draft.length <= 3 ? 'Keep at least three daily check-ins' : `Remove ${slot.label}`} onClick={() => { setDraft(current => current.filter(item => item.id !== slot.id)); setSaved(false) }}><Trash2 size={17} /></button>
      </div>)}</div>
      <button disabled={saving} type="button" className="add-time-button" onClick={addSlot}><Plus size={18} /> Add a check-in time</button>
      {error && <p role="alert" className="error-message">{error}</p>}
      {saved && <p role="status" className="inline-success"><Check size={18} /> Your rhythm saved.</p>}
      <div className="schedule-actions"><button disabled={saving} type="submit" className="primary-button">{saving ? 'Saving…' : 'Save rhythm'} <ArrowRight size={18} /></button>{changed && <span className="unsaved-note">Changes aren’t saved yet.</span>}</div>
      <p className="schedule-explanation"><Clock3 size={18} /><span>These times are a personal plan. Notifications aren’t enabled. Extra check-ins are always welcome.</span></p>
    </form>
  </div>
}
