import { localDay } from './model'
import type { Entry } from './model'

export const LIFTS = [
  { id: 'notice', theme: 'Take notice', title: 'Find a small detail', text: 'Pause and notice a colour, a sound, or a texture nearby. Give it your attention for a moment.', time: '1 min' },
  { id: 'hello', theme: 'Connect', title: 'Send a little hello', text: 'If it feels right, send someone you trust a simple hello. There’s no need for a long conversation.', time: '2 min' },
  { id: 'stretch', theme: 'Move gently', title: 'Make a little space', text: 'Try a comfortable stretch or change position in a way that suits your body. Stop if anything hurts.', time: '1 min' },
  { id: 'thanks', theme: 'Kindness', title: 'Name a small kindness', text: 'Think of someone who made something easier. You might thank them, or simply notice what their kindness meant.', time: '2 min' },
  { id: 'curious', theme: 'Keep learning', title: 'Follow one small question', text: 'Pick something you’re curious about and learn one new fact. Small discoveries count.', time: '3 min' },
  { id: 'ground', theme: 'Take notice', title: 'Come back to the room', text: 'Notice the support beneath you. Look around and name three things you can see, at your own pace.', time: '1 min' },
  { id: 'listen', theme: 'Connect', title: 'Make room to listen', text: 'Ask someone how their day is going. If you have the energy, listen without trying to solve anything.', time: '3 min' },
  { id: 'walk', theme: 'Move gently', title: 'Take a change of scene', text: 'Take a short walk or move to another spot if you can. Notice one thing you usually pass by.', time: '3 min' },
  { id: 'kindwords', theme: 'Self-kindness', title: 'Borrow a kinder voice', text: 'Think of what you’d say to a friend having your kind of day. Try offering yourself the same gentle words.', time: '1 min' },
  { id: 'draw', theme: 'Keep learning', title: 'Make a tiny sketch', text: 'Draw a nearby object, with no need to make it look good. Let this be a moment of experimenting.', time: '2 min' },
  { id: 'sound', theme: 'Take notice', title: 'Listen a little closer', text: 'Pause your next task and notice a nearby sound. See whether you can hear where it begins and fades.', time: '1 min' },
  { id: 'memory', theme: 'Connect', title: 'Remember a shared moment', text: 'Bring to mind a small moment with someone you feel safe with. You can share the memory if you’d like.', time: '2 min' },
  { id: 'musicmove', theme: 'Move gently', title: 'Move with a song', text: 'Put on a song you enjoy and move in any comfortable way. A little sway or tapping your fingers is enough.', time: '3 min' },
  { id: 'help', theme: 'Kindness', title: 'Offer one small help', text: 'If you have the capacity, offer a small practical kindness to someone. Keep it within your own limits.', time: '2 min' },
  { id: 'word', theme: 'Keep learning', title: 'Meet a new word', text: 'Find a word in a language or subject that interests you. Try using it in a sentence just for yourself.', time: '2 min' },
  { id: 'ordinary', theme: 'Take notice', title: 'Notice an ordinary comfort', text: 'Look for something that feels comfortable or steady right now. It can be as simple as a familiar chair.', time: '1 min' },
  { id: 'plan', theme: 'Connect', title: 'Make a small invitation', text: 'Invite someone you trust to a short chat or a shared activity. Pick something that feels manageable for you.', time: '2 min' },
  { id: 'shoulders', theme: 'Move gently', title: 'Check in with your body', text: 'Notice whether you’d like to adjust your posture or relax your hands. Choose one comfortable change.', time: '1 min' },
  { id: 'enough', theme: 'Self-kindness', title: 'Let one thing be enough', text: 'Name one thing you’ve managed today, however small. Give yourself permission to count it.', time: '1 min' },
  { id: 'try', theme: 'Keep learning', title: 'Try a different way', text: 'Pick a small everyday task and try a new approach. Treat it as an experiment rather than a test.', time: '3 min' },
  { id: 'sky', theme: 'Take notice', title: 'Look a little further', text: 'If there’s a view nearby, pause to notice its shapes or light. A window, a plant, or a photograph works too.', time: '1 min' },
  { id: 'appreciate', theme: 'Connect', title: 'Share something you appreciate', text: 'Tell someone one specific thing you appreciate about them, if that feels comfortable.', time: '2 min' },
  { id: 'break', theme: 'Move gently', title: 'Take a tiny pause', text: 'Step away from your current task for a moment. Move, sit, or rest in a way that feels right for you.', time: '2 min' },
  { id: 'permission', theme: 'Self-kindness', title: 'Make room for this feeling', text: 'Name the feeling you have without asking it to change. You can care for yourself while it’s here.', time: '1 min' },
  { id: 'read', theme: 'Keep learning', title: 'Read for curiosity', text: 'Read a short passage about something you enjoy. Notice one idea you’d like to remember.', time: '3 min' },
  { id: 'hands', theme: 'Take notice', title: 'Notice what you’re holding', text: 'Choose a familiar object and notice its weight, temperature, or texture. Explore it with curiosity.', time: '1 min' },
  { id: 'reach', theme: 'Connect', title: 'Ask for a little company', text: 'If company would help, let someone you trust know. A short message or sitting together can be enough.', time: '2 min' },
  { id: 'reset', theme: 'Move gently', title: 'Choose a comfortable reset', text: 'Notice what your body needs: a change of position, a gentle movement, or a little rest. Choose one.', time: '1 min' },
  { id: 'future', theme: 'Kindness', title: 'Do a favour for later', text: 'Make one small thing easier for your future self, like setting out something you’ll need. Keep it simple.', time: '2 min' },
  { id: 'wonder', theme: 'Keep learning', title: 'Ask “I wonder…”', text: 'Look at something familiar and ask one question about it. You don’t have to find the answer today.', time: '1 min' },
  { id: 'savour', theme: 'Take notice', title: 'Stay with a pleasant moment', text: 'If something pleasant happens today, give it a few extra seconds of attention. There’s no need to search for it.', time: '1 min' },
] as const

export function liftCount(entries: Entry[], now: Date): number {
  const today = localDay(now)
  return Math.min(3, new Set([today, ...entries.map(entry => localDay(new Date(entry.timestamp))).filter(day => day < today)]).size)
}

export function dailyLifts(now: Date, count: number, offset = 0) {
  const calendarDay = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  // A coprime stride gives a shuffled month-long cycle with no adjacent-day repeats.
  return Array.from({ length: count }, (_, index) => LIFTS[((calendarDay * 7 + (offset + index) * 13) % LIFTS.length + LIFTS.length) % LIFTS.length])
}
