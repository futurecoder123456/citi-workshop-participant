import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'

/**
 * Generic create/edit dialog.
 *
 * fields: [{ name, label, type?: 'text'|'number'|'time'|'password'|'email'|'select', options?: [{ value, label }],
 *            required?, helperText?, half? }]
 * `name` should match the API field so server validation errors land on the right input.
 * onSubmit(values) must return a promise; throw (e.g. ApiError) to keep the dialog open and show the error.
 */
export default function FormDialog({ open, title, fields, initialValues, submitLabel = 'Save', onSubmit, onClose }) {
  if (!open) return null
  // Mounting fresh on every open resets values and errors.
  return <FormDialogBody title={title} fields={fields} initialValues={initialValues} submitLabel={submitLabel} onSubmit={onSubmit} onClose={onClose} />
}

function FormDialogBody({ title, fields, initialValues, submitLabel, onSubmit, onClose }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initialValues?.[f.name] ?? ''])))
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      // Send only filled-in fields, converting numbers; empty optional fields are left out.
      const body = {}
      for (const f of fields) {
        const v = values[f.name]
        if (v === '' || v === null) continue
        body[f.name] = f.type === 'number' ? Number(v) : v
      }
      await onSubmit(body)
      onClose()
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.details ?? {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: 'form', onSubmit: submit, noValidate: true } }}>
      <DialogTitle sx={{ fontFamily: (t) => t.typography.h2.fontFamily, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap', pt: 1 }}>
          {fields.map((f) => (
            <TextField
              key={f.name}
              id={`form-${f.name}`}
              label={f.label}
              type={f.type === 'select' ? undefined : f.type ?? 'text'}
              select={f.type === 'select'}
              required={f.required}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              error={Boolean(fieldErrors[f.name])}
              helperText={fieldErrors[f.name] ?? f.helperText}
              size="small"
              sx={{ flex: f.half ? '1 1 calc(50% - 16px)' : '1 1 100%', minWidth: 140 }}
              slotProps={f.type === 'time' ? { inputLabel: { shrink: true } } : undefined}
            >
              {f.type === 'select' && f.options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          ))}
        </Stack>
        {error && (
          <Typography role="alert" sx={(t) => ({ mt: 2, color: t.palette.fixline.status.blocked, fontSize: 13, fontWeight: 600 })}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancel</Button>
        <Button id="form-submit" type="submit" variant="contained" disabled={busy}>{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}
