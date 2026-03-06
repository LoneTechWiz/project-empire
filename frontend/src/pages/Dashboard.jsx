import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

const RESOURCE_META = [
  { key: 'food', label: 'Food', icon: '🌾' },
  { key: 'coal', label: 'Coal', icon: '🪨' },
  { key: 'oil', label: 'Oil', icon: '🛢' },
  { key: 'iron', label: 'Iron', icon: '⚙️' },
  { key: 'bauxite', label: 'Bauxite', icon: '🪩' },
  { key: 'lead', label: 'Lead', icon: '🔩' },
  { key: 'uranium', label: 'Uranium', icon: '☢' },
  { key: 'gasoline', label: 'Gasoline', icon: '⛽' },
  { key: 'munitions', label: 'Munitions', icon: '💣' },
  { key: 'steel', label: 'Steel', icon: '🔧' },
  { key: 'aluminum', label: 'Aluminum', icon: '✈️' },
]

const MILITARY_META = [
  { key: 'soldiers', label: 'Soldiers', icon: '👥' },
  { key: 'tanks', label: 'Tanks', icon: '🚚' },
  { key: 'aircraft', label: 'Aircraft', icon: '✈️' },
  { key: 'ships', label: 'Ships', icon: '🚢' },
  { key: 'spies', label: 'Spies', icon: '🕵️' },
  { key: 'missiles', label: 'Missiles', icon: '🚀' },
  { key: 'nukes', label: 'Nukes', icon: '☢️' },
]

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

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
            {n.continent} · {n.governmentType}
            {n.religion && n.religion !== 'None' && ` · ${n.religion}`}
          </div>
          <h1 className="page-title">{n.name}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Led by {n.leaderName}</div>
          {n.alliance && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              <Link to={`/alliances/${n.allianceId || n.alliance?.id}`} style={{ fontWeight: 600 }}>
                {n.allianceName || n.alliance?.name}
              </Link>
              <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {n.alliancePosition}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label">Score</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(n.score)}</div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="💰 Treasury" value={`$${fmt(n.money)}`} accent />
        <StatCard label="🏙️ Cities" value={cityData?.cities?.length ?? 0} />
        <StatCard label="⚡ Turns" value={n.turns ?? 0} />
        {n.beigeTurns > 0
          ? <StatCard label="🛡 Beige" value={`${n.beigeTurns} turns`} color="var(--yellow)" />
          : <StatCard label="🏆 Wars Won" value={(n.offensiveWarsWon ?? 0) + (n.defensiveWarsWon ?? 0)} />
        }
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Military */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Military
            <Link to="/military" className="btn btn-sm btn-ghost">Manage →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
            {MILITARY_META.map(({ key, label, icon }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}><span style={{ marginRight: 5 }}>{icon}</span>{label}</span>
                <span style={{ fontWeight: 600 }}>{fmt(n[key])}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Resources
            <Link to="/trade" className="btn btn-sm btn-ghost">Trade →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
            {RESOURCE_META.map(({ key, label, icon }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}><span style={{ marginRight: 5 }}>{icon}</span>{label}</span>
                <span style={{ fontWeight: 600 }}>{fmt(n[key])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { to: '/cities', label: '🏙️ Manage Cities' },
            { to: '/wars', label: '⚔️ War Room' },
            { to: '/finance', label: '📊 Finances' },
            { to: '/alliances', label: n.alliance ? '🤝 My Alliance' : '🤝 Find Alliance' },
            { to: '/trade', label: '🛒 Trade Market' },
            { to: '/messages', label: '✉️ Messages' },
            { to: `/nations/${n.id}`, label: '👁 Public Profile' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="btn btn-ghost btn-sm">{label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, accent }) {
  return (
    <div className="card" style={accent ? { background: 'rgba(79,142,247,0.08)', borderColor: 'rgba(79,142,247,0.25)' } : {}}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || (accent ? 'var(--accent)' : 'var(--text)') }}>{value}</div>
    </div>
  )
}
