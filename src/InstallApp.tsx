import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallApp() {
  const [installed, setInstalled] = useState(() => !!window.matchMedia?.('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone)
  const button = useRef<HTMLButtonElement>(null)
  const prompt = useRef<InstallPrompt | null>(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); prompt.current = event as InstallPrompt }
    const complete = () => { setInstalled(true); prompt.current = null; setHelp(false) }
    const display = window.matchMedia?.('(display-mode: standalone)')
    const checkDisplay = () => { if (display?.matches) complete() }
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', complete)
    display?.addEventListener('change', checkDisplay)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', complete)
      display?.removeEventListener('change', checkDisplay)
    }
  }, [])

  async function install() {
    if (pending.current) return
    setHelp(true)
    setMessage('')
    const offer = prompt.current
    if (!offer) return
    prompt.current = null
    pending.current = true
    setBusy(true)
    try {
      await offer.prompt()
      const choice = await offer.userChoice
      setMessage(choice.outcome === 'accepted' ? 'Follow your browser to finish installing.' : 'Installation was cancelled. You can keep using your journal here.')
    } catch { setMessage('Couldn’t open the install prompt. You can use your browser’s menu instead.') }
    finally { pending.current = false; setBusy(false) }
  }

  function closeHelp() { setHelp(false); button.current?.focus() }

  if (installed) return null
  return <div className="install-control" onKeyDown={event => { if (event.key === 'Escape') closeHelp() }}>
    <button ref={button} type="button" className="install-button" aria-label="Install app" aria-expanded={help} aria-controls="install-help" disabled={busy} onClick={() => void install()}><Download size={17} /><span>{busy ? 'Opening…' : 'Install app'}</span></button>
    {help && <section id="install-help" className="install-help" aria-label="Install Little moments">
      <div className="section-heading"><h2>Little moments, on your desktop.</h2><button className="icon-button" type="button" aria-label="Close install help" onClick={closeHelp}><X size={18} /></button></div>
      {message && <p role="status">{message}</p>}
      <p>In Chrome or Edge, use the install icon in the address bar, or choose the install option in the browser’s menu. On a Mac, Safari offers File → Add to Dock.</p>
      <p>It opens in its own window. Cloud saves and history need an internet connection.</p>
      <p>Use the same browser profile to keep your session. Safari’s Dock app starts a separate session. To reopen an existing journal there or on another device, confirm a recovery email first.</p>
    </section>}
  </div>
}
