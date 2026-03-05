import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function Dashboard() {
  const { nation } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['nation-mine'],
    queryFn: () => api.get('/nations/mine').then(r => r.data.data),
  })
  const { data: cityData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then(r => r.data.data),
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">No nation found. <Link to="/nation/create">Create one</Link></div>

  const n = data.nation || data
  const resources = [
    ['Food', n.food], ['Coal', n.coal], ['Oil', n.oil], ['Iron', n.iron],
    ['Bauxite', n.bauxite], ['Lead', n.lead], ['Uranium', n.uranium],
    ['Gasoline', n.gasoline], ['Munitions', n.munitions], ['Steel', n.steel], ['Aluminum', n.aluminum],
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{n.continent} · {n.governmentType}</div>
          <h1 className="page-title">{n.name}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>Led by {n.leaderName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label">Score</div>
          <div className="stat-value">{fmt(n.score)}</div>
          {n.alliance && <div style={{ marginTop: 4, fontSize: 13 }}>
            <Link to={`/alliances/${n.allianceId || n.alliance?.id}`}>{n.allianceName || n.alliance?.name}</Link>
            <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {n.alliancePosition}</span>
          </div>}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Money" value={`$${fmt(n.money)}`} />
        <StatCard label="Cities" value={cityData?.cities?.length ?? 0} />
        <StatCard label="Turns" value={n.turns ?? 0} />
        {n.beigeTurns > 0
          ? <StatCard label="Beige Turns" value={n.beigeTurns} color="var(--yellow)" />
          : <StatCard label="Wars Won" value={(n.offensiveWarsWon ?? 0) + (n.defensiveWarsWon ?? 0)} />
        }
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Military</div>
          <div className="grid-2">
            {[['Soldiers', n.soldiers], ['Tanks', n.tanks], ['Aircraft', n.aircraft], ['Ships', n.ships], ['Spies', n.spies], ['Missiles', n.missiles], ['Nukes', n.nukes]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)' }}>{k}</span>
                <span>{fmt(v)}</span>
              </div>
            ))}
          </div>
          <Link to="/military" className="btn btn-sm btn-ghost" style={{ marginTop: 12 }}>Manage Military</Link>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Resources</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {resources.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)' }}>{k}</span>
                <span>{fmt(v)}</span>
              </div>
            ))}
          </div>
          <Link to="/trade" className="btn btn-sm btn-ghost" style={{ marginTop: 12 }}>Trade Resources</Link>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/cities" className="btn btn-ghost btn-sm">Manage Cities</Link>
          <Link to="/wars" className="btn btn-ghost btn-sm">War Room</Link>
          <Link to="/alliances" className="btn btn-ghost btn-sm">{n.alliance ? 'My Alliance' : 'Find Alliance'}</Link>
          <Link to="/trade" className="btn btn-ghost btn-sm">Trade Market</Link>
          <Link to="/messages" className="btn btn-ghost btn-sm">Messages</Link>
          <Link to={`/nations/${n.id}`} className="btn btn-ghost btn-sm">Public Profile</Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}
