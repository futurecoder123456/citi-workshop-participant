// In-memory stand-in for the backend "incidents" service.
// Each method matches a planned endpoint; replace the bodies with fetch() calls once the Lambdas exist:
//   list()                       -> GET  /api/incidents
//   create(user, data)           -> POST /api/incidents
//   changeStatus(user, id, ...)  -> POST /api/incidents/{id}/status
//   assign(user, id, engineerId) -> POST /api/incidents/{id}/assign
//   escalate(user, id, reason)   -> POST /api/incidents/{id}/escalate
//   addNote(user, id, body)      -> POST /api/incidents/{id}/notes

import { ESCALATION_KEYWORD, REASON_REQUIRED, STATUS_LABELS } from '../constants'
import { INCIDENTS, USERS } from '../data/mockData'
import { allowedTransitions } from '../utils/incidents'

let incidents = structuredClone(INCIDENTS)
const NOW_LABEL = '12:15'

const snapshot = () => Promise.resolve(structuredClone(incidents))

function find(id) {
  const incident = incidents.find((i) => i.id === id)
  if (!incident) throw new Error('This incident no longer exists.')
  return incident
}

function logEvent(incident, user, text) {
  incident.notes.push({ authorId: user.id, time: NOW_LABEL, system: text })
}

export const incidentService = {
  list: snapshot,

  async create(user, { title, description, category, priority, seat, assetTag }) {
    if (!title?.trim() || !description?.trim() || !seat) {
      throw new Error('Add a title, choose where it is, and describe the problem.')
    }
    const flagged = ESCALATION_KEYWORD.test(description)
    const incident = {
      id: Math.max(...incidents.map((i) => i.id)) + 1,
      title: title.trim(),
      description: description.trim(),
      category,
      priority: flagged ? 'critical' : priority,
      status: 'open',
      seat,
      assetTag: assetTag?.trim() || null,
      reporterId: user.id,
      assigneeId: null,
      age: '0m',
      escalationReason: flagged ? 'Auto-flagged — report contains “extreme”' : null,
      notes: [],
    }
    incidents = [incident, ...incidents]
    return structuredClone(incident)
  },

  async changeStatus(user, id, to, reason = '') {
    const incident = find(id)
    if (!allowedTransitions(incident, user).some(([s]) => s === to)) {
      throw new Error(`You can't move this ticket to ${STATUS_LABELS[to]}.`)
    }
    if (REASON_REQUIRED.has(to) && !reason.trim()) {
      throw new Error(to === 'blocked'
        ? "Add what's blocking this ticket before marking it blocked."
        : 'Add a resolution note so the reporter knows what was fixed.')
    }
    if (to === 'blocked') incident.blockedReason = reason.trim()
    if (to === 'resolved') incident.notes.push({ authorId: user.id, time: NOW_LABEL, body: reason.trim() })
    logEvent(incident, user, `Status ${STATUS_LABELS[incident.status]} → ${STATUS_LABELS[to]}${to === 'blocked' ? `: ${reason.trim()}` : ''}`)
    incident.status = to
    return structuredClone(incident)
  },

  async assign(user, id, engineerId) {
    if (user.role !== 'admin') throw new Error('Only facility admins can assign tickets.')
    if (!engineerId) throw new Error('Choose an engineer to assign.')
    const incident = find(id)
    incident.assigneeId = engineerId
    logEvent(incident, user, `Assigned to ${USERS[engineerId].name}`)
    return structuredClone(incident)
  },

  async escalate(user, id, reason) {
    if (!reason?.trim()) throw new Error('Say why this needs escalating so the admin can prioritise it.')
    const incident = find(id)
    incident.escalationReason = `Employee requested — ${reason.trim()}`
    logEvent(incident, user, 'Escalation requested')
    return structuredClone(incident)
  },

  async addNote(user, id, body) {
    if (!body?.trim()) throw new Error('Write a note before posting.')
    const incident = find(id)
    incident.notes.push({ authorId: user.id, time: NOW_LABEL, body: body.trim() })
    return structuredClone(incident)
  },
}
