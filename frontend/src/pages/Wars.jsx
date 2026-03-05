import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Wars() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const declareId = params.get('declare')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['wars'],
    queryFn: () => api.get('/wars').then(r => r.data.data),
  })

  const declare = useMutation({
    mutationFn: ({ targetId, reason }) => api.post(`/wars/declare/${targetId}`, { reason }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['wars'] }); navigate(`/wars/${r.data.data.id}`) },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">War Room</h1>
        <Link to="/rankings?tab=nations" className="btn btn-ghost btn-sm">Find Target</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {declareId && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--red)' }}>Declare War on Nation #{declareId}</div>
          <div className="form-group"><label>Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for war..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => declare.mutate({ targetId: declareId, reason })} disabled={declare.isPending}>
              {declare.isPending ? 'Declaring…' : 'Declare War'}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/wars')}>Cancel</button>
          </div>
        </div>
      )}

      <WarsTable title="Offensive Wars" wars={data?.offensive} type="offensive" />
      <WarsTable title="Defensive Wars" wars={data?.defensive} type="defensive" />

      {data?.past?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Past Wars</div>
          <table>
            <thead><tr><th>Opponent</th><th>Type</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {data.past.map(w => (
                <tr key={w.id}>
                  <td>{w.attacker?.name} vs {w.defender?.name}</td>
                  <td><span className="badge badge-gray">{w.status}</span></td>
                  <td>{w.endDate ? new Date(w.endDate).toLocaleDateString() : '—'}</td>
                  <td><Link to={`/wars/${w.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function WarsTable({ title, wars, type }) {
  if (!wars?.length) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ color: 'var(--text2)', fontSize: 13 }}>No active {title.toLowerCase()}.</div>
    </div>
  )
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <table>
        <thead><tr>
          <th>Attacker</th><th>Defender</th><th>Resistance</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {wars.map(w => (
            <tr key={w.id}>
              <td><Link to={`/nations/${w.attacker?.id}`}>{w.attacker?.name}</Link></td>
              <td><Link to={`/nations/${w.defender?.id}`}>{w.defender?.name}</Link></td>
              <td style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--red)' }}>{w.attackerResistance}</span>
                {' / '}
                <span style={{ color: 'var(--green)' }}>{w.defenderResistance}</span>
              </td>
              <td><span className="badge badge-yellow">{w.status}</span></td>
              <td><Link to={`/wars/${w.id}`} className="btn btn-sm">Attack</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
