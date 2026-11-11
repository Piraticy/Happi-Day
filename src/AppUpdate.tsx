import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Panel from './Panel'
import { hasPendingAppOperation } from './appUpdates'

export default function AppUpdate({ currentVersion, onUpdate }: { currentVersion: string; onUpdate: () => void }) {
  const [available, setAvailable] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const dismissed = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    let request: AbortController | null = null
    async function check() {
      if (document.visibilityState === 'hidden' || navigator.onLine === false || request) return
      const controller = new AbortController()
      request = controller
      const timeout = window.setTimeout(() => controller.abort(), 10_000)
      try {
        const response = await fetch('/version.json', { cache: 'no-store', credentials: 'omit', signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        if (!alive || controller.signal.aborted || typeof data?.version !== 'string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(data.version)) return
        if (data.version === currentVersion) { setAvailable(null); setOpen(false); return }
        setAvailable(data.version)
        if (dismissed.current !== data.version) setOpen(true)
      } catch { /* An unavailable update check must not interrupt the journal. */ }
      finally { window.clearTimeout(timeout); if (request === controller) request = null }
    }
    void check()
    const timer = window.setInterval(() => { void check() }, 60_000)
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      alive = false
      request?.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', check)
      window.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [currentVersion])

  function later() { dismissed.current = available; setOpen(false); setError('') }
  if (!available) return null
  if (!open) return <button type="button" className="app-update-offer" aria-haspopup="dialog" aria-label="Update available" onClick={() => setOpen(true)}><RefreshCw size={16} />Update available</button>
  return <Panel title="An update is ready" onClose={later}>
    <div className="app-update-content">
      <p>A fresh version of Little moments is ready on this device.</p>
      <p>Save any unfinished check-in or changes before updating. Updating reloads the app; your saved moments and remembered sign-in stay here.</p>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="app-update-actions"><button type="button" className="primary-button" onClick={() => {
        // Existing forms expose pending writes/sign-ins through their accessibility state.
        if (hasPendingAppOperation() || document.querySelector('[aria-busy="true"]')) { setError('A save or sign-in is still finishing. Wait a moment, then try Update now again.'); return }
        onUpdate()
      }}>Update now <RefreshCw size={18} /></button><button type="button" className="text-button" onClick={later}>Later</button></div>
    </div>
  </Panel>
}
