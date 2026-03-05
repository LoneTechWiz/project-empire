import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Rankings() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'nations')
  const [category, setCategory] = useState('score')

  const { data: nations, isLoading: nLoading } = useQuery({
    queryKey: ['rankings-nations', category],
    queryFn: () => api.get(`/rankings/nations?category=${category}`).then(r => r.data.data),
    enabled: tab === 'nations',
  })
  const { data: alliances, isLoading: aLoading } = useQuery({
    queryKey: ['rankings-alliances'],
    queryFn: () => api.get('/rankings/alliances').then(r => r.data.data),
    enabled: tab === 'alliances',
  })

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Rankings</h1>
      <div className="tab-bar">
        <div className={`tab ${tab === 'nations' ? 'active' : ''}`} onClick={() => setTab('nations')}>Nations</div>
        <div className={`tab ${tab === 'alliances' ? 'active' : ''}`} onClick={() => setTab('alliances')}>Alliances</div>
      </div>

      {tab === 'nations' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['score','soldiers','tanks','aircraft','ships'].map(c => (
              <button key={c} className={`btn btn-sm ${category === c ? '' : 'btn-ghost'}`}
                onClick={() => setCategory(c)} style={{ textTransform: 'capitalize' }}>{c}</button>
            ))}
          </div>
          <div className="card">
            {nLoading ? <div className="loading">Loading…</div> : (
              <table>
                <thead><tr><th>#</th><th>Nation</th><th>Score</th><th>Cities</th><th>Soldiers</th><th>Tanks</th><th>Aircraft</th><th>Alliance</th></tr></thead>
                <tbody>
                  {nations?.map(n => (
                    <tr key={n.id}>
                      <td style={{ color: 'var(--text2)', fontWeight: n.rank <= 3 ? 700 : 400 }}>#{n.rank}</td>
                      <td>
                        <Link to={`/nations/${n.id}`} style={{ fontWeight: 600 }}>{n.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{n.leaderName}</div>
                      </td>
                      <td>{fmt(n.score)}</td>
                      <td>{n.cityCount}</td>
                      <td>{fmt(n.soldiers)}</td>
                      <td>{fmt(n.tanks)}</td>
                      <td>{fmt(n.aircraft)}</td>
                      <td>{n.allianceName ? <Link to={`/alliances/${n.allianceId}`}>{n.allianceName}</Link> : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'alliances' && (
        <div className="card">
          {aLoading ? <div className="loading">Loading…</div> : (
            <table>
              <thead><tr><th>#</th><th>Alliance</th><th>Members</th><th>Total Score</th><th>Color</th></tr></thead>
              <tbody>
                {alliances?.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text2)', fontWeight: a.rank <= 3 ? 700 : 400 }}>#{a.rank}</td>
                    <td>
                      <Link to={`/alliances/${a.id}`} style={{ fontWeight: 600 }}>{a.name}</Link>
                      <span style={{ color: 'var(--text2)', marginLeft: 8, fontSize: 12 }}>[{a.acronym}]</span>
                    </td>
                    <td>{a.memberCount}</td>
                    <td>{fmt(a.totalScore)}</td>
                    <td><span style={{ background: a.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#000' }}>{a.color}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
