import { ACTIVE_STATUSES, WORKFLOW } from '../constants'
import { DEMO_NOW, LOCATIONS, USERS } from '../data/mockData'

/** Format a decimal hour (13.5) as "13:30". */
export function formatHour(hour) {
  const h = String(Math.floor(hour)).padStart(2, '0')
  const m = String(Math.round((hour % 1) * 60)).padStart(2, '0')
  return `${h}:${m}`
}

/** Availability from shift and lunch hours: "available" | "lunch" | "off". */
export function engineerAvailability(engineer, now = DEMO_NOW) {
  if (now < engineer.shift[0] || now >= engineer.shift[1]) return { state: 'off', label: 'Off shift' }
  if (now >= engineer.lunch[0] && now < engineer.lunch[1]) {
    return { state: 'lunch', label: `Lunch until ${formatHour(engineer.lunch[1])}` }
  }
  return { state: 'available', label: 'Available' }
}

export const isActive = (incident) => ACTIVE_STATUSES.has(incident.status)

/** Workflow moves the given user may make on this incident. */
export function allowedTransitions(incident, user) {
  return WORKFLOW[incident.status].filter(([, , who]) =>
    user.role === 'admin'
    || (who === 'engineer' && user.role === 'engineer' && incident.assigneeId === user.id)
    || (who === 'reporter' && incident.reporterId === user.id))
}

/** Incidents the user may see, narrowed by the current filters. */
export function filterIncidents(incidents, user, { query, category, priority, escalatedOnly }) {
  const q = query.trim().toLowerCase()
  return incidents.filter((i) => {
    if (user.role === 'employee' && i.reporterId !== user.id) return false
    if (user.role === 'engineer' && i.assigneeId !== user.id) return false
    if (category && i.category !== category) return false
    if (priority && i.priority !== priority) return false
    if (escalatedOnly && !i.escalationReason) return false
    if (q) {
      const haystack = [
        i.title, i.description, `INC-${i.id}`, i.assetTag, ...LOCATIONS[i.seat],
        i.assigneeId ? USERS[i.assigneeId].name : '',
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
