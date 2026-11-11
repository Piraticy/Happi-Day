import { keepAppOpenUntil } from './appUpdates'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, MonitorSmartphone, RotateCcw } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Journal } from './model'

type Device = { device_id: string; device_label: string; connected_at: string }
type Code = { code: string; expires_at: string }
export default function DeviceConnections({ client, journal, supported, original }: { client: SupabaseClient; journal: Journal; supported: boolean; original: boolean }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<Code | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(Date.now)
  const pending = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const load = useCallback(async () => {
    const result = await client.rpc('happi_list_devices')
    if (result.error) throw new Error('Connected devices couldn’t load. Try Refresh devices.')
    if (alive.current) setDevices(Array.isArray(result.data) ? result.data : [])
  }, [client])
  useEffect(() => {
    if (open && supported && original) void load().catch(caught => { if (alive.current) setError(caught.message) })
  }, [open, supported, original, load])
  useEffect(() => {
    if (!code) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [code])
  const seconds = code ? Math.max(0, Math.ceil((Date.parse(code.expires_at) - now) / 1000)) : 0

  return <details aria-busy={busy} className="device-connections" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Connect another device</summary>
    {!supported ? <p>Device connection is being enabled. Keep this phone signed in; your existing journal is safe.</p> : !original ? <p>This device is connected to your original journal. To connect another device or remove one, open Journal options on the original phone.</p> : <>
      <p>Open the app on your PC and choose <strong>Connect existing journal</strong>. Generate a code here, then enter it on the PC. It grants access to this journal; keep it private.</p>
      <button type="button" className="text-button" disabled={busy} onClick={async () => {
        if (pending.current) return
        pending.current = true; setBusy(true); setError(''); setCopied(false)
        try {
          const result = await keepAppOpenUntil(client.rpc('happi_create_device_code', { p_display_name: journal.name, p_schedule: journal.schedule }))
          if (result.error || !/^[A-F0-9]{20}$/.test(result.data?.code ?? '') || !Number.isFinite(Date.parse(result.data?.expires_at ?? ''))) throw new Error('A connection code couldn’t be generated. Try again in a moment.')
          if (alive.current) { setNow(Date.now()); setCode(result.data) }
        } catch (caught) { if (alive.current) setError((caught as Error).message) }
        finally { pending.current = false; if (alive.current) setBusy(false) }
      }}><MonitorSmartphone size={17} />{busy ? 'Working…' : code ? 'Generate a new code' : 'Generate connection code'}</button>
      {code && seconds > 0 && <div className="connection-code"><label htmlFor="phone-connection-code">One-use connection code</label><input id="phone-connection-code" readOnly value={code.code.match(/.{4}/g)!.join('-')} onFocus={event => event.target.select()} /><div className="connection-code-footer"><span>Expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span><button type="button" className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(code.code.match(/.{4}/g)!.join('-')); if (alive.current) setCopied(true) } catch { if (alive.current) setError('Select the code and copy it manually.') } }}><Copy size={15} />{copied ? 'Copied' : 'Copy code'}</button></div></div>}
      {code && seconds === 0 && <p role="status">This code expired. Generate a new one.</p>}
      <div className="section-heading"><h3>Connected devices</h3><button type="button" className="text-button" disabled={busy} onClick={() => { setError(''); void load().catch(caught => { if (alive.current) setError(caught.message) }) }}><RotateCcw size={14} />Refresh devices</button></div>
      {devices.length ? <ul className="connected-device-list">{devices.map(device => <li key={device.device_id}><span><strong>{device.device_label}</strong><span>Connected {new Date(device.connected_at).toLocaleDateString()}</span></span><button type="button" className="text-button" disabled={busy} aria-label={`Remove ${device.device_label}`} onClick={async () => {
        if (pending.current) return
        pending.current = true; setBusy(true); setError('')
        try {
          const result = await keepAppOpenUntil(client.rpc('happi_revoke_device', { p_device_id: device.device_id }))
          if (result.error || result.data !== true) throw new Error('This device couldn’t be removed. Refresh devices and try again.')
          await load()
        } catch (caught) { if (alive.current) setError((caught as Error).message) }
        finally { pending.current = false; if (alive.current) setBusy(false) }
      }}>Remove</button></li>)}</ul> : <p>No other devices connected yet. After connecting a PC, choose Refresh devices.</p>}
      <p>Removing a device ends its journal access. Your phone’s history stays in place.</p>
    </>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </details>
}
