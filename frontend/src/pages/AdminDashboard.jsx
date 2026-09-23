import { Box, Stack } from '@mui/material'
import BarListPanel from '../components/BarListPanel'
import EngineerPanel from '../components/EngineerPanel'
import FilterBar from '../components/FilterBar'
import KanbanBoard from '../components/KanbanBoard'
import KpiRow from '../components/KpiRow'
import PageHeader from '../components/PageHeader'
import StatusFlowBar from '../components/StatusFlowBar'
import { CATEGORIES } from '../constants'
import { formatDuration, isActive } from '../utils/incidents'

/** Facility admin: whole-estate board, workload, and recurring-issue reporting. */
export default function AdminDashboard({ incidents, visible, summary, filters, onFiltersChange, onOpen }) {
  const active = incidents.filter(isActive)
  const acknowledge = formatDuration(summary?.averageMinutes.acknowledge)
  const resolve = formatDuration(summary?.averageMinutes.resolve)
  const period = `last ${summary?.windowDays ?? 90} days`
  const updateRate = summary?.communication.staff_update_rate
  const categories = Object.entries(summary?.byCategory ?? {})
    .map(([key, value]) => ({ label: CATEGORIES[key], value }))
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <PageHeader eyebrow="Operations · all buildings" title="Incident board" />
      <KpiRow items={[
        { label: 'Open & active', value: active.length, note: `${summary?.unassignedActive ?? 0} waiting for an engineer`, tone: summary?.unassignedActive ? 'bad' : 'good' },
        { label: 'Escalated', value: summary?.escalatedActive ?? 0, note: 'keyword or employee request', alert: true },
        { label: 'Avg. time to acknowledge', ...acknowledge, note: period },
        {
          label: 'Avg. time to resolve', ...resolve,
          note: updateRate === null || updateRate === undefined ? period : `${Math.round(updateRate * 100)}% of tickets got a staff update`,
          tone: updateRate >= 0.8 ? 'good' : 'neutral',
        },
      ]} />
      <FilterBar filters={filters} onChange={onFiltersChange} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 2.5, alignItems: 'start' }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <StatusFlowBar incidents={visible} />
          <KanbanBoard incidents={visible} onOpen={onOpen} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))', lg: '1fr' }, gap: 2 }}>
          <EngineerPanel engineers={summary?.workload ?? []} />
          <BarListPanel title="Recurring hotspots" subtitle={period} rows={summary?.hotspots ?? []} emptyText="No location has more than one ticket yet." />
          <BarListPanel title="By category" subtitle="all tickets" rows={categories} />
        </Box>
      </Box>
    </>
  )
}
