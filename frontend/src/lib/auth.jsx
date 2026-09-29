import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTok] = useState(getToken())
  const [user, setUser] = useState(null)

  useEffect(() => {
    const onUnauthorized = () => { setTok(null); setUser(null) }
    window.addEventListener('ecotrack:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ecotrack:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (token && !user) api('/api/account/').then(setUser).catch(() => {})
  }, [token, user])

  const login = useCallback(async (username, password) => {
    const data = await api('/api/auth/login/', { method: 'POST', body: { username, password } })
    setToken(data.token)
    setTok(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try { await api('/api/auth/logout/', { method: 'POST' }) } catch { /* token may already be gone */ }
    setToken(null)
    setTok(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
