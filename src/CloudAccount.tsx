import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Heart, Mail, RotateCcw, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { Brand, MoodFace } from './Icons'
import JournalApp from './JournalApp'
import SessionRecovery from './SessionRecovery'
import { cloudChanges, cloudRepository, mergeCloudChanges } from './cloud'
import { MOODS, readJournal } from './model'
import type { Journal } from './model'

type CloudState = { owner: string; journal: Journal | null; error: string; loading: boolean }

function callbackError() {
  const url = new URL(window.location.href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (!url.searchParams.has('error') && !fragment.has('error')) return ''
  url.searchParams.delete('error'); url.searchParams.delete('error_code'); url.searchParams.delete('error_description'); url.hash = ''
  window.history.replaceState(null, '', url)
  return 'This sign-in link has expired or is invalid. Request a new link below.'
}

export default function CloudAccount({ client, setupError = '', onDemo }: { client: SupabaseClient | null; setupError?: string; onDemo: () => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(!!client)
  const [authError, setAuthError] = useState(callbackError)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const starting = useRef(false)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cloud, setCloud] = useState<CloudState>({ owner: '', journal: null, error: '', loading: false })
  const [importedFor, setImportedFor] = useState('')
  const [local] = useState(() => { try { return readJournal(localStorage) } catch { return null } })
  const owner = useRef<string | null>(null)
  const epoch = useRef(0)
  const writing = useRef(false)
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
        setCloud({ owner: next?.user.id ?? '', journal: null, error: '', loading: !!next })
      }
      setSession(next); setAuthLoading(false)
    }
    const { data } = client.auth.onAuthStateChange((_event, next) => { receivedEvent = true; accept(next) })
    void client.auth.getSession().then(result => {
      if (!alive || receivedEvent) return
      if (result.error) setAuthError('Your sign-in session couldn’t open. Request a new sign-in link.')
      accept(result.data.session)
    }).catch(() => { if (alive) { setAuthError('Sign-in couldn’t open. Check your connection and try again.'); setAuthLoading(false) } })
    return () => { alive = false; epoch.current++; data.subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(false), 60_000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const refresh = useCallback(async () => {
    if (!repository || !user || writing.current) return
    const request = ++epoch.current
    const id = user.id
    setCloud(current => ({ owner: id, journal: current.owner === id ? current.journal : null, error: '', loading: true }))
    try {
      const journal = await repository.load()
      if (owner.current === id && epoch.current === request) setCloud({ owner: id, journal, error: '', loading: false })
    } catch (error) {
      if (owner.current === id && epoch.current === request) setCloud(current => ({ ...current, loading: false, error: (error as Error).message }))
    }
  }, [repository, user?.id])

  useEffect(() => {
    if (!user) return
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { epoch.current++; window.removeEventListener('focus', onFocus) }
  }, [refresh, user?.id])

  async function signOut() {
    if (!client || writing.current) throw new Error('Wait for the current save to finish before signing out.')
    if (user?.is_anonymous && !window.confirm('End this private session? Without a confirmed recovery email, your username cannot restore this journal after signing out. Cancel to keep access.')) return
    const result = await client.auth.signOut({ scope: 'local' })
    if (result.error) throw new Error('Sign-out didn’t finish. Check your connection and try again.')
    owner.current = null; epoch.current++
    setSession(null); setCloud({ owner: '', journal: null, error: '', loading: false }); setSentTo(''); setEmailMode(false)
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
      await repository.apply(changes)
      if (owner.current !== id || epoch.current !== operation) throw new Error('Your session changed. Sign in and try again.')
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
      await repository.importEntries(local.entries)
      const journal = await repository.load()
      if (owner.current === id && epoch.current === operation) {
        setCloud({ owner: id, journal, error: '', loading: false }); setImportedFor(id)
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
    } catch { setAuthError('Allow browser storage before starting so this device can remember your private session.'); return }
    starting.current = true; setSending(true); setAuthError('')
    try {
      // shortcut: personal preview uses Supabase IP rate limits; add CAPTCHA before broader public use.
      const result = await client.auth.signInAnonymously({ options: { data: { first_name: name } } })
      if (result.error || !result.data.session) throw result.error ?? new Error('No session')
    } catch { setAuthError('We couldn’t start your journal. Check your connection and try again. Your username is still here.') }
    finally { starting.current = false; setSending(false) }
  }

  if (authLoading) return <div className="account-loading"><Brand /><p role="status">Opening your journal…</p></div>

  if (user && (cloud.owner !== user.id || !cloud.journal)) return <div className="recovery-page"><Brand /><div className="recovery-content"><h1>A moment<br />to reconnect.</h1>{cloud.error ? <><p role="alert" className="error-message">{cloud.error}</p><button className="primary-button" onClick={() => { void refresh() }}>Retry loading <RotateCcw size={18} /></button></> : <p role="status">Loading your cloud history…</p>}<button className="text-button" onClick={() => { void signOut().catch(error => setCloud(current => ({ ...current, error: error.message }))) }}>Sign out</button></div></div>

  if (user && cloud.journal && cloud.owner === user.id) return <JournalApp key={user.id} cloud={{
    journal: cloud.journal, identity: user.is_anonymous ? `Session: ${cloud.journal.name}` : user.email ?? cloud.journal.name, busy, refreshing: cloud.loading, error: cloud.error, save, signOut, refresh: () => { void refresh() },
    accountControls: <>{user.is_anonymous && client && <SessionRecovery client={client} callbackError={authError} />}{local?.entries.length && importedFor !== user.id ? <section className="local-import"><h2>Bring your local moments with you?</h2><p>This browser has {local.entries.length} demo {local.entries.length === 1 ? 'entry' : 'entries'}. Import only if they belong to you. They’ll be added to <strong>{user.email || cloud.journal.name}</strong>; the local original stays here.</p><button type="button" disabled={busy} className="text-button" onClick={() => { void importLocal() }}>{busy ? 'Importing…' : 'Import local entries'}</button><button type="button" disabled={busy} className="text-button neutral" onClick={() => setImportedFor(user.id)}>Not now</button></section> : null}</>,
  }} />

  return <div className="welcome-page">
    <section className="welcome-story"><Brand /><div className="welcome-message"><h1>A little pause.<br />{' '}With you, <span>anywhere.</span></h1><p>Your feelings, your rhythm.<br />One journal, wherever the day takes you.</p><div className="welcome-faces" aria-hidden="true">{MOODS.map(mood => <MoodFace key={mood.id} mood={mood.id} />)}</div></div><p className="welcome-signoff"><Heart size={16} /> Small moments. A little more in tune.</p></section>
    <section className="welcome-form-area">{!emailMode ? <form className="welcome-form" onSubmit={startSession}>
      <h2>Your journal.<br /> Your little space.</h2>
      <p>Choose a username. No password or email needed to start.</p>
      <label htmlFor="session-username">Username</label>
      <input id="session-username" autoComplete="nickname" placeholder="What should we call you?" value={username} maxLength={40} required disabled={sending} onChange={event => setUsername(event.target.value)} />
      {(authError || setupError || !client) && <p role="alert" className="error-message">{authError || setupError || 'Cloud storage hasn’t been connected yet. You can still use the local demo.'}</p>}
      <button className="primary-button" type="submit" disabled={!client || sending}>{sending ? 'Opening your journal…' : 'Start my journal'} <ArrowRight size={19} /></button>
      <div className="demo-explanation"><ShieldCheck size={20} /><p>This browser remembers your private session. Saved check-ins go to the cloud. Your username alone cannot restore access on another device or after clearing browser data. Add an optional recovery email inside your journal.</p></div>
      <button type="button" className="text-button" disabled={sending} onClick={() => { setEmailMode(true); setAuthError('') }}>Use an email link instead</button>
      <button type="button" className="text-button demo-switch" disabled={sending} onClick={onDemo}>Try the local demo <ArrowRight size={16} /></button>
    </form> : <form className="welcome-form" onSubmit={async event => {
      event.preventDefault()
      if (!client || sending || cooldown) return
      setSending(true); setAuthError('')
      try {
        const address = email.trim()
        const result = await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: new URL('/', window.location.href).href } })
        if (result.error) throw result.error
        setSentTo(address); setCooldown(true)
      } catch { setAuthError('We couldn’t send your sign-in link. Check the address and your connection, then try again. If this continues, email delivery may need attention.') }
      finally { setSending(false) }
    }}>
      <h2>{sentTo ? 'Check your inbox' : <>Your moments.<br /> On any device.</>}</h2>
      {sentTo ? <p role="status">We sent a sign-in link to <strong>{sentTo}</strong>. Open it to securely enter your journal. You can close this page after opening the link.</p> : <p>Sign in to your journal with an email link. No password needed.</p>}
      <label htmlFor="sign-in-email">Email address</label>
      <input id="sign-in-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required maxLength={254} value={email} disabled={sending} onChange={event => { setEmail(event.target.value); setSentTo('') }} />
      {(authError || setupError || !client) && <p role="alert" className="error-message">{authError || setupError || 'Cloud sign-in hasn’t been connected yet. You can still use the local demo.'}</p>}
      <button className="primary-button" type="submit" disabled={!client || sending || cooldown}>{sending ? 'Sending link…' : sentTo ? 'Send another link' : 'Send sign-in link'} <Mail size={19} /></button>
      {cooldown && <p className="auth-help">You can request another link in a minute.</p>}
      <div className="demo-explanation"><ShieldCheck size={20} /><p>Your account’s mood history is stored privately in the cloud. Signing in won’t upload this browser’s demo entries automatically.</p></div>
      <button type="button" className="text-button demo-switch" onClick={onDemo}>Try the local demo <ArrowRight size={16} /></button>
      <button type="button" className="text-button" disabled={sending} onClick={() => { setEmailMode(false); setAuthError('') }}>Use a username session instead</button>
    </form>}</section>
  </div>
}
