import { describe, expect, it } from 'vitest'
import { freshJournal, localDay, makeEntry, readJournal, STORAGE_KEY, validateSchedule, writeJournal } from './model'

describe('daily check-in data', () => {
  it('starts empty with three independent, editable times', () => {
    const first = freshJournal()
    expect(first.entries).toEqual([])
    expect(first.schedule.map(slot => slot.time)).toEqual(['09:00', '14:00', '20:00'])
    first.schedule[0].time = '10:00'
    expect(freshJournal().schedule[0].time).toBe('09:00')
  })

  it('groups by local calendar date rather than UTC', () => {
    const local = new Date(2026, 10, 10, 0, 5)
    expect(localDay(local)).toBe('2026-11-10')
    expect(localDay(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09')
  })

  it('accepts additional slots and rejects invalid or duplicate times', () => {
    const slots = [...freshJournal().schedule, { id: 'extra', label: 'After work', time: '17:30' }]
    expect(validateSchedule(slots)).toBeNull()
    expect(validateSchedule(slots.slice(0, 2))).toMatch(/three/i)
    expect(validateSchedule([...slots, { id: 'bad', label: 'Late', time: '25:00' }])).toMatch(/valid time/i)
    expect(validateSchedule([...slots, { id: 'dup', label: 'Duplicate', time: '09:00' }])).toMatch(/different time/i)
  })

  it('creates unique entries, trims notes and validates mood and custom reason', () => {
    const entry = makeEntry('good', ['Work'], '  A useful day  ', 'morning')
    expect(entry.note).toBe('A useful day')
    expect(entry.slotId).toBe('morning')
    expect(entry.id).not.toBe(makeEntry('good', [], '').id)
    expect(() => makeEntry('unknown', [], '')).toThrow(/mood/i)
    expect(() => makeEntry('good', ['Invented'], '')).toThrow(/reason/i)
    expect(() => makeEntry('good', [], 'x'.repeat(501))).toThrow(/500/)
  })

  it('round-trips real entries without inventing history', () => {
    const journal = freshJournal()
    journal.entries.push(makeEntry('okay', [], ''))
    const memory = new Map<string, string>()
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value) } }
    writeJournal(storage, journal)
    expect(readJournal(storage)).toEqual(journal)
    expect(memory.has(STORAGE_KEY)).toBe(true)
  })

  it('does not silently replace corrupt data, unknown versions, or invalid dates', () => {
    for (const value of ['not json', '{"version":99}', JSON.stringify({ ...freshJournal(), entries: [{ id: 'x', mood: 'good', reasons: [], note: '', timestamp: 'invalid' }] })]) {
      expect(() => readJournal({ getItem: () => value })).toThrow(/saved|read/i)
    }
  })

  it('reports unavailable storage and failed saves', () => {
    expect(() => readJournal({ getItem: () => { throw Error('denied') } })).toThrow(/read/i)
    expect(() => writeJournal({ setItem: () => { throw Error('full') } }, freshJournal())).toThrow(/save/i)
  })
})
