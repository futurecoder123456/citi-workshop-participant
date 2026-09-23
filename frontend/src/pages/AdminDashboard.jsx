import { Box, Button, Stack } from '@mui/material'
import BarListPanel from '../components/BarListPanel'
import EngineerPanel from '../components/EngineerPanel'
import FilterBar from '../components/FilterBar'
import KanbanBoard from '../components/KanbanBoard'
import KpiRow from '../components/KpiRow'
import PageHeader from '../components/PageHeader'
import StatusFlowBar from '../components/StatusFlowBar'
import { CATEGORY_COUNTS, HOTSPOTS } from '../data/mockData'
import { isActive } from '../utils/incidents'

/** Facility admin: whole-estate board, workload, and recurring-issue reporting. */
export default function AdminDashboard({ incidents, visible, filters, onFiltersChange, onOpen, onToast }) {
  const active = incidents.filter(isActive)
  const escalated = incidents.filter((i) => i.escalationReason && i.status !== 'closed').length
  const unassigned = active.filter((i) => !i.assigneeId).length

  return (
    <>
      <PageHeader
        eyebrow="Operations · all buildings"
        title="Incident board"
        action={<Button id="add-facility" variant="contained" onClick={() => onToast('Facility editor would open here: building › floor › seat')}>+ Add facility</Button>}
      />
      <KpiRow items={[
        { label: 'Open & active', value: active.length, note: `${unassigned} waiting for an engineer`, tone: unassigned ? 'bad' : 'good' },
        { label: 'Escalated', value: escalated, note: 'keyword or employee request', alert: true },
        { label: 'Avg. time to acknowledge', value: 18, unit: 'min', note: '▼ 6 min vs last week', tone: 'good' },
        { label: 'Avg. time to resolve', value: 5.2, unit: 'h', note: '▼ 1.1 h vs last week', tone: 'good' },
      ]} />
      <FilterBar filters={filters} onChange={onFiltersChange} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 2.5, alignItems: 'start' }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <StatusFlowBar incidents={visible} />
          <KanbanBoard incidents={visible} onOpen={onOpen} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))', lg: '1fr' }, gap: 2 }}>
          <EngineerPanel incidents={incidents} />
          <BarListPanel title="Recurring hotspots" subtitle="last 90 days" rows={HOTSPOTS} />
          <BarListPanel title="By category" subtitle="last 90 days" rows={CATEGORY_COUNTS} />
        </Box>
      </Box>
    </>
  )
}
