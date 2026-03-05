import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const COLORS = ['aqua','black','blue','brown','gray','green','lime','maroon','olive','orange','pink','purple','red','teal','white','yellow']

export default function AllianceCreate() {
  const { refreshNation } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', acronym: '', color: 'blue', description: '', forumLink: '', discordLink: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await api.post('/alliances', form)
      await refreshNation()
      navigate(`/alliances/${r.data.data.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create alliance.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ maxWidth: 560, paddingTop: 40 }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Create Alliance</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="grid-2">
          <div className="form-group"><label>Alliance Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required maxLength={100} />
          </div>
          <div className="form-group"><label>Acronym</label>
            <input value={form.acronym} onChange={e => set('acronym', e.target.value)} required maxLength={10} />
          </div>
          <div className="form-group"><label>Color</label>
            <select value={form.color} onChange={e => set('color', e.target.value)}>
              {COLORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label>Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="form-group"><label>Forum Link</label>
            <input value={form.forumLink} onChange={e => set('forumLink', e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group"><label>Discord Link</label>
            <input value={form.discordLink} onChange={e => set('discordLink', e.target.value)} placeholder="https://discord.gg/..." />
          </div>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Creating…' : 'Create Alliance'}
        </button>
      </form>
    </div>
  )
}
