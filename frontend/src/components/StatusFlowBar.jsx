import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { STATUS_LABELS, STATUS_ORDER } from '../constants'
import Panel from './Panel'

/** Single stacked bar showing how the visible tickets split across workflow statuses. */
export default function StatusFlowBar({ incidents }) {
  const counts = STATUS_ORDER.map((s) => [s, incidents.filter((i) => i.status === s).length])
  return (
    <Panel title="Workflow at a glance" subtitle={`${incidents.length} tickets in view`} sx={{ gap: 1.25 }}>
      <Box role="img" aria-label={counts.map(([s, n]) => `${STATUS_LABELS[s]} ${n}`).join(', ')} sx={{ display: 'flex', gap: '2px', height: 14 }}>
        {counts.filter(([, n]) => n).map(([s, n]) => (
          <Tooltip key={s} title={`${STATUS_LABELS[s]}: ${n}`}>
            <Box sx={(t) => ({ flexGrow: n, minWidth: 6, borderRadius: '3px', bgcolor: t.palette.fixline.status[s], transition: 'flex-grow .3s' })} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.75 }}>
        {counts.map(([s, n]) => (
          <Stack key={s} direction="row" spacing={0.75} sx={{ alignItems: 'center', fontSize: 12, color: 'text.secondary' }}>
            <Box sx={(t) => ({ width: 10, height: 10, borderRadius: '3px', bgcolor: t.palette.fixline.status[s] })} />
            <span>{STATUS_LABELS[s]}</span>
            <Typography component="b" sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
          </Stack>
        ))}
      </Stack>
    </Panel>
  )
}
