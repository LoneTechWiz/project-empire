import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const fd = new FormData(e.target)
      const username = fd.get('username') || form.username
      const password = fd.get('password') || form.password
      const data = await login(username, password)
      navigate(data.nation ? '/dashboard' : '/nation/create')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 60 }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Login</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="form-group"><label>Username</label>
          <input name="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoCapitalize="none" autoCorrect="off" autoComplete="username" />
        </div>
        <div className="form-group"><label>Password</label>
          <input name="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoComplete="current-password" />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Logging in…' : 'Login'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text2)' }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}
