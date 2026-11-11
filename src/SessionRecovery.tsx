import { keepAppOpenUntil } from './appUpdates'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function SessionRecovery({ client, callbackError = '' }: { client: SupabaseClient; callbackError?: string }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  return <details className="session-recovery">
    <summary>Keep this journal accessible</summary>
    <p>Add an email to help you return to your journal.</p>
    <p>Email links are currently limited to the app owner’s team.</p>
    <form aria-busy={sending} onSubmit={async event => {
      event.preventDefault()
      if (sending) return
      setSending(true); setError(''); setSent(false)
      try {
        const result = await keepAppOpenUntil(client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: new URL('/', window.location.href).href }))
        if (result.error) throw result.error
        setSent(true)
      } catch { setError('We couldn’t send the link. Check your email address and try again.') }
      finally { setSending(false) }
    }}>
      <label htmlFor="recovery-email">Recovery email</label>
      <input id="recovery-email" type="email" autoComplete="email" maxLength={254} value={email} required disabled={sending} onChange={event => { setEmail(event.target.value); setSent(false) }} />
      <button type="submit" className="text-button" disabled={sending}>{sending ? 'Sending…' : 'Send recovery link'}</button>
      {sent && <p role="status">Open the email and confirm your address before signing out.</p>}
      {(error || callbackError) && <p className="error-message" role="alert">{error || callbackError}</p>}
    </form>
  </details>
}
