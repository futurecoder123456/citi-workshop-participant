import FilterBar from '../components/FilterBar'
import KanbanBoard from '../components/KanbanBoard'
import KpiRow from '../components/KpiRow'
import { formatDuration, isActive } from '../utils/incidents'

/** Facility admin board: headline stats, filters, and the full-width workflow board. */
export default function AdminBoard({ incidents, visible, summary, filters, onFiltersChange, onOpen }) {
  const assign = formatDuration(summary?.averageMinutes.assign)
  const resolve = formatDuration(summary?.averageMinutes.resolve)

  return (
    <>
      <FilterBar filters={filters} onChange={onFiltersChange} incidents={incidents} showEngineers />
      <KpiRow items={[
        { label: 'Open tickets', value: incidents.filter(isActive).length },
        { label: 'Avg. time to assign', ...assign },
        { label: 'Avg. time to resolve', ...resolve },
        { label: 'Awaiting confirmation', value: incidents.filter((i) => i.status === 'resolved').length },
      ]} />
      <KanbanBoard incidents={visible} onOpen={onOpen} />
    </>
  )
}
