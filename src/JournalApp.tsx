import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SaveResult } from './CheckIn'
import { ArrowRight, BookOpen, Check, Clock3, Heart, House, LogOut, RotateCcw, ShieldCheck, Sprout, X } from 'lucide-react'
import CheckIn from './CheckIn'
import LittleLifts from './LittleLifts'
import History, { EntryList } from './History'
import Schedule, { DailyRhythm } from './Schedule'
import { Brand, MoodFace } from './Icons'
import { DEMO_KEY, freshJournal, localDay, MOODS, readJournal, writeJournal } from './model'
import type { Entry, Journal } from './model'

type View = 'today' | 'lifts' | 'history' | 'rhythm'
const pages = [{ id: 'today', label: 'Today', Icon: House }, { id: 'lifts', label: 'Little lifts', Icon: Sprout }, { id: 'history', label: 'History', Icon: BookOpen }, { id: 'rhythm', label: 'Your rhythm', Icon: Clock3 }] as const

function load(): { journal: Journal | null; error: string } {
  try { return { journal: readJournal(window.localStorage), error: '' } }
  catch (error) { return { journal: null, error: (error as Error).message } }
}

export type CloudView = {
  journal: Journal; identity: string; busy: boolean; refreshing: boolean; error: string;
  save: (before: Journal, next: Journal) => Promise<void>;
  signOut: () => Promise<void>; refresh: () => void; accountControls: ReactNode;
}

function afterSave(result: SaveResult, done: () => void): SaveResult {
  if (typeof result === 'boolean') { if (result) done(); return result }
  return result.then(saved => { if (saved) done(); return saved })
}

