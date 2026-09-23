import { ACTIVE_STATUSES, WORKFLOW } from '../constants'

export const isActive = (incident) => ACTIVE_STATUSES.has(incident.status)

/** Format a decimal hour (13.5) as "13:30". */
export function formatHour(hour) {
  const h = String(Math.floor(hour)).padStart(2, '0')
  const m = String(Math.round((hour % 1) * 60)).padStart(2, '0')
  return `${h}:${m}`
}

/** Current local time as a decimal hour. */
export function nowHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60
}

/** "38m", "3h", "2d" since an ISO timestamp. */
export function timeAgo(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / (60 * 24))}d`
}

/** Clock time for recent timestamps, weekday + time for older ones. */
export function formatWhen(iso) {
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Minutes -> { value, unit } for KPI tiles; null stays null. */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return { value: '—', unit: null }
  if (minutes < 120) return { value: minutes, unit: 'min' }
  return { value: Math.round((minutes / 60) * 10) / 10, unit: 'h' }
}

/** Workflow moves the given user may make on this incident (mirrors backend/incidents WORKFLOW). */
export function allowedTransitions(incident, user) {
  return WORKFLOW[incident.status].filter(([, , who]) =>
    user.role === 'admin'
    || (who === 'engineer' && incident.assigneeId === user.id)
    || (who === 'reporter' && incident.reporterId === user.id))
}

/** Client-side narrowing of the incidents the API already scoped to this user. */
export function filterIncidents(incidents, { query, category, priority, escalatedOnly }) {
  const q = query.trim().toLowerCase()
  return incidents.filter((i) => {
    if (category && i.category !== category) return false
    if (priority && i.priority !== priority) return false
    if (escalatedOnly && !i.escalationReason) return false
    if (q) {
      const haystack = [
        i.title, i.description, `INC-${i.id}`, i.assetTag,
        i.location.building, i.location.floor, i.location.seat, i.assigneeName,
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
