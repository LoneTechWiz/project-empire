import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      navigate('/nation/create')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 60 }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Create Account</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="form-group"><label>Username</label>
          <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required minLength={3} maxLength={20} />
        </div>
        <div className="form-group"><label>Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div className="form-group"><label>Password</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Creating account…' : 'Register'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text2)' }}>
        Have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}
