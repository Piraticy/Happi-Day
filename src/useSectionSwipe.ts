import { useRef } from 'react'
import type { PointerEvent } from 'react'

export default function useSectionSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      start.current = null
      if (!event.isPrimary || event.pointerType !== 'touch' || (event.target as HTMLElement).closest('form, button, a, input, textarea, select, dialog, summary, [data-no-swipe]')) return
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    },
    onPointerCancel() { start.current = null },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const previous = start.current; start.current = null
      if (!previous || previous.id !== event.pointerId) return
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y
      if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1)
    },
  }
}
