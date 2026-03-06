import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [nation, setNation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(r => { setUser(r.data.data.user); setNation(r.data.data.nation) })
      .catch(() => {
        // Do not clear the token here. The axios interceptor in client.js already
        // handles 401 (invalid/expired token) by removing the token and redirecting.
        // Clearing it here would log users out on network errors or server hiccups.
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', r.data.data.token)
    setUser({ id: r.data.data.userId, username: r.data.data.username })
    setNation(r.data.data.nation)
    return r.data.data
  }

  const register = async (username, email, password) => {
    const r = await api.post('/auth/register', { username, email, password })
    localStorage.setItem('token', r.data.data.token)
    setUser({ id: r.data.data.userId, username: r.data.data.username })
    setNation(null)
    return r.data.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setNation(null)
  }

  const refreshNation = async () => {
    const r = await api.get('/auth/me')
    setNation(r.data.data.nation)
  }

  return (
    <AuthContext.Provider value={{ user, nation, loading, login, register, logout, refreshNation }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
