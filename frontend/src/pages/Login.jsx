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
      const data = await login(form.username, form.password)
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
          <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
        </div>
        <div className="form-group"><label>Password</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Logging in…' : 'Login'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text2)' }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}
