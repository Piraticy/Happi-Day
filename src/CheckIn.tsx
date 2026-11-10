import { useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { makeEntry, MOODS, REASONS } from './model'
import type { Entry, Mood, ScheduleSlot } from './model'
import { MoodFace } from './Icons'

export type SaveResult = boolean | Promise<boolean>
type Props = { slots: ScheduleSlot[]; entries: Entry[]; onSave: (entry: Entry) => SaveResult }

export default function CheckIn({ slots, entries, onSave }: Props) {
  const [mood, setMood] = useState<Mood | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [chosenSlot, setChosenSlot] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const retry = useRef<{ signature: string; entry: Entry } | null>(null)
  const remaining = slots.filter(slot => !entries.some(entry => entry.slotId === slot.id))
  const slotId = chosenSlot ?? remaining[0]?.id ?? ''
  const descriptions: Record<Mood, string> = {
    low: 'You don’t have to put a positive spin on it.',
    down: 'There’s room for the harder moments, too.',
    okay: 'Somewhere in the middle is a feeling, too.',
    good: 'A good moment is worth noticing.',
    great: 'Let’s make a little room for that good feeling.',
  }

  return <form className="checkin-form" aria-busy={saving} onSubmit={async event => {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setSaving(true)
    try {
      if (chosenSlot === null) setChosenSlot(slotId)
      const signature = JSON.stringify([mood, reasons, note, slotId])
      const entry = retry.current?.signature === signature ? retry.current.entry : makeEntry(mood ?? '', reasons, note, slotId)
      retry.current = { signature, entry }
      const result = onSave(entry)
      if (typeof result === 'boolean' ? result : await result) { setMood(null); setReasons([]); setNote(''); setDetailsOpen(false); setChosenSlot(null); setFormError(''); retry.current = null }
    } catch (error) { setFormError((error as Error).message) }
    finally { pending.current = false; setSaving(false) }
  }}>
    <div className="moment-select">
      <label htmlFor="checkin-slot">Checking in for</label>
      <select id="checkin-slot" disabled={saving} value={slotId} onChange={event => setChosenSlot(event.target.value)}>
        {slots.map(slot => <option key={slot.id} value={slot.id}>{slot.label} · {slot.time}{entries.some(entry => entry.slotId === slot.id) ? ' · checked in' : ''}</option>)}
        <option value="">An extra moment</option>
      </select>
    </div>
    <fieldset className="mood-fieldset">
      <legend className="sr-only">How are you feeling?</legend>
      <div className="mood-options">{MOODS.map(item => <label key={item.id} className={`mood-option ${mood === item.id ? 'is-selected' : ''}`}>
        <input type="radio" name="mood" disabled={saving} value={item.id} checked={mood === item.id} onChange={() => setMood(item.id)} />
        <MoodFace mood={item.id} />
        <span>{item.label}</span>
        <span className="mood-tick" aria-hidden="true">{mood === item.id && <Check size={12} />}</span>
      </label>)}</div>
    </fieldset>
    <p className="mood-caption">{mood ? descriptions[mood] : 'Choose the feeling closest to yours.'}</p>
    <button type="button" className="reason-toggle" aria-expanded={detailsOpen} aria-controls="checkin-reasons" disabled={saving} onClick={() => setDetailsOpen(current => !current)}><span>{detailsOpen ? 'Your reason' : reasons.length || note ? 'Edit your reason' : 'Add a reason'} <span>optional</span></span><ChevronDown size={17} /></button>
    {detailsOpen && <fieldset id="checkin-reasons" className="reason-fieldset">
      <legend>What’s behind it? <span>optional</span></legend>
      <div className="reason-options">{REASONS.map(reason => <button type="button" disabled={saving} key={reason} aria-pressed={reasons.includes(reason)} onClick={() => setReasons(current => current.includes(reason) ? current.filter(item => item !== reason) : [...current, reason])}>{reason}</button>)}</div>
      <label className="sr-only" htmlFor="custom-reason">Your own reason</label>
      <textarea id="custom-reason" disabled={saving} placeholder="Or put it in your own words…" maxLength={500} value={note} onChange={event => setNote(event.target.value)} rows={2} />
      <div className="field-footnote"><span>A few words, or none at all.</span><span>{note.length}/500</span></div>
    </fieldset>}
    {formError && <p role="alert" className="error-message">{formError}</p>}
    <button className="primary-button save-checkin" disabled={!mood || saving} type="submit">{saving ? 'Saving…' : 'Save check-in'} <ArrowRight size={20} /></button>
    <p className="save-footnote">No perfect answers. Just a moment for you.</p>
  </form>
}
