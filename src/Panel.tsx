import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    element.querySelector<HTMLButtonElement>('.sheet-header button')?.focus()
    return () => { element.close(); if (previous?.isConnected) previous.focus() }
  }, [])

  return createPortal(<dialog ref={dialog} className="sheet-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="sheet-header" onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
      drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }} onPointerCancel={() => { drag.current = null }} onPointerUp={event => {
      const start = drag.current; drag.current = null
      if (start && start.id === event.pointerId && event.clientY - start.y > 80 && Math.abs(event.clientX - start.x) < 60) onClose()
    }}>
      <span className="sheet-grip" aria-hidden="true" />
      <h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X size={20} /></button>
    </header>
    <div className="sheet-body">{children}</div>
  </dialog>, document.body)
}
