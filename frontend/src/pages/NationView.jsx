import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function NationView() {
  const { id } = useParams()
  const { nation } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['nation', id],
    queryFn: () => api.get(`/nations/${id}`).then(r => r.data.data),
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">Nation not found.</div>

  const n = data.nation
  const isOwn = nation?.id === n.id

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{n.continent} · {n.governmentType} · Color: {n.color}</div>
          <h1 className="page-title">{n.name}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>Led by {n.leaderName}</div>
          {n.alliance && <div style={{ marginTop: 4, fontSize: 13 }}>
            <Link to={`/alliances/${n.allianceId}`}>{n.allianceName}</Link>
            <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {n.alliancePosition}</span>
          </div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isOwn && nation && <>
            <button className="btn btn-danger btn-sm" onClick={() => navigate(`/wars?declare=${n.id}`)}>Declare War</button>
            <Link to={`/messages?compose=${n.id}&name=${encodeURIComponent(n.name)}`} className="btn btn-ghost btn-sm">Send Message</Link>
          </>}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card"><div className="stat-label">Score</div><div className="stat-value">{fmt(n.score)}</div></div>
        <div className="card"><div className="stat-label">Cities</div><div className="stat-value">{data.cityCount}</div></div>
        <div className="card"><div className="stat-label">Active Wars</div><div className="stat-value">{data.activeWarCount}</div></div>
        <div className="card"><div className="stat-label">Rank</div><div className="stat-value">#{data.rank ?? '?'}</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Military</div>
          {[['Soldiers', n.soldiers], ['Tanks', n.tanks], ['Aircraft', n.aircraft], ['Ships', n.ships], ['Missiles', n.missiles], ['Nukes', n.nukes]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{k}</span><span>{fmt(v)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>War Record</div>
          {[['Offensive Wins', n.offensiveWarsWon], ['Offensive Losses', n.offensiveWarsLost], ['Defensive Wins', n.defensiveWarsWon], ['Defensive Losses', n.defensiveWarsLost], ['Soldier Casualties', n.soldierCasualties]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{k}</span><span>{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.recentActivity?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent Activity</div>
          {data.recentActivity.map(a => (
            <div key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)' }}>{a.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
