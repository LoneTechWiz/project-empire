import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function AllianceDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { nation, refreshNation } = useAuth()
  const [tab, setTab] = useState('members')
  const [error, setError] = useState('')
  const [deposit, setDeposit] = useState({})
  const [withdraw, setWithdraw] = useState({})
  const [withdrawTarget, setWithdrawTarget] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['alliance', id],
    queryFn: () => api.get(`/alliances/${id}`).then(r => r.data.data),
  })

  const apply = useMutation({ mutationFn: () => api.post(`/alliances/${id}/apply`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['alliance', id] }); refreshNation() }, onError: err => setError(err.response?.data?.message || 'Failed.') })
  const leave = useMutation({ mutationFn: () => api.post(`/alliances/${id}/leave`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['alliance', id] }); refreshNation(); navigate('/alliances') }, onError: err => setError(err.response?.data?.message || 'Failed.') })
  const acceptMember = useMutation({ mutationFn: nid => api.post(`/alliances/${id}/accept/${nid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['alliance', id] }), onError: err => setError(err.response?.data?.message || 'Failed.') })
  const rejectMember = useMutation({ mutationFn: nid => api.post(`/alliances/${id}/reject/${nid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['alliance', id] }), onError: err => setError(err.response?.data?.message || 'Failed.') })
  const depositMut = useMutation({ mutationFn: body => api.post(`/alliances/${id}/bank/deposit`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['alliance', id] }); refreshNation(); setDeposit({}) }, onError: err => setError(err.response?.data?.message || 'Failed.') })
  const withdrawMut = useMutation({ mutationFn: body => api.post(`/alliances/${id}/bank/withdraw`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['alliance', id] }); setWithdraw({}) }, onError: err => setError(err.response?.data?.message || 'Failed.') })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">Alliance not found.</div>

  const { alliance, members, applicants, totalScore } = data
  const myNation = nation
  const isMember = myNation?.alliance?.id === alliance.id || myNation?.allianceId === parseInt(id)
  const isOfficer = isMember && ['Leader', 'Heir', 'Officer'].includes(myNation?.alliancePosition)
  const isLeader = isMember && ['Leader', 'Heir'].includes(myNation?.alliancePosition)

  const RESOURCES = ['money','food','coal','oil','steel','aluminum']

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}><Link to="/alliances" style={{ color: 'var(--text2)', fontSize: 13 }}>← Alliances</Link></div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{alliance.name}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>[{alliance.acronym}] · {members.length} members · Score: {fmt(totalScore)}</div>
          {alliance.description && <p style={{ marginTop: 8, color: 'var(--text2)', fontSize: 13, maxWidth: 600 }}>{alliance.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {myNation && !isMember && !myNation.alliance && (
            <button className="btn" onClick={() => apply.mutate()} disabled={apply.isPending}>Apply to Join</button>
          )}
          {isMember && myNation?.alliancePosition !== 'Leader' && (
            <button className="btn btn-danger" onClick={() => leave.mutate()} disabled={leave.isPending}>Leave</button>
          )}
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tab-bar">
        {['members','bank','applicants'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {tab === 'members' && (
        <div className="card">
          <table>
            <thead><tr><th>#</th><th>Nation</th><th>Leader</th><th>Score</th><th>Position</th></tr></thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
                  <td><Link to={`/nations/${m.id}`}>{m.name}</Link></td>
                  <td style={{ color: 'var(--text2)' }}>{m.leaderName}</td>
                  <td>{fmt(m.score)}</td>
                  <td><span className={`badge badge-${m.alliancePosition === 'Leader' ? 'yellow' : m.alliancePosition === 'Officer' ? 'blue' : 'gray'}`}>{m.alliancePosition}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bank' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Alliance Bank</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px' }}>
              {RESOURCES.map(r => (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{r}</span>
                  <span>{fmt(alliance['bank' + r.charAt(0).toUpperCase() + r.slice(1)])}</span>
                </div>
              ))}
            </div>
          </div>
          {isMember && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Deposit</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {RESOURCES.map(r => (
                  <div key={r} className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ textTransform: 'capitalize' }}>{r}</label>
                    <input type="number" min={0} value={deposit[r] || ''} onChange={e => setDeposit(d => ({ ...d, [r]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => depositMut.mutate(deposit)} disabled={depositMut.isPending}>Deposit</button>
            </div>
          )}
          {isOfficer && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Withdraw</div>
              <div className="form-group"><label>Target Nation ID</label>
                <input type="number" value={withdrawTarget} onChange={e => setWithdrawTarget(e.target.value)} placeholder="Nation ID" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {RESOURCES.map(r => (
                  <div key={r} className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ textTransform: 'capitalize' }}>{r}</label>
                    <input type="number" min={0} value={withdraw[r] || ''} onChange={e => setWithdraw(d => ({ ...d, [r]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => withdrawMut.mutate({ targetNationId: withdrawTarget, resources: withdraw })} disabled={withdrawMut.isPending}>Withdraw</button>
            </div>
          )}
        </div>
      )}

      {tab === 'applicants' && (
        <div className="card">
          {applicants?.length === 0 ? (
            <div style={{ color: 'var(--text2)' }}>No pending applications.</div>
          ) : (
            <table>
              <thead><tr><th>Nation</th><th>Leader</th><th>Score</th>{isOfficer && <th>Actions</th>}</tr></thead>
              <tbody>
                {applicants?.map(m => (
                  <tr key={m.id}>
                    <td><Link to={`/nations/${m.id}`}>{m.name}</Link></td>
                    <td>{m.leaderName}</td>
                    <td>{fmt(m.score)}</td>
                    {isOfficer && <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => acceptMember.mutate(m.id)}>Accept</button>
                        <button className="btn btn-danger btn-sm" onClick={() => rejectMember.mutate(m.id)}>Reject</button>
                      </div>
                    </td>}
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
