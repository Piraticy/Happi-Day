import { MOODS } from './model'
import type { Mood } from './model'

export function Brand() {
  return <span className="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1l3 7 7-2-2 7 7 3-7 3 2 7-7-2-3 7-3-7-7 2 2-7-7-3 7-3-2-7 7 2z" fill="currentColor" /><path d="M11 14v2m10-2v2m-9 4q4 4 8 0" fill="none" stroke="var(--logo-face)" strokeWidth="1.7" strokeLinecap="round" /></svg>happi-day<span className="brand-dot">.</span></span>
}

export function MoodFace({ mood, className = '' }: { mood: Mood; className?: string }) {
  const definition = MOODS.find(item => item.id === mood)!
  const mouths: Record<Mood, string> = {
    low: 'M18 36Q28 25 38 36', down: 'M19 34Q28 28 37 34',
    okay: 'M19 32H37', good: 'M18 29Q28 40 38 29', great: 'M17 28Q28 46 39 28Z',
  }
  return <svg className={`mood-face ${className}`} viewBox="0 0 56 56" aria-hidden="true">
    <circle cx="28" cy="28" r="26" fill={definition.color} />
    <g fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d={mood === 'great' ? 'M17 21q3-5 6 0m10 0q3-5 6 0' : 'M20 20v3m16-3v3'} />
      <path d={mouths[mood]} />
    </g>
  </svg>
}
