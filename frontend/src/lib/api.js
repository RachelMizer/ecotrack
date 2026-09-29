const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const TOKEN_KEY = 'ecotrack.token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable: session lasts until reload */ }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(API_URL + path)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Token ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Could not reach the EcoTrack server. Is the API running?', 0)
  }
  if (res.status === 401) {
    setToken(null)
    window.dispatchEvent(new Event('ecotrack:unauthorized'))
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.detail || (data && Object.values(data).flat().join(' ')) || `Request failed (${res.status})`
    throw new ApiError(msg, res.status)
  }
  return data
}
