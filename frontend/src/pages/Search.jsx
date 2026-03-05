import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}`).then(r => r.data.data),
    enabled: q.length > 0,
  })

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 24 }}>Search: "{q}"</h1>

      {isLoading && <div className="loading">Searching…</div>}

      {data?.nations?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Nations ({data.nations.length})</div>
          <table>
            <thead><tr><th>Nation</th><th>Leader</th><th>Score</th><th>Alliance</th><th></th></tr></thead>
            <tbody>
              {data.nations.map(n => (
                <tr key={n.id}>
                  <td><Link to={`/nations/${n.id}`} style={{ fontWeight: 600 }}>{n.name}</Link></td>
                  <td style={{ color: 'var(--text2)' }}>{n.leaderName}</td>
                  <td>{fmt(n.score)}</td>
                  <td>{n.alliance ? <Link to={`/alliances/${n.alliance.id}`}>{n.alliance.name}</Link> : '—'}</td>
                  <td><Link to={`/nations/${n.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.alliances?.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Alliances ({data.alliances.length})</div>
          <table>
            <thead><tr><th>Alliance</th><th>Acronym</th><th>Color</th><th></th></tr></thead>
            <tbody>
              {data.alliances.map(a => (
                <tr key={a.id}>
                  <td><Link to={`/alliances/${a.id}`} style={{ fontWeight: 600 }}>{a.name}</Link></td>
                  <td style={{ color: 'var(--text2)' }}>[{a.acronym}]</td>
                  <td><span style={{ background: a.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#000' }}>{a.color}</span></td>
                  <td><Link to={`/alliances/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.nations?.length === 0 && data.alliances?.length === 0 && (
        <div className="card" style={{ color: 'var(--text2)', textAlign: 'center', padding: 40 }}>
          No results found for "{q}".
        </div>
      )}
    </div>
  )
}
