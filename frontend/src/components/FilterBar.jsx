import { useMemo } from 'react'
import { Box, ButtonBase, InputAdornment, MenuItem, Stack, TextField } from '@mui/material'
import { CATEGORIES, PRIORITIES } from '../constants'

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function SearchField({ value, onChange, placeholder, fullWidth = false }) {
  return (
    <TextField
      id="incident-search"
      size="small"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ flex: fullWidth ? 'none' : '1 1 240px', maxWidth: fullWidth ? 'none' : 300, '& .MuiInputBase-input': { fontSize: 13 } }}
      slotProps={{
        htmlInput: { 'aria-label': placeholder },
        input: { startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}><SearchIcon /></InputAdornment> },
      }}
    />
  )
}

/** Compact outlined dropdown; '' is the "all" option. */
function FilterSelect({ id, value, onChange, allLabel, options }) {
  return (
    <TextField
      id={id}
      select
      size="small"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      sx={{ minWidth: 130, '& .MuiSelect-select': { fontSize: 13, py: '7px' } }}
      slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': allLabel } }}
    >
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  )
}

/**
 * Search plus building / category / priority / engineer dropdowns, and an "N escalated" toggle.
 * Building and engineer options come from the loaded incidents, so no extra API calls are needed.
 */
export default function FilterBar({ filters, onChange, incidents, showEngineers = false }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  const { buildings, engineers, escalated } = useMemo(() => {
    const b = [...new Set(incidents.map((i) => i.location.building))].sort()
    const e = new Map(incidents.filter((i) => i.assigneeId).map((i) => [i.assigneeId, i.assigneeName]))
    return {
      buildings: b.map((name) => ({ value: name, label: name })),
      engineers: [
        { value: 'unassigned', label: 'Unassigned' },
        ...[...e].sort((x, y) => x[1].localeCompare(y[1])).map(([id, name]) => ({ value: id, label: name })),
      ],
      escalated: incidents.filter((i) => i.escalationReason && i.status !== 'closed').length,
    }
  }, [incidents])

  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <SearchField value={filters.query} onChange={(query) => set({ query })} placeholder="Search title, location, asset tag" />
      <FilterSelect id="filter-building" value={filters.building} onChange={(building) => set({ building })} allLabel="All buildings" options={buildings} />
      <FilterSelect id="filter-category" value={filters.category} onChange={(category) => set({ category })} allLabel="All categories"
        options={Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))} />
      <FilterSelect id="filter-priority" value={filters.priority} onChange={(priority) => set({ priority })} allLabel="Any priority"
        options={PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
      {showEngineers && (
        <FilterSelect id="filter-engineer" value={filters.assignee} onChange={(assignee) => set({ assignee: assignee === 'unassigned' ? assignee : assignee && Number(assignee) })}
          allLabel="All engineers" options={engineers} />
      )}
      <Box sx={{ flex: 1 }} />
      <ButtonBase
        id="filter-escalated"
        aria-pressed={filters.escalatedOnly}
        onClick={() => set({ escalatedOnly: !filters.escalatedOnly })}
        sx={(t) => {
          // Muted when nothing is escalated, red when something needs attention.
          const c = escalated || filters.escalatedOnly ? t.palette.fixline.status.blocked : t.palette.text.disabled
          const soft = escalated ? t.palette.fixline.priority.high.bg : t.palette.fixline.surface2
          return {
            borderRadius: 999, px: 1.25, py: 0.4, fontSize: 12, fontWeight: 600, gap: 0.75,
            color: filters.escalatedOnly ? '#fff' : c,
            bgcolor: filters.escalatedOnly ? c : soft,
            border: `1px solid ${filters.escalatedOnly ? c : 'transparent'}`,
            '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' },
            '&.Mui-focusVisible': { outline: `2px solid ${c}`, outlineOffset: 2 },
          }
        }}
      >
        {escalated} escalated
      </ButtonBase>
    </Stack>
  )
}
