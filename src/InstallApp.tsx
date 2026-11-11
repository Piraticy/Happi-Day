import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALLED_KEY = 'happi-day:installed'
function rememberedInstall() {
  try { return localStorage.getItem(INSTALLED_KEY) === '1' } catch { return false }
}
function rememberInstall(installed: boolean) {
  try { if (installed) localStorage.setItem(INSTALLED_KEY, '1'); else localStorage.removeItem(INSTALLED_KEY) } catch { /* Installation can still be detected in this window. */ }
}
type RelatedNavigator = Navigator & { getInstalledRelatedApps?: () => Promise<{ platform?: string; id?: string; url?: string }[]> }

export default function InstallApp() {
  const [installed, setInstalled] = useState(() => !!window.matchMedia?.('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone || rememberedInstall())
  const button = useRef<HTMLButtonElement>(null)
  const prompt = useRef<InstallPrompt | null>(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    let revision = 0
    const capture = (event: Event) => { revision++; event.preventDefault(); prompt.current = event as InstallPrompt; rememberInstall(false); setInstalled(false) }
    const complete = () => { revision++; rememberInstall(true); setInstalled(true); prompt.current = null; setHelp(false) }
    const display = window.matchMedia?.('(display-mode: standalone)')
    const checkDisplay = () => { if (display?.matches) complete() }
    const sync = (event: StorageEvent) => { if (event.key === INSTALLED_KEY && event.newValue === '1') complete() }
    async function checkRelated() {
      const requestedAt = revision
      try {
        const apps = await (navigator as RelatedNavigator).getInstalledRelatedApps?.()
        const found = apps?.some(app => {
          if (app.platform !== 'webapp') return false
          try {
            return (!!app.id && new URL(app.id, location.href).href === new URL('/', location.href).href) ||
              (!!app.url && new URL(app.url, location.href).href === new URL('/manifest.webmanifest', location.href).href)
          } catch { return false }
        })
        if (alive && revision === requestedAt && found) complete()
      } catch { /* Unsupported or blocked detection must not block the journal. */ }
    }
    if (display?.matches || (navigator as Navigator & { standalone?: boolean }).standalone) complete()
    void checkRelated()
    window.addEventListener('focus', checkRelated)
    window.addEventListener('storage', sync)
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', complete)
    display?.addEventListener('change', checkDisplay)
    return () => {
      alive = false
      window.removeEventListener('focus', checkRelated)
      window.removeEventListener('storage', sync)
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
      <p>You’ll need an internet connection to save and view your journal.</p>
      <p>After installing, choose Connect existing journal to open your saved moments. Keep your journal open on your other device until you’re connected.</p>
    </section>}
  </div>
}
