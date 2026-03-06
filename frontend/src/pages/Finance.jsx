import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ResIcon from '../components/ResIcon'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })
const fmtSign = n => (n >= 0 ? '+' : '') + fmt(n)
const color = n => ({ color: n >= 0 ? 'var(--green)' : 'var(--red)' })

const RESOURCES = ['money', 'food', 'coal', 'oil', 'iron', 'bauxite', 'lead', 'uranium', 'gasoline', 'munitions', 'steel', 'aluminum']
const RESOURCE_LABEL = { money: '$' }

export default function Finance() {
  const { data, isLoading } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/nations/mine/finances').then(r => r.data.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">No data.</div>

  const { cities, militaryUpkeep, totals, warnings } = data

  // Split totals into revenue (positive) and expenditure (negative)
  const revenue = {}
  const expenditure = {}
  for (const [k, v] of Object.entries(totals)) {
    if (v > 0.001) revenue[k] = v
    else if (v < -0.001) expenditure[k] = v
  }

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Finance</h1>

      {warnings?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {warnings.map((w, i) => (
            <div key={i} className="alert alert-error">{w}</div>
          ))}
        </div>
      )}

      {/* Net summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Net Per Turn</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          {RESOURCES.filter(r => Math.abs(totals[r] || 0) > 0.001).map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>
                <ResIcon r={r} size={18} />
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, ...color(totals[r]) }}>
                {r === 'money' ? (totals[r] >= 0 ? '+$' : '-$') + fmt(Math.abs(totals[r])) : fmtSign(totals[r])}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        {/* Revenue */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--green)' }}>Revenue</div>
          {Object.keys(revenue).length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No revenue.</div>
            : Object.entries(revenue).map(([r, v]) => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}><ResIcon r={r} size={18} /></span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                  {r === 'money' ? '+$' + fmt(v) : '+' + fmt(v)}
                </span>
              </div>
            ))}
        </div>

        {/* Expenditure */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--red)' }}>Expenditure</div>
          {Object.keys(expenditure).length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No expenditure.</div>
            : Object.entries(expenditure).map(([r, v]) => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}><ResIcon r={r} size={18} /></span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                  {r === 'money' ? '-$' + fmt(Math.abs(v)) : fmt(v)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Military upkeep breakdown */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Military Upkeep</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
          {Object.entries(militaryUpkeep).filter(([, v]) => Math.abs(v) > 0.001).map(([r, v]) => (
            <div key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}><ResIcon r={r} size={18} /></span>
              <span style={{ fontWeight: 600, ...color(v) }}>
                {r === 'money' ? '-$' + fmt(Math.abs(v)) : fmt(v)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-city breakdown */}
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>City Breakdown</div>
      {cities.map(({ city, production, commerce, powered, deathRate, populationGrowth }) => (
        <div key={city.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <Link to={`/cities/${city.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{city.name}</Link>
              <span style={{ color: 'var(--text2)', fontSize: 12, marginLeft: 10 }}>
                {fmt(city.population)} pop · {commerce}% commerce · {Number(deathRate).toFixed(1)}% death rate
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <span style={{ color: powered ? 'var(--green)' : 'var(--red)' }}>{powered ? 'Powered' : 'Unpowered'}</span>
              <span style={{ ...color(populationGrowth) }}>{fmtSign(populationGrowth)} pop/turn</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
            {RESOURCES.filter(r => Math.abs(production[r] || 0) > 0.001).map(r => (
              <div key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text2)', fontSize: 11 }}><ResIcon r={r} size={18} /></span>
                <span style={{ fontSize: 12, fontWeight: 600, ...color(production[r]) }}>
                  {r === 'money'
                    ? (production[r] >= 0 ? '+$' : '-$') + fmt(Math.abs(production[r]))
                    : fmtSign(production[r])}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
