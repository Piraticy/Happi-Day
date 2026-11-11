import { keepAppOpenUntil } from './appUpdates'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Heart, Mail, MonitorSmartphone, RotateCcw } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { Brand, MoodFace } from './Icons'
import JournalApp from './JournalApp'
import SessionRecovery from './SessionRecovery'
import DeviceConnections from './DeviceConnections'
import ConnectJournal from './ConnectJournal'
import { cloudChanges, cloudRepository, mergeCloudChanges } from './cloud'
import { MOODS, readJournal } from './model'
import type { Journal } from './model'

type CloudState = { owner: string; journalOwner: string | null; connections: boolean; journal: Journal | null; error: string; loading: boolean }

function callbackError() {
  const url = new URL(window.location.href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (!url.searchParams.has('error') && !fragment.has('error')) return ''
  url.searchParams.delete('error'); url.searchParams.delete('error_code'); url.searchParams.delete('error_description'); url.hash = ''
  window.history.replaceState(null, '', url)
  return 'This sign-in link has expired or is invalid. Request a new link below.'
}

export default function CloudAccount({ client, createDeviceClient, setupError = '', onDemo }: { client: SupabaseClient | null; createDeviceClient?: () => SupabaseClient; setupError?: string; onDemo: () => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(!!client)
  const [authError, setAuthError] = useState(callbackError)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const starting = useRef(false)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cloud, setCloud] = useState<CloudState>({ owner: '', journalOwner: null, connections: false, journal: null, error: '', loading: false })
  const [importedFor, setImportedFor] = useState('')
  const [local] = useState(() => { try { return readJournal(localStorage) } catch { return null } })
  const owner = useRef<string | null>(null)
  const epoch = useRef(0)
  const writing = useRef(false)
  const reading = useRef<number | null>(null)
  const user = session?.user
  const repository = useMemo(() => client && user ? cloudRepository(client, user) : null, [client, user?.id, user?.email])

  useEffect(() => {
    if (!client) return
    let alive = true
    let receivedEvent = false
    const accept = (next: Session | null) => {
      if (!alive) return
      if (owner.current !== (next?.user.id ?? null)) {
        owner.current = next?.user.id ?? null
        epoch.current++; writing.current = false; setBusy(false)
        setCloud({ owner: next?.user.id ?? '', journalOwner: null, connections: false, journal: null, error: '', loading: !!next })
      }
      setSession(next); setAuthLoading(false)
    }
    const { data } = client.auth.onAuthStateChange((_event, next) => { receivedEvent = true; accept(next) })
    void client.auth.getSession().then(result => {
      if (!alive || receivedEvent) return
      if (result.error) setAuthError('We couldn’t sign you in. Request a new email link.')
      accept(result.data.session)
    }).catch(() => { if (alive) { setAuthError('We couldn’t sign you in. Check your internet connection and try again.'); setAuthLoading(false) } })
    return () => { alive = false; epoch.current++; data.subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(false), 60_000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const refresh = useCallback(async (quiet = false) => {
    if (!repository || !user || writing.current || reading.current === epoch.current) return
    const request = ++epoch.current
    reading.current = request
    const id = user.id
    if (!quiet) setCloud(current => ({ owner: id, journalOwner: current.owner === id ? current.journalOwner : null, connections: current.owner === id && current.connections, journal: current.owner === id ? current.journal : null, error: '', loading: true }))
    try {
      const loaded = await repository.load()
      if (owner.current === id && epoch.current === request) setCloud({ owner: id, journal: loaded.journal, journalOwner: loaded.ownerId, connections: loaded.connections, error: '', loading: false })
    } catch (error) {
      if (owner.current === id && epoch.current === request) setCloud(current => ({ ...current, loading: false, error: (error as Error).message }))
    } finally { if (reading.current === request) reading.current = null }
  }, [repository, user?.id])

  useEffect(() => {
    if (!user) return
    void refresh()
    const sync = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void refresh(true)
    }
    // shortcut: poll existing access-checked reads; use realtime if journal size or traffic grows.
    const timer = window.setInterval(sync, 15_000)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      epoch.current++
      window.clearInterval(timer)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [refresh, user?.id])

  async function signOut() {
    if (!client || writing.current) throw new Error('Wait for the current save to finish before signing out.')
    if (user?.is_anonymous && !window.confirm('Sign out? You may lose access to this journal unless you’ve confirmed a recovery email. Cancel to keep it open.')) return
    const result = await keepAppOpenUntil(client.auth.signOut({ scope: 'local' }))
    if (result.error) throw new Error('Sign-out didn’t finish. Check your connection and try again.')
    owner.current = null; epoch.current++
    setSession(null); setCloud({ owner: '', journalOwner: null, connections: false, journal: null, error: '', loading: false }); setSentTo(''); setEmailMode(false); setConnectMode(false)
  }

  async function save(before: Journal, next: Journal) {
    if (!repository || !user || owner.current !== user.id) throw new Error('Sign in again before saving your mood.')
    if (writing.current) throw new Error('Another change is still saving. Try again in a moment.')
    const id = user.id
    const operation = ++epoch.current
    writing.current = true; setBusy(true)
    setCloud(current => ({ ...current, loading: false }))
    const changes = cloudChanges(before, next)
    try {
      if (!cloud.journalOwner) throw new Error('Refresh history before saving.')
      await keepAppOpenUntil(repository.apply(changes, cloud.journalOwner))
      if (owner.current !== id || epoch.current !== operation) throw new Error('Please sign in again before saving.')
      setCloud(current => current.owner === id && current.journal ? { ...current, journal: mergeCloudChanges(current.journal, changes), error: '', loading: false } : current)
    } finally {
      if (owner.current === id) { writing.current = false; setBusy(false) }
    }
  }

  async function importLocal() {
    if (!repository || !user || !local?.entries.length || writing.current) return
    const id = user.id
    const operation = ++epoch.current
    writing.current = true; setBusy(true)
    setCloud(current => ({ ...current, loading: false }))
    try {
      if (!cloud.journalOwner) throw new Error('Refresh history before importing.')
      await keepAppOpenUntil(repository.importEntries(local.entries, cloud.journalOwner))
      const loaded = await repository.load()
      if (owner.current === id && epoch.current === operation) {
        setCloud({ owner: id, journal: loaded.journal, journalOwner: loaded.ownerId, connections: loaded.connections, error: '', loading: false }); setImportedFor(id)
      }
    } catch (error) {
      if (owner.current === id) setCloud(current => ({ ...current, error: (error as Error).message }))
    } finally { if (owner.current === id) { writing.current = false; setBusy(false) } }
  }

  async function startSession(event: FormEvent) {
    event.preventDefault()
    if (!client || starting.current) return
    const name = username.trim()
    if (!name || name.length > 40) { setAuthError('Choose a username of 1–40 characters.'); return }
    try {
      const key = `happi-day:storage-check:${crypto.randomUUID()}`
      localStorage.setItem(key, '1'); localStorage.removeItem(key)
    } catch { setAuthError('Allow this site to save data, then try again.'); return }
    starting.current = true; setSending(true); setAuthError('')
    try {
      // shortcut: personal preview uses Supabase IP rate limits; add CAPTCHA before broader public use.
      const result = await keepAppOpenUntil(client.auth.signInAnonymously({ options: { data: { first_name: name } } }))
      if (result.error || !result.data.session) throw result.error ?? new Error('No session')
    } catch { setAuthError('We couldn’t start your journal. Check your internet connection and try again.') }
    finally { starting.current = false; setSending(false) }
  }

  if (authLoading) return <div className="account-loading"><Brand /><p role="status">Opening your journal…</p></div>

  if (user && (cloud.owner !== user.id || !cloud.journal)) return <div className="recovery-page"><Brand /><div className="recovery-content"><h1>A moment<br />to reconnect.</h1>{cloud.error ? <><p role="alert" className="error-message">{cloud.error}</p><button className="primary-button" onClick={() => { void refresh() }}>Retry loading <RotateCcw size={18} /></button></> : <p role="status">Opening your journal…</p>}<button className="text-button" onClick={() => { void signOut().catch(error => setCloud(current => ({ ...current, error: error.message }))) }}>Sign out</button></div></div>

  if (user && cloud.journal && cloud.owner === user.id) return <JournalApp key={`${user.id}:${cloud.journalOwner}`} cloud={{
    journal: cloud.journal, identity: cloud.journalOwner !== user.id ? `Connected: ${cloud.journal.name}` : user.is_anonymous ? cloud.journal.name : user.email ?? cloud.journal.name, busy, refreshing: cloud.loading, error: cloud.error, save, signOut, refresh: () => { void refresh() },
    accountControls: <><DeviceConnections client={client!} journal={cloud.journal} supported={cloud.connections} original={cloud.journalOwner === user.id} />{user.is_anonymous && client && <SessionRecovery client={client} callbackError={authError} />}{local?.entries.length && importedFor !== user.id ? <section className="local-import"><h2>Keep your demo moments?</h2><p>Add {local.entries.length} demo {local.entries.length === 1 ? 'entry' : 'entries'} to <strong>{user.email || cloud.journal.name}</strong>? Only add your own moments. Your demo stays here.</p><button type="button" disabled={busy} className="text-button" onClick={() => { void importLocal() }}>{busy ? 'Adding…' : 'Add demo entries'}</button><button type="button" disabled={busy} className="text-button neutral" onClick={() => setImportedFor(user.id)}>Not now</button></section> : null}</>,
  }} />

  return <div className="welcome-page">
    <section className="welcome-story"><Brand /><div className="welcome-message"><h1>A little pause.<br />{' '}With you, <span>anywhere.</span></h1><p>Your feelings, your rhythm.<br />One journal, wherever the day takes you.</p><div className="welcome-faces" aria-hidden="true">{MOODS.map(mood => <MoodFace key={mood.id} mood={mood.id} />)}</div></div><p className="welcome-signoff"><Heart size={16} /> Small moments. A little more in tune.</p></section>
    <section className="welcome-form-area">{connectMode ? <ConnectJournal client={client} createDeviceClient={createDeviceClient} onBack={() => setConnectMode(false)} /> : !emailMode ? <form className="welcome-form" aria-busy={sending} onSubmit={startSession}>
      <h2>Your journal.<br /> Your little space.</h2>
      <p>Choose a username to start, or open an existing journal.</p>
      <button type="button" className="connect-existing" disabled={sending} onClick={() => { setConnectMode(true); setAuthError('') }}><MonitorSmartphone size={19} />Connect existing journal <ArrowRight size={17} /></button>
      <label htmlFor="session-username">Username</label>
      <input id="session-username" autoComplete="nickname" placeholder="What should we call you?" value={username} maxLength={40} required disabled={sending} onChange={event => setUsername(event.target.value)} />
      {(authError || setupError || !client) && <p role="alert" className="error-message">{authError || setupError || 'Sign-in is unavailable. You can still try the demo.'}</p>}
      <button className="primary-button" type="submit" disabled={!client || sending}>{sending ? 'Opening your journal…' : 'Start my journal'} <ArrowRight size={19} /></button>

      <button type="button" className="text-button" disabled={sending} onClick={() => { setEmailMode(true); setAuthError('') }}>Use an email link instead</button>
      <button type="button" className="text-button demo-switch" disabled={sending} onClick={onDemo}>Try the demo <ArrowRight size={16} /></button>
    </form> : <form className="welcome-form" aria-busy={sending} onSubmit={async event => {
      event.preventDefault()
      if (!client || sending || cooldown) return
      setSending(true); setAuthError('')
      try {
        const address = email.trim()
        const result = await keepAppOpenUntil(client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false, emailRedirectTo: new URL('/', window.location.href).href } }))
        if (result.error) throw result.error
        setSentTo(address); setCooldown(true)
      } catch { setAuthError('We couldn’t send the link. Check your email address and try again.') }
      finally { setSending(false) }
    }}>
      <h2>{sentTo ? 'Check your inbox' : <>Your moments.<br /> On any device.</>}</h2>
      {sentTo ? <p role="status">We sent a sign-in link to <strong>{sentTo}</strong>. Open it to securely enter your journal. You can close this page after opening the link.</p> : <p>Get a sign-in link by email. Email links are currently limited to the app owner’s team.</p>}
      <label htmlFor="sign-in-email">Email address</label>
      <input id="sign-in-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required maxLength={254} value={email} disabled={sending} onChange={event => { setEmail(event.target.value); setSentTo('') }} />
      {(authError || setupError || !client) && <p role="alert" className="error-message">{authError || setupError || 'Sign-in is unavailable. You can still try the demo.'}</p>}
      <button className="primary-button" type="submit" disabled={!client || sending || cooldown}>{sending ? 'Sending link…' : sentTo ? 'Send another link' : 'Send sign-in link'} <Mail size={19} /></button>
      {cooldown && <p className="auth-help">You can request another link in a minute.</p>}

      <button type="button" className="text-button demo-switch" onClick={onDemo}>Try the demo <ArrowRight size={16} /></button>
      <button type="button" className="text-button" disabled={sending} onClick={() => { setEmailMode(false); setAuthError('') }}>Start with a username</button>
    </form>}</section>
  </div>
}
