// Values mirror the CHECK constraints in backend/_shared/common/schema.sql.

export const STATUS_ORDER = ['open', 'in_progress', 'blocked', 'resolved', 'closed']

export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const PRIORITIES = ['critical', 'high', 'medium', 'low']

export const CATEGORIES = {
  hardware: 'Hardware',
  software: 'Software',
  facility: 'Facility',
  other: 'Other',
}

export const ROLES = { ADMIN: 'admin', ENGINEER: 'engineer', EMPLOYEE: 'employee' }

// Workflow transitions: [next status, button label, who may do it].
// "engineer" = the assigned engineer, "reporter" = the employee who opened it. Admins may do anything.
export const WORKFLOW = {
  open: [['in_progress', 'Start work', 'engineer'], ['blocked', 'Mark blocked', 'engineer']],
  in_progress: [['blocked', 'Mark blocked', 'engineer'], ['resolved', 'Mark resolved', 'engineer']],
  blocked: [['in_progress', 'Unblock', 'engineer']],
  resolved: [['closed', 'Confirm & close', 'reporter'], ['in_progress', 'Reopen', 'reporter']],
  closed: [],
}

// Moving to these statuses requires a reason (blocked) or resolution note (resolved).
export const REASON_REQUIRED = new Set(['blocked', 'resolved'])

export const ESCALATION_KEYWORD = /\bextreme\b/i

export const ACTIVE_STATUSES = new Set(['open', 'in_progress', 'blocked'])