export default function JournalApp({ cloud, onCloudLogin }: { cloud?: CloudView; onCloudLogin?: () => void }) {
  const [loaded, setLoaded] = useState(() => cloud ? { journal: cloud.journal, error: '' } : load())
  const [active, setActive] = useState(() => {
    try { return !!cloud || sessionStorage.getItem(DEMO_KEY) === 'active' } catch { return !!cloud }
  })
  const [name, setName] = useState(loaded.journal?.name ?? '')
  const [view, setView] = useState<View>('today')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleted, setDeleted] = useState<Entry | null>(null)
  const [now, setNow] = useState(() => new Date())
  const mainRef = useRef<HTMLElement>(null)
  const momentsRef = useRef<HTMLDetailsElement>(null)
  const journal = cloud?.journal ?? loaded.journal ?? freshJournal()
  const todayEntries = journal.entries.filter(entry => localDay(new Date(entry.timestamp)) === localDay(now))

  const plannedDone = journal.schedule.filter(slot => todayEntries.some(entry => entry.slotId === slot.id)).length

  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 30_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 1001px)')
    if (!desktop) return
    const update = () => { if (momentsRef.current) momentsRef.current.open = desktop.matches }
    update()
    desktop.addEventListener('change', update)
    return () => desktop.removeEventListener('change', update)
  }, [view, active])

  useEffect(() => {
    if (cloud) return
    function sync(event: StorageEvent) {
      if (event.storageArea === localStorage) setLoaded(load())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [!!cloud])

  function save(next: Journal): SaveResult {
    if (cloud) return cloud.save(journal, next).then(() => { setError(''); return true }).catch(caught => { setError((caught as Error).message); return false })
    if (!loaded.journal) return false
    try {
      // shortcut: browser storage is the demo's only data store; add authenticated storage before real accounts.
      writeJournal(window.localStorage, next)
      setLoaded({ journal: next, error: '' })
      setError('')
      return true
    } catch (caught) { setError((caught as Error).message); return false }
  }

  function navigate(next: View) {
    setView(next)
    setError('')
    mainRef.current?.focus()
    mainRef.current?.scrollIntoView?.({ block: 'start' })
  }

  function removeEntry(entry: Entry) {
    return afterSave(save({ ...journal, entries: journal.entries.filter(item => item.id !== entry.id) }), () => {
      setDeleted(entry); setNotice('Check-in deleted.'); mainRef.current?.focus()
    })
  }

  function leave() {
    if (cloud) { void cloud.signOut().catch(caught => setError((caught as Error).message)); return }
    try { sessionStorage.removeItem(DEMO_KEY) } catch { /* No persisted session to clear. */ }
    setName(journal.name); setActive(false); setError('')
  }

  if (!loaded.journal) return <div className="recovery-page"><Brand /><div className="recovery-content"><BookOpen size={38} strokeWidth={1.4} /><h1>Your moments<br />are worth keeping.</h1><p role="alert" className="error-message">{loaded.error}</p><p>We’ve paused changes to protect your journal. If browser storage is blocked, allow it and try again.</p><button className="primary-button" onClick={() => setLoaded(load())}>Try again <RotateCcw size={18} /></button></div></div>

  if (!active) return <div className="welcome-page">
    <section className="welcome-story">
      <Brand />
      <div className="welcome-message"><h1>A little pause.<br />{' '}A little more <span>you.</span></h1><p>Life is a mix of feelings.<br />Make a little space for yours.</p><div className="welcome-faces" aria-hidden="true">{MOODS.map(mood => <MoodFace key={mood.id} mood={mood.id} />)}</div></div>
      <p className="welcome-signoff"><Heart size={16} /> Small moments. A little more in tune.</p>
    </section>
    <section className="welcome-form-area">
      <form className="welcome-form" onSubmit={event => {
        event.preventDefault()
        if (!name.trim()) { setError('Add your first name to enter the demo.'); return }
        if (save({ ...journal, name: name.trim() })) {
          try { sessionStorage.setItem(DEMO_KEY, 'active') } catch { /* The demo can run even if session storage is disabled. */ }
          setActive(true); setView('today'); setNotice(''); setDeleted(null)
        }
      }}>
        <h2>Your day.<br /> Your space.</h2>
        <span className="demo-label">Local demo</span>
        <p>A moment to notice how you’re doing.<br />No password to remember.</p>
        <label htmlFor="first-name">Your first name</label>
        <input id="first-name" autoComplete="given-name" placeholder="What should we call you?" value={name} onChange={event => setName(event.target.value)} maxLength={40} required />
        {error && <p role="alert" className="error-message">{error}</p>}
        <button className="primary-button" type="submit">Enter demo <ArrowRight size={20} /></button>
        {cloud?.accountControls}
        {onCloudLogin && <button className="text-button" type="button" onClick={onCloudLogin}>Sign in to sync across devices</button>}
        <div className="demo-explanation"><ShieldCheck size={20} /><p>This is a local preview, not a real account. Your name and mood entries stay on this browser. Anyone using this browser can access them.</p></div>
        <p className="welcome-return-note">{journal.entries.length ? 'Welcome back. Your saved moments are still here.' : 'Start with three daily check-ins. Add more whenever you need.'}</p>
      </form>
    </section>
  </div>

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to check-in</a>
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Main navigation">{pages.map(({ id, label, Icon }) => <button key={id} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-message"><Heart size={23} strokeWidth={1.4} /><p>Every feeling<br />has a place here.</p></div><span className="sidebar-demo">{cloud ? 'Personal cloud journal' : 'Local demo · this browser only'}</span><p className="leave-note">{cloud ? cloud.identity : 'Leaving keeps your saved entries.'}</p><button className="leave-button" disabled={cloud?.busy} onClick={leave}><LogOut size={18} /><span>{cloud ? 'Sign out' : 'Leave demo'}</span></button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="mobile-brand"><Brand /></div><p className="today-date">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p><div className="profile"><span>Hey, <strong>{journal.name}</strong></span><span className="profile-initial" aria-hidden="true">{Array.from(journal.name)[0]?.toUpperCase()}</span></div></header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        <div className="mobile-meta"><span>{now.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' })}</span><span>{cloud ? 'Cloud journal' : 'Local demo'}</span></div>
        {cloud && <div className="cloud-toolbar"><span>{cloud.busy ? 'Saving to cloud…' : 'Cloud history'} · {cloud.identity}</span><button type="button" disabled={cloud.busy || cloud.refreshing} className="text-button" onClick={cloud.refresh}>{cloud.refreshing ? 'Refreshing…' : 'Refresh history'}</button></div>}
        {cloud?.error && <p className="error-message" role="alert">{cloud.error}</p>}
        {error && <div className="global-error" role="alert"><p>{error}</p><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={18} /></button></div>}
        {view === 'today' && <div className="today-layout">
          <div className="page-intro checkin-intro"><h1>How are you<br />feeling today?</h1><p>A little check-in. A little more in tune.</p></div>
          <aside className="daily-panel">
            <DailyRhythm slots={journal.schedule} entries={todayEntries} onEdit={() => navigate('rhythm')} />
            <details className="today-moments" ref={momentsRef}><summary><span>Today’s moments</span><span className="moment-count">{todayEntries.length}</span></summary>
              {todayEntries.length ? <EntryList entries={todayEntries} onDelete={removeEntry} compact /> : <div className="today-empty"><span className="empty-mark" aria-hidden="true"><Heart size={24} strokeWidth={1.3} /></span><p>A fresh page for today.</p><span>Your first check-in will live here.</span></div>}
            </details>
          </aside>
          <button type="button" className="mobile-rhythm text-button" onClick={() => navigate('rhythm')}>{plannedDone} of {journal.schedule.length} planned check-ins <span>View times <ArrowRight size={14} /></span></button>
          <CheckIn slots={journal.schedule} entries={todayEntries} onSave={entry => {
            return afterSave(save({ ...journal, entries: [...journal.entries, entry] }), () => { setNow(new Date()); setNotice('A little moment, saved.'); setDeleted(null) })
          }} />
          <button type="button" className="lift-invitation" onClick={() => navigate('lifts')}><Sprout size={20} /><span>A small idea for your day<span>Discover your daily little lifts</span></span><ArrowRight size={18} /></button>
        </div>}
        {view === 'lifts' && <LittleLifts key={localDay(now)} entries={journal.entries} now={now} />}
        {view === 'history' && <History entries={journal.entries} onDelete={removeEntry} onCheckIn={() => navigate('today')} />}
        {view === 'rhythm' && <Schedule slots={journal.schedule} onSave={slots => save({ ...journal, schedule: slots })} />}
        {cloud?.accountControls}
        {onCloudLogin && <button className="text-button" type="button" onClick={onCloudLogin}>Sign in to sync across devices</button>}
      </main>
      <footer className="workspace-footer"><span>Little check-ins. A little more you.</span><span>{cloud ? 'Stored in your cloud account' : 'Saved on this browser'}</span></footer>
    </div>
    {notice && <div className="notice" role="status"><Check size={18} /><span>{notice}</span>{deleted && <button className="undo-button" onClick={() => {
      void afterSave(save({ ...journal, entries: [...journal.entries, deleted] }), () => { setDeleted(null); setNotice('Check-in restored.') })
    }}>Undo delete</button>}<button className="icon-button" aria-label="Dismiss confirmation" onClick={() => { setNotice(''); setDeleted(null) }}><X size={16} /></button></div>}
  </div>
}
