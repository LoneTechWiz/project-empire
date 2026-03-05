import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Alliances() {
  const { nation } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['alliances'],
    queryFn: () => api.get('/alliances').then(r => r.data.data),
  })

  if (isLoading) return <div className="loading">Loading…</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Alliances</h1>
        {nation && !nation.alliance && (
          <Link to="/alliances/create" className="btn">Create Alliance</Link>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>#</th><th>Alliance</th><th>Members</th><th>Color</th><th></th></tr>
          </thead>
          <tbody>
            {data?.map((item, i) => (
              <tr key={item.alliance.id}>
                <td style={{ color: 'var(--text2)', width: 40 }}>{i + 1}</td>
                <td>
                  <Link to={`/alliances/${item.alliance.id}`} style={{ fontWeight: 600 }}>{item.alliance.name}</Link>
                  <span style={{ color: 'var(--text2)', marginLeft: 8, fontSize: 12 }}>[{item.alliance.acronym}]</span>
                </td>
                <td>{fmt(item.memberCount)}</td>
                <td><span style={{ background: item.alliance.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#000' }}>{item.alliance.color}</span></td>
                <td><Link to={`/alliances/${item.alliance.id}`} className="btn btn-ghost btn-sm">View</Link></td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={5} style={{ color: 'var(--text2)', textAlign: 'center' }}>No alliances yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
