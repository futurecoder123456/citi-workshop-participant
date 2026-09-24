import { useState } from 'react'
import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { Wordmark } from '../components/TopBar'
import { authService } from '../services/authService'

/** Sign in, or create an employee account with an @acme.inc email. */
export default function SignIn({ onSignedIn }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const registering = mode === 'register'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setBusy(true)
    try {
      const user = registering ? await authService.register(form) : await authService.login(form.email, form.password)
      onSignedIn(user)
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.details ?? {})
    } finally {
      setBusy(false)
    }
  }

  const fieldProps = (name, apiName = name) => ({
    error: Boolean(fieldErrors[apiName]),
    helperText: fieldErrors[apiName],
  })

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4, bgcolor: 'background.default' }}>
      <Paper elevation={0} sx={(t) => ({ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 1.5, boxShadow: t.palette.fixline.shadow })}>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <Wordmark size={24} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Report and track facility issues across ACME buildings.</Typography>
          </Stack>

          <Tabs value={mode} onChange={(_, v) => { setMode(v); setError(''); setFieldErrors({}) }} variant="fullWidth">
            <Tab id="tab-signin" value="signin" label="Sign in" />
            <Tab id="tab-register" value="register" label="Create account" />
          </Tabs>

          <Stack component="form" spacing={2} onSubmit={submit} noValidate>
            {registering && (
              <TextField id="auth-name" label="Full name" autoComplete="name" required value={form.name}
                onChange={(e) => set({ name: e.target.value })} {...fieldProps('name', 'full_name')} />
            )}
            <TextField id="auth-email" label="Work email" type="email" autoComplete="email" required placeholder="you@acme.inc"
              value={form.email} onChange={(e) => set({ email: e.target.value })} {...fieldProps('email')} />
            <TextField id="auth-password" label="Password" type="password" required
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={form.password} onChange={(e) => set({ password: e.target.value })}
              {...fieldProps('password')}
              helperText={fieldErrors.password ?? (registering ? 'At least 8 characters' : undefined)} />
            {error && <Typography role="alert" sx={(t) => ({ color: t.palette.fixline.status.blocked, fontSize: 13, fontWeight: 600 })}>{error}</Typography>}
            <Button id="auth-submit" type="submit" variant="contained" size="large" disabled={busy}>
              {registering ? 'Create account' : 'Sign in'}
            </Button>
            {registering && (
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                New accounts are employee accounts. Facility admins set up engineer accounts.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
