import { useState, useEffect } from 'react'
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

      <WarsTable title="Offensive Wars" wars={data?.offensive} attacksUsed={data?.attacksUsed} nextRegenAt={data?.nextRegenAt} />
      <WarsTable title="Defensive Wars" wars={data?.defensive} attacksUsed={data?.attacksUsed} nextRegenAt={data?.nextRegenAt} />

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

function MilSummary({ n }) {
  if (!n) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span>👥 {fmt(n.soldiers)}</span>
      <span>🛡 {fmt(n.tanks)}</span>
      <span>✈️ {fmt(n.aircraft)}</span>
      <span>🚢 {fmt(n.ships)}</span>
    </div>
  )
}

function useCountdown(targetMs) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!targetMs) return
    const update = () => {
      const ms = targetMs - Date.now()
      if (ms <= 0) { setDisplay('now'); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setDisplay(`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetMs])
  return display
}

function WarRow({ w, attacksUsed, nextRegenAt }) {
  const MAX_ATTACKS = 3
  const used = attacksUsed?.[w.id] ?? 0
  const remaining = MAX_ATTACKS - used
  const regenMs = nextRegenAt?.[w.id]
  const countdown = useCountdown(remaining < MAX_ATTACKS ? regenMs : null)
  return (
    <tr>
      <td><Link to={`/nations/${w.attacker?.id}`}>{w.attacker?.name}</Link></td>
      <td style={{ fontSize: 11, color: 'var(--text2)' }}><MilSummary n={w.attacker} /></td>
      <td><Link to={`/nations/${w.defender?.id}`}>{w.defender?.name}</Link></td>
      <td style={{ fontSize: 11, color: 'var(--text2)' }}><MilSummary n={w.defender} /></td>
      <td style={{ fontSize: 12 }}>
        <span style={{ color: 'var(--red)' }}>{w.attackerResistance}</span>
        {' / '}
        <span style={{ color: 'var(--green)' }}>{w.defenderResistance}</span>
      </td>
      <td style={{ fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[...Array(MAX_ATTACKS)].map((_, i) => (
            <span key={i} style={{ color: i < remaining ? 'var(--accent)' : 'var(--border)' }}>⚔</span>
          ))}
          <span style={{ color: 'var(--text2)' }}>{remaining}/{MAX_ATTACKS}</span>
        </div>
        {remaining < MAX_ATTACKS && countdown && (
          <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2 }}>+1 in {countdown}</div>
        )}
      </td>
      <td><Link to={`/wars/${w.id}`} className="btn btn-sm" style={remaining === 0 ? { opacity: 0.5 } : {}}>Attack</Link></td>
    </tr>
  )
}

function WarCard({ w, attacksUsed, nextRegenAt }) {
  const MAX_ATTACKS = 3
  const used = attacksUsed?.[w.id] ?? 0
  const remaining = MAX_ATTACKS - used
  const regenMs = nextRegenAt?.[w.id]
  const countdown = useCountdown(remaining < MAX_ATTACKS ? regenMs : null)
  return (
    <div className="mobile-card-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <Link to={`/nations/${w.attacker?.id}`} style={{ fontWeight: 600 }}>{w.attacker?.name}</Link>
          <span style={{ color: 'var(--text2)', margin: '0 6px' }}>vs</span>
          <Link to={`/nations/${w.defender?.id}`} style={{ fontWeight: 600 }}>{w.defender?.name}</Link>
        </div>
        <Link to={`/wars/${w.id}`} className="btn btn-sm" style={remaining === 0 ? { opacity: 0.5 } : {}}>Attack</Link>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
        <span>Resistance: <span style={{ color: 'var(--red)' }}>{w.attackerResistance}</span> / <span style={{ color: 'var(--green)' }}>{w.defenderResistance}</span></span>
        <span>
          {[...Array(MAX_ATTACKS)].map((_, i) => (
            <span key={i} style={{ color: i < remaining ? 'var(--accent)' : 'var(--border)' }}>⚔</span>
          ))} {remaining}/{MAX_ATTACKS}
        </span>
      </div>
      {remaining < MAX_ATTACKS && countdown && (
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>+1 charge in {countdown}</div>
      )}
    </div>
  )
}

function WarsTable({ title, wars, attacksUsed, nextRegenAt }) {
  if (!wars?.length) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ color: 'var(--text2)', fontSize: 13 }}>No active {title.toLowerCase()}.</div>
    </div>
  )
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Desktop table */}
      <div className="card mobile-card-table">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
        <table>
          <thead><tr>
            <th>Attacker</th><th>Military</th><th>Defender</th><th>Military</th><th>Resistance</th><th>Attacks</th><th></th>
          </tr></thead>
          <tbody>
            {wars.map(w => <WarRow key={w.id} w={w} attacksUsed={attacksUsed} nextRegenAt={nextRegenAt} />)}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="mobile-card-list">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
        {wars.map(w => <WarCard key={w.id} w={w} attacksUsed={attacksUsed} nextRegenAt={nextRegenAt} />)}
      </div>
    </div>
  )
}
