import { describe, expect, it } from 'vitest'
import { dailyLifts, liftCount, LIFTS } from './lifts'
import type { Entry } from './model'

function entry(day: number): Entry {
  return { id: String(day), mood: 'okay', reasons: [], note: '', timestamp: new Date(2026, 10, day, 12).toISOString() }
}

describe('daily little lifts', () => {
  it('starts with one and increases across distinct check-in days, up to three', () => {
    const today = new Date(2026, 10, 10, 12)
    expect(liftCount([], today)).toBe(1)
    expect(liftCount([entry(10), entry(10), entry(11)], today)).toBe(1)
    expect(liftCount([entry(9)], today)).toBe(2)
    expect(liftCount([entry(7), entry(8), entry(9)], today)).toBe(3)
  })
  it('keeps a daily selection stable and rotates at the next local calendar day', () => {
    const morning = new Date(2026, 10, 10, 0, 1)
    const evening = new Date(2026, 10, 10, 23, 59)
    const tomorrow = new Date(2026, 10, 11, 0, 1)
    expect(dailyLifts(morning, 3)).toEqual(dailyLifts(evening, 3))
    expect(dailyLifts(tomorrow, 3).every(item => !dailyLifts(morning, 3).includes(item))).toBe(true)
  })
  it('offers unique alternatives and cycles through a month of suggestions', () => {
    const today = new Date(2026, 10, 10)
    const first = dailyLifts(today, 3)
    const next = dailyLifts(today, 3, 3)
    expect(new Set(next).size).toBe(3)
    expect(next.every(item => !first.includes(item))).toBe(true)
    expect(LIFTS).toHaveLength(31)
    const month = Array.from({ length: 31 }, (_, day) => dailyLifts(new Date(2026, 10, 1 + day), 1)[0].id)
    expect(new Set(month).size).toBe(31)
  })
})
