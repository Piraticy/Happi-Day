import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has no native dialog top layer; browser checks cover trapping and inertness.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
}
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class TestPointerEvent extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options)
      this.pointerId = options.pointerId ?? 1; this.pointerType = options.pointerType ?? 'mouse'; this.isPrimary = options.isPrimary ?? true
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: TestPointerEvent, configurable: true })
}
