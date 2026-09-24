// Thin fetch wrapper for the Fixline API: base URL, bearer token, JSON, and error envelope handling.

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'fixline.token'

let unauthorizedHandler = () => {}

/** Error thrown for any non-2xx response. `details` maps field names to messages. */
export class ApiError extends Error {
  constructor(status, { code = 'error', message = 'Something went wrong. Try again.', details = {} } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode); the session lasts until reload.
  }
}

/** Called when a signed-in request comes back 401, so the app can return to the sign-in screen. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

/** request('incidents', '/42/status', { method: 'POST', body: {...}, query: {...} }) */
export async function request(service, path = '', { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE_URL}/api/${service}${path}`, window.location.origin)
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const token = getToken()
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { code: 'network_error', message: "Can't reach the server. Check your connection and try again." })
  }

  if (res.status === 204) return null
  // Anything that isn't JSON (e.g. an HTML error page from a proxy or CDN) is treated as a failure.
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (res.ok && isJson) return data
  if (res.ok) throw new ApiError(502, { code: 'bad_response', message: 'The server sent an unexpected response. Try again.' })

  if (res.status === 401 && token) unauthorizedHandler()
  throw new ApiError(res.status, data?.error ?? { message: `Request failed (${res.status}). Try again.` })
}
