import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { CATEGORIES } from '../constants'
import { fonts } from '../theme'
import { formatHour, nowHour } from '../utils/incidents'
import AvailabilityChip from './AvailabilityChip'
import { UserAvatar } from './Badges'
import Panel from './Panel'

const DAY_START = 6
const DAY_END = 22
const clamp = (h) => Math.min(DAY_END, Math.max(DAY_START, h))
const pct = (h) => `${(((clamp(h) - DAY_START) / (DAY_END - DAY_START)) * 100).toFixed(2)}%`
const span = ([from, to]) => ({ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` })

/** Who is on shift now, their lunch window, and how many active tickets each holds. */
export default function EngineerPanel({ engineers }) {
  const now = nowHour()
  return (
    <Panel
      title="Engineers today"
      action={
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
          shift · <Box component="span" sx={(t) => ({ color: t.palette.fixline.lunch })}>■</Box> lunch
        </Typography>
      }
    >
      {engineers.length === 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No engineer profiles yet.</Typography>
      )}
      {engineers.map((e) => (
        <Box key={e.id} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', columnGap: 1.25, rowGap: 0.6, alignItems: 'center' }}>
          <UserAvatar id={e.id} name={e.name} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{e.name}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              {CATEGORIES[e.specialty]} · <Box component="b" sx={{ color: 'text.primary' }}>{e.active}</Box> active
            </Typography>
          </Box>
          <AvailabilityChip availability={e.availability} />
          <Tooltip title={`Shift ${formatHour(e.shift[0])}–${formatHour(e.shift[1])}, lunch ${formatHour(e.lunch[0])}–${formatHour(e.lunch[1])}`}>
            <Box sx={(t) => ({ gridColumn: '2 / 4', position: 'relative', height: 10, borderRadius: '5px', bgcolor: t.palette.fixline.surface2 })}>
              <Box sx={(t) => ({ position: 'absolute', top: 0, bottom: 0, borderRadius: '5px', bgcolor: t.palette.fixline.shift, ...span(e.shift) })} />
              <Box sx={(t) => ({ position: 'absolute', top: 0, bottom: 0, borderRadius: '2px', bgcolor: t.palette.fixline.lunch, ...span(e.lunch) })} />
              {now >= DAY_START && now <= DAY_END && (
                <Box sx={(t) => ({ position: 'absolute', top: -4, bottom: -4, width: 2, borderRadius: 1, bgcolor: t.palette.fixline.now, left: pct(now) })} />
              )}
            </Box>
          </Tooltip>
        </Box>
      ))}
      {engineers.length > 0 && (
        <Stack direction="row" sx={{ justifyContent: 'space-between', pl: '38px', fontFamily: fonts.data, fontSize: 10, color: 'text.disabled' }}>
          {[6, 10, 14, 18, 22].map((h) => <span key={h}>{String(h).padStart(2, '0')}</span>)}
        </Stack>
      )}
    </Panel>
  )
}
