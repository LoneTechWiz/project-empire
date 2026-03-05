import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const CONTINENTS = ['North America','South America','Europe','Africa','Asia','Australia','Antarctica']
const GOVERNMENTS = ['Democracy','Monarchy','Oligarchy','Theocracy','Republic','Dictatorship','Anarchy']
const COLORS = ['aqua','black','blue','brown','gray','green','lime','maroon','olive','orange','pink','purple','red','teal','white','yellow']

export default function NationCreate() {
  const { refreshNation } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', leaderName: '', continent: 'North America', color: 'blue', governmentType: 'Democracy', capital: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post('/nations', form)
      await refreshNation()
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create nation.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ maxWidth: 560, paddingTop: 40 }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Found Your Nation</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="grid-2">
          <div className="form-group"><label>Nation Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required maxLength={50} />
          </div>
          <div className="form-group"><label>Leader Name</label>
            <input value={form.leaderName} onChange={e => set('leaderName', e.target.value)} required maxLength={50} />
          </div>
          <div className="form-group"><label>Capital City</label>
            <input value={form.capital} onChange={e => set('capital', e.target.value)} required maxLength={50} />
          </div>
          <div className="form-group"><label>Continent</label>
            <select value={form.continent} onChange={e => set('continent', e.target.value)}>
              {CONTINENTS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Government Type</label>
            <select value={form.governmentType} onChange={e => set('governmentType', e.target.value)}>
              {GOVERNMENTS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Nation Color</label>
            <select value={form.color} onChange={e => set('color', e.target.value)}>
              {COLORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label>Flag URL (optional)</label>
          <input value={form.flagUrl || ''} onChange={e => set('flagUrl', e.target.value)} placeholder="https://..." />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Founding…' : 'Found Nation'}
        </button>
      </form>
    </div>
  )
}
