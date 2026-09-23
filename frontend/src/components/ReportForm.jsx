import { useState } from 'react'
import { Box, Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { CATEGORIES, ESCALATION_KEYWORD, PRIORITIES } from '../constants'
import { fonts } from '../theme'
import Banner from './Banner'
import Panel from './Panel'

const EMPTY = { title: '', category: 'hardware', seatId: '', assetTag: '', priority: 'medium', description: '' }

const toggleSx = {
  flexWrap: 'wrap', gap: 0.75,
  '& .MuiToggleButton-root': {
    flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: '10px !important', py: 0.9,
    textTransform: 'none', fontWeight: 600, color: 'text.primary', bgcolor: 'background.paper',
  },
  '& .MuiToggleButton-root.Mui-selected': { borderColor: 'primary.main', bgcolor: (t) => t.palette.fixline.accentSoft },
}

/** Employee self-service report form. Words like "extreme" warn that the ticket will be escalated. */
export default function ReportForm({ seats, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  // Same rule as the backend: the keyword in the title or details escalates the ticket.
  const flagged = ESCALATION_KEYWORD.test(`${form.title} ${form.description}`)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSubmit(form)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Panel title="Report an issue" subtitle="Goes to the facility desk">
      <Box component="form" id="report-form" onSubmit={submit} noValidate
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
        <TextField id="report-title" label="What's wrong?" placeholder="e.g. Docking station won't charge" required size="small"
          value={form.title} onChange={(e) => set({ title: e.target.value })} sx={{ gridColumn: '1 / -1' }}
          slotProps={{ htmlInput: { maxLength: 255 } }} />

        <Stack spacing={0.75} sx={{ gridColumn: '1 / -1' }}>
          <Typography component="label" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Category</Typography>
          <ToggleButtonGroup exclusive value={form.category} onChange={(_, v) => v && set({ category: v })} aria-label="Category" sx={toggleSx}>
            {Object.entries(CATEGORIES).map(([k, v]) => <ToggleButton key={k} id={`report-cat-${k}`} value={k}>{v}</ToggleButton>)}
          </ToggleButtonGroup>
        </Stack>

        <TextField id="report-seat" select label="Where?" required size="small" value={form.seatId} onChange={(e) => set({ seatId: e.target.value })}
          helperText={seats.length === 0 ? 'No locations set up yet. Ask a facility admin.' : undefined}>
          {seats.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
        </TextField>
        <TextField id="report-asset" label="Asset tag (optional)" placeholder="MON-0042" size="small"
          value={form.assetTag} onChange={(e) => set({ assetTag: e.target.value })}
          slotProps={{ htmlInput: { style: { fontFamily: fonts.mono } } }} />

        <Stack spacing={0.75} sx={{ gridColumn: '1 / -1' }}>
          <Typography component="label" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Priority</Typography>
          <ToggleButtonGroup exclusive value={form.priority} onChange={(_, v) => v && set({ priority: v })} aria-label="Priority" sx={toggleSx}>
            {PRIORITIES.map((p) => <ToggleButton key={p} id={`report-pri-${p}`} value={p}>{p[0].toUpperCase() + p.slice(1)}</ToggleButton>)}
          </ToggleButtonGroup>
        </Stack>

        <TextField id="report-description" label="Details" required multiline minRows={4} size="small"
          placeholder="What happened, when it started, what you've tried. Words like “extreme” flag it for urgent review."
          value={form.description} onChange={(e) => set({ description: e.target.value })} sx={{ gridColumn: '1 / -1' }} />

        {flagged && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Banner status="blocked" title="Will be escalated">Your description mentions “extreme”, so the facility admin is alerted right away.</Banner>
          </Box>
        )}
        {error && <Typography role="alert" sx={(t) => ({ gridColumn: '1 / -1', color: t.palette.fixline.status.blocked, fontSize: 12.5, fontWeight: 600 })}>{error}</Typography>}

        <Button id="report-submit" type="submit" variant="contained" sx={{ gridColumn: '1 / -1', justifySelf: 'end' }}>Submit report</Button>
      </Box>
    </Panel>
  )
}
