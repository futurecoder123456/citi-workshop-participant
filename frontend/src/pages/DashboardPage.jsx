import { Box } from '@mui/material'
import BarListPanel from '../components/BarListPanel'
import EngineerPanel from '../components/EngineerPanel'
import KpiRow from '../components/KpiRow'
import PageHeader from '../components/PageHeader'
import StatusFlowBar from '../components/StatusFlowBar'
import { CATEGORIES } from '../constants'
import { formatDuration, isActive } from '../utils/incidents'

/** Facility admin reporting: response times, workload, recurring locations, categories. */
export default function DashboardPage({ incidents, summary }) {
  const period = `last ${summary?.windowDays ?? 90} days`
  const acknowledge = formatDuration(summary?.averageMinutes.acknowledge)
  const updateRate = summary?.communication.staff_update_rate
  const categories = Object.entries(summary?.byCategory ?? {})
    .map(([key, value]) => ({ label: CATEGORIES[key], value }))
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <PageHeader eyebrow={`Reporting · ${period}`} title="Dashboard" />
      <KpiRow items={[
        { label: 'Open tickets', value: incidents.filter(isActive).length },
        { label: 'Unassigned', value: summary?.unassignedActive ?? 0, alert: Boolean(summary?.unassignedActive) },
        { label: 'Escalated', value: summary?.escalatedActive ?? 0, alert: Boolean(summary?.escalatedActive) },
        { label: 'Avg. time to acknowledge', ...acknowledge },
        { label: 'Got a staff update', value: updateRate === null || updateRate === undefined ? '—' : `${Math.round(updateRate * 100)}%` },
      ]} />
      <StatusFlowBar incidents={incidents} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
        <EngineerPanel engineers={summary?.workload ?? []} />
        <BarListPanel title="Recurring hotspots" subtitle={period} rows={summary?.hotspots ?? []} emptyText="No location has more than one ticket yet." />
        <Box sx={{ display: 'grid', gap: 2 }}>
          <BarListPanel title="By category" subtitle="all tickets" rows={categories} />
          <BarListPanel title="By building" subtitle={period} rows={summary?.byBuilding ?? []} />
        </Box>
      </Box>
    </>
  )
}
