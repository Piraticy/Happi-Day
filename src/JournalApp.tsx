import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SaveResult } from './CheckIn'
import { ArrowRight, BookOpen, Check, Heart, House, LogOut, RotateCcw, ShieldCheck, SlidersHorizontal, Sprout, X } from 'lucide-react'
import CheckIn from './CheckIn'
import Panel from './Panel'
import useSectionSwipe from './useSectionSwipe'
import LittleLifts from './LittleLifts'
import History, { EntryList } from './History'
import Insights from './Insights'
import { Brand, MoodFace } from './Icons'
import { DEMO_KEY, freshJournal, localDay, MOODS, readJournal, writeJournal } from './model'
import type { Entry, Journal } from './model'

type View = 'today' | 'lifts' | 'history'
const pages = [{ id: 'today', label: 'Today', Icon: House }, { id: 'lifts', label: 'Little lifts', Icon: Sprout }, { id: 'history', label: 'History', Icon: BookOpen }] as const

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
  const [panel, setPanel] = useState<'moments' | 'account' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleted, setDeleted] = useState<Entry | null>(null)
  const [now, setNow] = useState(() => new Date())
  const mainRef = useRef<HTMLElement>(null)
  const journal = cloud?.journal ?? loaded.journal ?? freshJournal()
  const todayEntries = journal.entries.filter(entry => localDay(new Date(entry.timestamp)) === localDay(now))


  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 30_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])

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
    mainRef.current?.focus({ preventScroll: true })
  }
  const swipe = useSectionSwipe(direction => {
    const order: View[] = ['today', 'lifts', 'history']
    const next = order[order.indexOf(view) + direction]
    if (next && !panel) navigate(next)
  })

  function removeEntry(entry: Entry) {
    return afterSave(save({ ...journal, entries: journal.entries.filter(item => item.id !== entry.id) }), () => {
      setDeleted(entry); setNotice('Check-in deleted.')
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
      const close = dialogs.item(dialogs.length - 1)?.querySelector<HTMLButtonElement>('.sheet-header button')
      const focusTarget = close ?? mainRef.current
      focusTarget?.focus({ preventScroll: true })
    })
  }

  function leave() {
    setPanel(null)
    if (cloud) { void cloud.signOut().catch(caught => setError((caught as Error).message)); return }
    try { sessionStorage.removeItem(DEMO_KEY) } catch { /* No persisted session to clear. */ }
    setName(journal.name); setActive(false); setError('')
  }

  const operationError = error || cloud?.error
  const errorBanner = operationError && <div className="global-error" role="alert"><p>{operationError}</p>{error && <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={18} /></button>}</div>
  const confirmation = notice && <div className={panel ? 'panel-notice' : 'notice'} role="status"><Check size={18} /><span>{notice}</span>{deleted && <button className="undo-button" onClick={() => {
    void afterSave(save({ ...journal, entries: [...journal.entries, deleted] }), () => { setDeleted(null); setNotice('Check-in restored.') })
  }}>Undo delete</button>}<button className="icon-button" aria-label="Dismiss confirmation" onClick={() => { setNotice(''); setDeleted(null) }}><X size={16} /></button></div>

  if (!loaded.journal) return <div className="recovery-page"><Brand /><div className="recovery-content"><BookOpen size={38} strokeWidth={1.4} /><h1>Your moments<br />are worth keeping.</h1><p role="alert" className="error-message">{loaded.error}</p><p>Your journal hasn’t been changed. Try again when this site can save data.</p><button className="primary-button" onClick={() => setLoaded(load())}>Try again <RotateCcw size={18} /></button></div></div>

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
        <span className="demo-label">Demo</span>
        <p>A moment to notice how you’re doing.<br />No password to remember.</p>
        <label htmlFor="first-name">Your first name</label>
        <input id="first-name" autoComplete="given-name" placeholder="What should we call you?" value={name} onChange={event => setName(event.target.value)} maxLength={40} required />
        {error && <p role="alert" className="error-message">{error}</p>}
        <button className="primary-button" type="submit">Enter demo <ArrowRight size={20} /></button>
        {cloud?.accountControls}
        {onCloudLogin && <button className="text-button" type="button" onClick={onCloudLogin}>Sign in to your journal</button>}
        <div className="demo-explanation"><ShieldCheck size={20} /><p>Demo entries stay in this browser. Anyone using it can see them.</p></div>
        <p className="welcome-return-note">{journal.entries.length ? 'Welcome back. Your saved moments are still here.' : 'Check in whenever you like. Your moments will be here.'}</p>
      </form>
    </section>
  </div>

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to check-in</a>
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Main navigation" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        if (index < 0) return
        event.preventDefault()
        buttons[(index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length].focus()
      }}>{pages.map(({ id, label, Icon }) => <button key={id} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-message"><Heart size={23} strokeWidth={1.4} /><p>Every feeling<br />has a place here.</p></div><span className="sidebar-demo">{cloud ? 'Your journal' : 'Demo · only here'}</span><p className="leave-note">{cloud ? cloud.identity : 'Your moments stay on this browser.'}</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="mobile-brand"><Brand /></div><p className="today-date">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p><button className="account-button" aria-label="Journal options" aria-haspopup="dialog" onClick={() => setPanel('account')}><span>Hey, <strong>{journal.name}</strong></span><span className="profile-initial" aria-hidden="true">{Array.from(journal.name)[0]?.toUpperCase()}</span><SlidersHorizontal className="mobile-options-icon" size={20} /></button></header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        <div className="mobile-meta"><span>{now.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' })}</span><span>{cloud ? 'Your journal' : 'Demo'}</span></div>
        {cloud && <div className="cloud-toolbar" aria-busy={cloud.busy}><span>{cloud.busy ? 'Saving…' : cloud.identity}</span><button type="button" disabled={cloud.busy || cloud.refreshing} className="text-button" onClick={cloud.refresh}>{cloud.refreshing ? 'Refreshing…' : 'Refresh history'}</button></div>}
        {!panel && errorBanner}
        <div className="page-view" role="region" aria-label="Journal pages" {...swipe}>
          <div className="today-layout" hidden={view !== 'today'}>
            <div className="page-intro checkin-intro"><h1>How are you<br />feeling today?</h1><p>A little check-in. A little more in tune.</p></div>
            <aside className="daily-panel"><div className="section-heading"><h2>Today, as it happens</h2></div><p className="rhythm-description">{todayEntries.length ? `${todayEntries.length} ${todayEntries.length === 1 ? 'moment' : 'moments'} saved today` : 'A fresh page for today.'}</p><Insights entries={journal.entries} /><button className="today-moments-button" type="button" aria-haspopup="dialog" onClick={() => setPanel('moments')}><BookOpen size={18} /><span>Today’s moments</span><span className="moment-count">{todayEntries.length}</span><ArrowRight size={16} /></button></aside>
            <CheckIn onSave={entry => afterSave(save({ ...journal, entries: [...journal.entries, entry] }), () => { setNow(new Date()); setNotice('A little moment, saved.'); setDeleted(null) })} />
            <button type="button" className="lift-invitation" onClick={() => navigate('lifts')}><Sprout size={20} /><span>A small idea for your day<span>Discover your daily little lifts</span></span><ArrowRight size={18} /></button>
          </div>
          {view === 'lifts' && <LittleLifts key={localDay(now)} entries={journal.entries} now={now} />}
          {view === 'history' && <History entries={journal.entries} onDelete={removeEntry} onCheckIn={() => navigate('today')} />}
        </div>
      </main>
    </div>
    {panel && <Panel title={panel === 'moments' ? 'Today’s moments' : 'Your journal'} onClose={() => setPanel(null)}>
      {errorBanner}
      {panel === 'moments' && (todayEntries.length ? <EntryList entries={todayEntries} onDelete={removeEntry} /> : <div className="today-empty"><Heart size={24} /><p>A fresh page for today.</p><span>Your first check-in will live here.</span></div>)}
      {panel === 'account' && <><p className="account-summary">{cloud ? cloud.identity : `Demo · ${journal.name}`}</p>{cloud?.accountControls}{onCloudLogin && <button className="text-button" type="button" onClick={onCloudLogin}>Sign in to your journal</button>}<button className="text-button account-leave" disabled={cloud?.busy} onClick={leave}><LogOut size={18} />{cloud ? 'Sign out' : 'Leave demo'}</button></>}
      {confirmation}
    </Panel>}
    {!panel && confirmation}
  </div>
}
