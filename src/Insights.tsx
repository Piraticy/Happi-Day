import { MOODS } from './model'
import type { Entry } from './model'

export default function Insights({ entries }: { entries: Entry[] }) {
  const recent = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30)
  if (!recent.length) return <section className="insights"><h2>Your patterns</h2><p>Your first few moments will help you spot patterns over time.</p></section>
  const counts = MOODS.map(mood => ({ ...mood, count: recent.filter(entry => entry.mood === mood.id).length }))
  const common = [...counts].sort((a, b) => b.count - a.count)[0]
  const reasons = recent.flatMap(entry => entry.reasons)
  const frequentReason = [...new Set(reasons)].sort((a, b) => reasons.filter(reason => reason === b).length - reasons.filter(reason => reason === a).length)[0]
  return <section className="insights" aria-label="Mood insights"><h2>Your patterns</h2><p>In your last {recent.length} {recent.length === 1 ? 'moment' : 'moments'}, <strong>{common.label}</strong> appeared most often ({common.count}).{frequentReason ? ` You selected “${frequentReason}” most often as a reason.` : ''}</p><div className="insight-bars">{counts.map(mood => <div key={mood.id}><span>{mood.label}</span><meter min="0" max={recent.length} value={mood.count} aria-label={`${mood.label}: ${mood.count} of ${recent.length}`} /><span>{mood.count}</span></div>)}</div><p className="insight-note">These are patterns in what you recorded, not explanations of why you felt that way. If it suits you, try a small connection, movement, or noticing activity in Little lifts.</p></section>
}
