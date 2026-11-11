export const STORAGE_KEY = 'happi-day:v1'
export const DEMO_KEY = 'happi-day:demo'
export const MOODS = [
  { id: 'low', label: 'Low', color: '#c9c5e6' },
  { id: 'down', label: 'Down', color: '#bed9df' },
  { id: 'okay', label: 'Okay', color: '#efcf75' },
  { id: 'good', label: 'Good', color: '#c2d7ad' },
  { id: 'great', label: 'Great', color: '#f4ad94' },
] as const
export const REASONS = ['Me time', 'Work', 'Sleep', 'Friends', 'Family', 'Health']
export type Mood = typeof MOODS[number]['id']
export type ScheduleSlot = { id: string; label: string; time: string }
export type Entry = { id: string; mood: Mood; reasons: string[]; note: string; timestamp: string; slotId?: string }
export type Journal = { version: 1; name: string; schedule: ScheduleSlot[]; entries: Entry[] }

export function isJournal(data: unknown): data is Journal {
  return isRecord(data) && data.version === 1 && typeof data.name === 'string' && data.name.length <= 40
    && Array.isArray(data.schedule) && validateSchedule(data.schedule) === null
    && Array.isArray(data.entries) && data.entries.every(isEntry)
    && new Set(data.entries.map(entry => entry.id)).size === data.entries.length
}

export function freshJournal(): Journal {
  return {
    version: 1, name: '', entries: [],
    schedule: [
      { id: 'morning', label: 'Morning', time: '09:00' },
      { id: 'afternoon', label: 'Afternoon', time: '14:00' },
      { id: 'evening', label: 'Evening', time: '20:00' },
    ],
  }
}

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validateSchedule(slots: ScheduleSlot[]): string | null {
  if (slots.length < 3) return 'Keep at least three daily check-ins.'
  if (slots.some(slot => !slot || typeof slot.id !== 'string' || !slot.id || typeof slot.label !== 'string' || !slot.label.trim() || slot.label.length > 30)) return 'Give each check-in a name of 1–30 characters.'
  if (slots.some(slot => typeof slot.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time))) return 'Choose a valid time for every check-in.'
  if (new Set(slots.map(slot => slot.time)).size !== slots.length) return 'Choose a different time for each check-in.'
  if (new Set(slots.map(slot => slot.id)).size !== slots.length) return 'We couldn’t save these times. Close the panel and try again.'
  return null
}

function isMood(value: unknown): value is Mood {
  return MOODS.some(mood => mood.id === value)
}

export function makeEntry(mood: string, reasons: string[], note: string, slotId?: string): Entry {
  if (!isMood(mood)) throw new Error('Choose a mood before saving.')
  if (!reasons.every(reason => REASONS.includes(reason))) throw new Error('Choose a suggested reason or use your own words.')
  if (note.length > 500) throw new Error('Keep your reason to 500 characters.')
  return { id: crypto.randomUUID(), mood, reasons: [...new Set(reasons)], note: note.trim(), timestamp: new Date().toISOString(), ...(slotId ? { slotId } : {}) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEntry(value: unknown): value is Entry {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && !!value.id && isMood(value.mood)
    && Array.isArray(value.reasons) && value.reasons.every(reason => typeof reason === 'string' && REASONS.includes(reason))
    && typeof value.note === 'string' && value.note.length <= 500
    && typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp))
    && new Date(value.timestamp).toISOString() === value.timestamp
    && (value.slotId === undefined || typeof value.slotId === 'string')
}

export function readJournal(storage: Pick<Storage, 'getItem'>): Journal {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return freshJournal()
    const data: unknown = JSON.parse(raw)
    if (!isJournal(data)) {
      throw new Error('Invalid journal')
    }
    return data
  } catch {
    throw new Error('We couldn’t read your saved journal. Your existing data has not been changed.')
  }
}

export function writeJournal(storage: Pick<Storage, 'setItem'>, journal: Journal): void {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(journal)) }
  catch { throw new Error('We couldn’t save here. Allow this site to save data or free up space, then try again.') }
}
