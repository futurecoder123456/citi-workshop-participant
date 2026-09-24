import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material'
import { facilityService } from '../services/directoryService'
import ReportForm from './ReportForm'

/** "New incident" from the top bar: the report form in a dialog. Closes after a successful submit. */
export default function NewIncidentDialog({ open, onClose, onCreate }) {
  const [seats, setSeats] = useState([])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    facilityService.seatOptions().then((list) => { if (!cancelled) setSeats(list) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        <DialogTitle sx={{ fontWeight: 600 }}>New incident</DialogTitle>
        <IconButton aria-label="Close" onClick={onClose} size="small">×</IconButton>
      </Stack>
      <DialogContent sx={{ pt: 0.5 }}>
        <ReportForm embedded seats={seats} onSubmit={async (form) => { await onCreate(form); onClose() }} />
      </DialogContent>
    </Dialog>
  )
}
