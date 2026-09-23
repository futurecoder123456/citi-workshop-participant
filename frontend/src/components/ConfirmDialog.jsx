import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

/**
 * Yes/no confirmation for destructive actions. Pass `request` = { title, message, confirmLabel, action }
 * to open it, or null to keep it closed. `action` returns a promise; errors are shown in the dialog.
 */
export default function ConfirmDialog({ request, onClose }) {
  if (!request) return null
  return <ConfirmBody request={request} onClose={onClose} />
}

function ConfirmBody({ request, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await request.action()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{request.title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14 }}>{request.message}</Typography>
        {error && <Typography role="alert" sx={(t) => ({ mt: 1.5, color: t.palette.fixline.status.blocked, fontSize: 13, fontWeight: 600 })}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancel</Button>
        <Button id="confirm-action" onClick={confirm} disabled={busy} variant="contained" color="error">{request.confirmLabel ?? 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  )
}
