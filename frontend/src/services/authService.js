import { request, setToken } from './apiClient'

const toUser = (u) => ({ id: u.id, email: u.email, name: u.full_name, role: u.role })

export const authService = {
  async login(email, password) {
    const { token, user } = await request('auth', '/login', { method: 'POST', body: { email, password } })
    setToken(token)
    return toUser(user)
  },

  async register({ email, password, name }) {
    const { token, user } = await request('auth', '/register', { method: 'POST', body: { email, password, full_name: name } })
    setToken(token)
    return toUser(user)
  },

  async me() {
    return toUser(await request('auth', '/me'))
  },

  logout() {
    setToken(null)
  },
}
