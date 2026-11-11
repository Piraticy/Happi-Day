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
    <p>This browser remembers your private session. Your username alone won’t reopen it after signing out, clearing browser data, or changing devices.</p>
    <p>Optional: confirm a recovery email to open this same journal elsewhere. For now, use your Supabase organization-member email.</p>
    <form aria-busy={sending} onSubmit={async event => {
      event.preventDefault()
      if (sending) return
      setSending(true); setError(''); setSent(false)
      try {
        const result = await keepAppOpenUntil(client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: new URL('/', window.location.href).href }))
        if (result.error) throw result.error
        setSent(true)
      } catch { setError('We couldn’t send the recovery link. Check your address and connection, then try again. Keep using this browser; your journal is unchanged.') }
      finally { setSending(false) }
    }}>
      <label htmlFor="recovery-email">Recovery email</label>
      <input id="recovery-email" type="email" autoComplete="email" maxLength={254} value={email} required disabled={sending} onChange={event => { setEmail(event.target.value); setSent(false) }} />
      <button type="submit" className="text-button" disabled={sending}>{sending ? 'Sending…' : 'Send recovery link'}</button>
      {sent && <p role="status">Check your inbox and confirm the link before signing out or changing devices. Recovery is not ready until you confirm.</p>}
      {(error || callbackError) && <p className="error-message" role="alert">{error || callbackError}</p>}
    </form>
  </details>
}
