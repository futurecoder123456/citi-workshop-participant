// Incidents API (backend/incidents). Maps snake_case API rows to the camelCase shape the UI uses.

import { STATUS_LABELS } from '../constants'
import { request } from './apiClient'

function toIncident(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assetTag: row.asset_tag,
    seatId: row.seat_id,
    location: {
      building: row.building_name,
      floor: row.floor_name || `Floor ${row.floor_level}`,
      seat: row.seat_code,
    },
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    escalationReason: row.is_escalated ? row.escalation_reason : null,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    timeline: row.notes ? toTimeline(row.notes, row.history ?? []) : null,
  }
}

/** Merge notes and status history into one chronological thread for the detail drawer. */
function toTimeline(notes, history) {
  const events = history.map((h) => {
    let text
    if (h.from_status === null || h.from_status === h.to_status) text = h.reason
    else text = `Status ${STATUS_LABELS[h.from_status]} → ${STATUS_LABELS[h.to_status]}${h.to_status === 'blocked' && h.reason ? `: ${h.reason}` : ''}`
    return { key: `h${h.id}`, kind: 'event', at: h.changed_at, authorId: h.changed_by, authorName: h.changed_by_name, text }
  })
  const messages = notes.map((n) => ({
    key: `n${n.id}`, kind: 'note', at: n.created_at, authorId: n.author_id, authorName: n.author_name, text: n.body,
  }))
  // Stable sort: a status event and its resolution note share a timestamp, and the event stays first.
  return [...events, ...messages].sort((a, b) => new Date(a.at) - new Date(b.at))
}

export const incidentService = {
  async list() {
    return (await request('incidents', '', { query: { limit: 500 } })).map(toIncident)
  },

  async get(id) {
    return toIncident(await request('incidents', `/${id}`))
  },

  async create({ title, description, category, priority, seatId, assetTag }) {
    const body = { title, description, category, priority, seat_id: seatId || null, asset_tag: assetTag || null }
    return toIncident(await request('incidents', '', { method: 'POST', body }))
  },

  async changeStatus(id, status, reason) {
    return toIncident(await request('incidents', `/${id}/status`, { method: 'POST', body: { status, ...(reason && { reason }) } }))
  },

  async assign(id, engineerId) {
    return toIncident(await request('incidents', `/${id}/assign`, { method: 'POST', body: { assignee_id: engineerId || null } }))
  },

  async escalate(id, reason) {
    return toIncident(await request('incidents', `/${id}/escalate`, { method: 'POST', body: { reason } }))
  },

  async addNote(id, body) {
    await request('incidents', `/${id}/notes`, { method: 'POST', body: { body } })
    return this.get(id)
  },
}
