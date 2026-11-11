import { keepAppOpenUntil } from './appUpdates'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MonitorSmartphone } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeDeviceCode(value: string) { return value.replace(/[\s-]/g, '').toUpperCase() }

export default function ConnectJournal({ client, createDeviceClient, onBack }: { client: SupabaseClient | null; createDeviceClient?: () => SupabaseClient; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('My PC')
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const pending = useRef(false)
  const temporary = useRef<SupabaseClient | null>(null)
  const redeemed = useRef(false)

  return <form aria-busy={busy} className="welcome-form connect-form" onSubmit={async event => {
    event.preventDefault()
    if (pending.current || !client || !createDeviceClient) return
    const normalized = normalizeDeviceCode(code)
    if (!redeemed.current && !/^[A-F0-9]{20}$/.test(normalized)) { setError('Enter the complete 20-character code from your phone.'); return }
    if (!label.trim() || label.trim().length > 40) { setError('Name this device using 1–40 characters.'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      if ((await client.auth.getSession()).data.session) throw new Error('Another journal is already open here. Use a fresh browser profile to connect without replacing its session.')
      if (!alive.current) return
      // Keep a failed/expired code from installing a blank anonymous journal in this browser.
      temporary.current ??= createDeviceClient()
      const device = temporary.current
      let session = (await device.auth.getSession()).data.session
      if (!session) {
        const result = await keepAppOpenUntil(device.auth.signInAnonymously({ options: { data: { first_name: label.trim() } } }))
        if (result.error || !result.data.session) throw new Error('We couldn’t start a secure device connection. Check your connection and try again.')
        session = result.data.session
      }
      if (!redeemed.current) {
        const existing = await device.rpc('happi_journal_owner')
        if (existing.error?.code === 'PGRST202') throw new Error('Device connection is not enabled yet. Keep your phone signed in and finish the Supabase setup first.')
        if (existing.error) throw new Error('The device connection couldn’t be checked. Try again in a moment.')
        let connected = typeof existing.data === 'string' && existing.data !== session.user.id
        if (!connected) {
          const result = await keepAppOpenUntil(device.rpc('happi_redeem_device_code', { p_code: normalized, p_device_label: label.trim() }))
          connected = result.data?.ok === true
          if (result.error) {
            // Redemption may have committed before its response was lost. Check this PC's identity.
            const check = await device.rpc('happi_journal_owner')
            connected = !check.error && typeof check.data === 'string' && check.data !== session.user.id
          }
          if (!connected) throw new Error(typeof result.data?.message === 'string' ? result.data.message : 'The connection couldn’t finish. Retry here; your phone’s journal is unchanged.')
        }
        redeemed.current = true
        if (alive.current) setJoined(true)
      }
      if (!alive.current) return
      if ((await client.auth.getSession()).data.session) throw new Error('Another journal opened here while connecting. Keep using it, or use a fresh browser profile for the phone journal.')
      if (!alive.current) return
      // This is the PC's new session, never the phone's access/refresh tokens.
      const result = await keepAppOpenUntil(client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }))
      if (result.error || !result.data.session) throw new Error('This PC was connected, but sign-in couldn’t finish. Keep this page open and choose Finish connecting to retry.')
    } catch (caught) { if (alive.current) setError((caught as Error).message) }
    finally { pending.current = false; if (alive.current) setBusy(false) }
  }}>
    <MonitorSmartphone size={30} strokeWidth={1.5} className="connect-mark" />
    <h2>Your phone’s journal.<br />Here, too.</h2>
    <p>On your phone, open <strong>Journal options → Connect another device</strong> and generate a code. Enter it here to open that same history.</p>
    <label htmlFor="device-code">Connection code</label>
    <input id="device-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-1234-ABCD-1234-ABCD" maxLength={29} disabled={busy || joined} required />
    <label htmlFor="device-name">Name this device</label>
    <input id="device-name" value={label} onChange={event => setLabel(event.target.value)} maxLength={40} disabled={busy || joined} required autoComplete="off" />
    {error && <p className="error-message" role="alert">{error}</p>}
    {!createDeviceClient && <p className="error-message" role="alert">Device connection is unavailable in this preview.</p>}
    <button className="primary-button" type="submit" disabled={busy || !client || !createDeviceClient}>{busy ? 'Connecting…' : joined ? 'Finish connecting' : 'Connect my journal'}<ArrowRight size={19} /></button>
    <p className="auth-help">Codes expire after 10 minutes and work once. Your phone keeps its data and stays signed in. Each device saves to the same cloud journal.</p>
    <button type="button" className="text-button" disabled={busy} onClick={onBack}>Back to journal entry</button>
  </form>
}
