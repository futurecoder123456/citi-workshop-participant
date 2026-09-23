import { Box, Chip, Divider, InputAdornment, Stack, TextField } from '@mui/material'
import { CATEGORIES, PRIORITIES } from '../constants'

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
      sx={{ flex: '1 1 260px', maxWidth: fullWidth ? 'none' : 420, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 3 } }}
      slotProps={{
        htmlInput: { 'aria-label': placeholder },
        input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> },
      }}
    />
  )
}

function ToggleChip({ id, label, selected, onClick, dotColor }) {
  return (
    <Chip
      id={id}
      label={label}
      onClick={onClick}
      aria-pressed={selected}
      variant={selected ? 'filled' : 'outlined'}
      icon={dotColor ? <Box sx={(t) => ({ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor(t), ml: '10px !important' })} /> : undefined}
      sx={(t) => ({
        fontWeight: 500,
        ...(selected
          ? { bgcolor: t.palette.text.primary, color: t.palette.background.default, '&:hover': { bgcolor: t.palette.text.primary } }
          : { bgcolor: 'background.paper', color: 'text.secondary' }),
      })}
    />
  )
}

/** Search box plus category, priority and escalation toggle chips. */
export default function FilterBar({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })
  return (
    <Stack direction="row" useFlexGap spacing={1.25} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <SearchField value={filters.query} onChange={(query) => set({ query })} placeholder="Search title, INC number, asset tag, building…" />
      {Object.entries(CATEGORIES).map(([key, label]) => (
        <ToggleChip key={key} id={`filter-cat-${key}`} label={label} selected={filters.category === key}
          onClick={() => set({ category: filters.category === key ? null : key })} />
      ))}
      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
      {PRIORITIES.map((p) => (
        <ToggleChip key={p} id={`filter-pri-${p}`} label={p[0].toUpperCase() + p.slice(1)} selected={filters.priority === p}
          dotColor={(t) => t.palette.fixline.priority[p]}
          onClick={() => set({ priority: filters.priority === p ? null : p })} />
      ))}
      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
      <ToggleChip id="filter-escalated" label="Escalated only" selected={filters.escalatedOnly}
        dotColor={(t) => t.palette.fixline.status.blocked}
        onClick={() => set({ escalatedOnly: !filters.escalatedOnly })} />
    </Stack>
  )
}
