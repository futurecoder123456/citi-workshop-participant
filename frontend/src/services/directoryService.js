// Engineers, facilities, and dashboard APIs.
// Admin create/update calls take bodies using the API's own field names (e.g. shift_start),
// so validation errors in `ApiError.details` line up with form fields one-to-one.

import { request } from './apiClient'

/** "13:30:00" -> 13.5 */
const toHour = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

/** "13:30:00" -> "13:30" (the format <input type="time"> uses) */
const toClock = (t) => t.slice(0, 5)

function toEngineer(row) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    specialty: row.specialty,
    isActive: row.is_active,
    shift: [toHour(row.shift_start), toHour(row.shift_end)],
    lunch: [toHour(row.lunch_start), toHour(row.lunch_end)],
    // Form-ready values for the edit dialog
    hours: {
      shift_start: toClock(row.shift_start), shift_end: toClock(row.shift_end),
      lunch_start: toClock(row.lunch_start), lunch_end: toClock(row.lunch_end),
    },
    availability: row.availability,
    active: row.active_tickets ?? row.active ?? 0,
  }
}

export const engineerService = {
  async list({ includeInactive = false } = {}) {
    return (await request('engineers', '', { query: { include_inactive: includeInactive || undefined } })).map(toEngineer)
  },
  async get(id) {
    return toEngineer(await request('engineers', `/${id}`))
  },
  async create(body) {
    return toEngineer(await request('engineers', '', { method: 'POST', body }))
  },
  async update(id, body) {
    return toEngineer(await request('engineers', `/${id}`, { method: 'PUT', body }))
  },
  /** Deactivates the profile (history is kept) and unassigns their active tickets. */
  deactivate(id) {
    return request('engineers', `/${id}`, { method: 'DELETE' })
  },
}

export const facilityService = {
  /** Flattened building › floor › seat options for the location picker. */
  async seatOptions() {
    return (await request('facilities', '/seats')).map((s) => ({ id: s.id, label: s.label }))
  },

  buildings: () => request('facilities', '/buildings'),
  createBuilding: (body) => request('facilities', '/buildings', { method: 'POST', body }),
  updateBuilding: (id, body) => request('facilities', `/buildings/${id}`, { method: 'PUT', body }),
  deleteBuilding: (id) => request('facilities', `/buildings/${id}`, { method: 'DELETE' }),

  floors: (buildingId) => request('facilities', `/buildings/${buildingId}/floors`),
  createFloor: (buildingId, body) => request('facilities', `/buildings/${buildingId}/floors`, { method: 'POST', body }),
  updateFloor: (id, body) => request('facilities', `/floors/${id}`, { method: 'PUT', body }),
  deleteFloor: (id) => request('facilities', `/floors/${id}`, { method: 'DELETE' }),

  seats: (floorId) => request('facilities', `/floors/${floorId}/seats`),
  createSeat: (floorId, body) => request('facilities', `/floors/${floorId}/seats`, { method: 'POST', body }),
  updateSeat: (id, body) => request('facilities', `/seats/${id}`, { method: 'PUT', body }),
  deleteSeat: (id) => request('facilities', `/seats/${id}`, { method: 'DELETE' }),
}

export const dashboardService = {
  async summary() {
    const d = await request('dashboard')
    return {
      windowDays: d.window_days,
      byStatus: d.by_status,
      byPriority: d.by_priority,
      byCategory: d.by_category,
      escalatedActive: d.escalated_active,
      unassignedActive: d.unassigned_active,
      averageMinutes: d.average_minutes,
      hotspots: d.hotspots.map((h) => ({ label: h.building_name, detail: `${h.floor_name} · ${h.seat_code}`, value: h.incidents })),
      byBuilding: d.by_building.map((b) => ({ label: b.building_name, value: b.incidents })),
      communication: d.communication,
      workload: (d.workload ?? []).map(toEngineer),
    }
  },
}
