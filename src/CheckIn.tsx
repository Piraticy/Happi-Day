import { useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { makeEntry, MOODS, REASONS } from './model'
import type { Entry, Mood } from './model'
import Panel from './Panel'
import { MoodFace } from './Icons'

export type SaveResult = boolean | Promise<boolean>
type Props = { onSave: (entry: Entry) => SaveResult }
const REASON_PROMPTS = ['Weather', 'Money', 'Movement', 'Food', 'Study', 'Travel', 'Home', 'Relationships', 'Music', 'A small win']

export default function CheckIn({ onSave }: Props) {
  const [mood, setMood] = useState<Mood | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const retry = useRef<{ signature: string; entry: Entry } | null>(null)
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
      const signature = JSON.stringify([mood, reasons, note])
      const entry = retry.current?.signature === signature ? retry.current.entry : makeEntry(mood ?? '', reasons, note)
      retry.current = { signature, entry }
      const result = onSave(entry)
      if (typeof result === 'boolean' ? result : await result) { setMood(null); setReasons([]); setNote(''); setDetailsOpen(false); setFormError(''); retry.current = null }
    } catch (error) { setFormError((error as Error).message) }
    finally { pending.current = false; setSaving(false) }
  }}>
    <p className="moment-time">Check in anytime. We’ll remember when.</p>
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
    {detailsOpen && <Panel title="Your reason" onClose={() => setDetailsOpen(false)}><fieldset id="checkin-reasons" className="reason-fieldset">
      <legend>What’s behind it? <span>optional</span></legend>
      <div className="reason-options">{REASONS.map(reason => <button type="button" disabled={saving} key={reason} aria-pressed={reasons.includes(reason)} onClick={() => setReasons(current => current.includes(reason) ? current.filter(item => item !== reason) : [...current, reason])}>{reason}</button>)}</div>
      <p className="reason-prompt-label">More ideas for your own words <span>Swipe for more</span></p>
      <div className="reason-prompts" role="group" aria-label="More reason ideas, scroll sideways">{REASON_PROMPTS.map(prompt => { const selected = note.toLowerCase().split(/,\s*/).includes(prompt.toLowerCase()); return <button type="button" disabled={saving || selected} aria-pressed={selected} key={prompt} onClick={() => setNote(current => {
        if (current.toLowerCase().split(/,\s*/).includes(prompt.toLowerCase())) return current
        const next = current.trim() ? `${current.trim()}, ${prompt.toLowerCase()}` : prompt
        return next.length <= 500 ? next : current
      })}>{prompt}</button> })}</div>
      <label className="sr-only" htmlFor="custom-reason">Your own reason</label>
      <textarea id="custom-reason" disabled={saving} placeholder="Or put it in your own words…" maxLength={500} value={note} onChange={event => setNote(event.target.value)} rows={2} />
      <div className="field-footnote"><span>A few words, or none at all.</span><span>{note.length}/500</span></div>
    </fieldset><button type="button" className="primary-button reason-done" onClick={() => setDetailsOpen(false)}>Done <Check size={18} /></button></Panel>}
    {formError && <p role="alert" className="error-message">{formError}</p>}
    <button className="primary-button save-checkin" disabled={!mood || saving} type="submit">{saving ? 'Saving…' : 'Save this moment'} <ArrowRight size={20} /></button>
    <p className="save-footnote">No perfect answers. Just a moment for you.</p>
  </form>
}
