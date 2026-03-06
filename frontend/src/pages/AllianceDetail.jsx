import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ResIcon from '../components/ResIcon'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

const TREATY_TYPES = ['NAP', 'MDP', 'ODP', 'Trade Agreement', 'Protectorate', 'PIAT']
const TREATY_LABELS = {
  NAP: 'Non-Aggression Pact',
  MDP: 'Mutual Defense Pact',
  ODP: 'Optional Defense Pact',
  'Trade Agreement': 'Trade Agreement',
  Protectorate: 'Protectorate',
  PIAT: 'Peace, Intelligence, Aid Treaty',
}

function positionBadge(pos) {
  if (pos === 'Leader') return 'badge-yellow'
  if (pos === 'Heir') return 'badge-yellow'
  if (pos === 'Officer') return 'badge-blue'
  if (pos === 'Applicant') return 'badge-gray'
  return 'badge-gray'
}

export default function AllianceDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { nation, refreshNation } = useAuth()
  const [tab, setTab] = useState('members')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['alliance', id],
    queryFn: () => api.get(`/alliances/${id}`).then(r => r.data.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['alliance', id] })

  const apply = useMutation({
    mutationFn: () => api.post(`/alliances/${id}/apply`),
    onSuccess: () => { invalidate(); refreshNation() },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const leave = useMutation({
    mutationFn: () => api.post(`/alliances/${id}/leave`),
    onSuccess: () => { invalidate(); refreshNation(); navigate('/alliances') },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  const customRoles = useMemo(() => {
    if (!data?.alliance) return []
    try { return JSON.parse(data.alliance.roles || '[]') } catch { return [] }
  }, [data?.alliance?.roles])

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">Alliance not found.</div>

  const { alliance, members, applicants, totalScore, treaties } = data

  const myNation = nation
  const isMember = myNation?.alliance?.id === alliance.id || myNation?.allianceId === parseInt(id)
  const isApplicant = isMember && myNation?.alliancePosition === 'Applicant'
  const isOfficer = isMember && !isApplicant && ['Leader', 'Heir', 'Officer'].includes(myNation?.alliancePosition)
  const isLeader = isMember && ['Leader', 'Heir'].includes(myNation?.alliancePosition)

  const RESOURCES = ['money', 'food', 'coal', 'oil', 'iron', 'bauxite', 'lead', 'uranium', 'gasoline', 'munitions', 'steel', 'aluminum']
  const tabs = ['members', 'roles', 'treaties', 'bank', ...(isOfficer ? ['applicants'] : [])]

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}>
        <Link to="/alliances" style={{ color: 'var(--text2)', fontSize: 13 }}>← Alliances</Link>
      </div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{alliance.name}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>
            [{alliance.acronym}] · {members.length} members · Score: {fmt(totalScore)}
          </div>
          {alliance.description && (
            <p style={{ marginTop: 8, color: 'var(--text2)', fontSize: 13, maxWidth: 600 }}>{alliance.description}</p>
          )}
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
      {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}

      <div className="tab-bar">
        {tabs.map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {tab === 'members' && (
        <MembersTab
          members={members} allianceId={id} isOfficer={isOfficer} isLeader={isLeader}
          myNation={myNation} customRoles={customRoles} invalidate={invalidate} setError={setError}
        />
      )}

      {tab === 'roles' && (
        <RolesTab
          alliance={alliance} allianceId={id} customRoles={customRoles}
          isLeader={isLeader} invalidate={invalidate} setError={setError}
        />
      )}

      {tab === 'treaties' && (
        <TreatiesTab
          treaties={treaties} allianceId={id} isOfficer={isOfficer}
          myNation={myNation} invalidate={invalidate} setError={setError}
        />
      )}

      {tab === 'bank' && (
        <BankTab
          alliance={alliance} allianceId={id} members={members}
          isMember={isMember && !isApplicant} isOfficer={isOfficer}
          invalidate={invalidate} setError={setError} refreshNation={refreshNation}
          RESOURCES={RESOURCES}
        />
      )}

      {tab === 'applicants' && isOfficer && (
        <ApplicantsTab
          applicants={applicants} allianceId={id} isOfficer={isOfficer}
          invalidate={invalidate} setError={setError}
        />
      )}
    </div>
  )
}

// ── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ members, allianceId, isOfficer, isLeader, myNation, customRoles, invalidate, setError }) {
  const assignRole = useMutation({
    mutationFn: ({ nationId, role }) => api.post(`/alliances/${allianceId}/members/${nationId}/role`, { role }),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  const roleOptions = useMemo(() => {
    const opts = ['Member', 'Officer', ...customRoles]
    if (isLeader) opts.push('Heir')
    return opts
  }, [customRoles, isLeader])

  return (
    <div className="card">
      {/* Desktop table */}
      <table className="mobile-card-table">
        <thead>
          <tr>
            <th>#</th><th>Nation</th><th>Leader</th><th>Score</th><th>Role</th>
            {isOfficer && <th>Assign Role</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id}>
              <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
              <td><Link to={`/nations/${m.id}`}>{m.name}</Link></td>
              <td style={{ color: 'var(--text2)' }}>{m.leaderName}</td>
              <td>{fmt(m.score)}</td>
              <td><span className={`badge ${positionBadge(m.alliancePosition)}`}>{m.alliancePosition}</span></td>
              {isOfficer && (
                <td>
                  {m.alliancePosition !== 'Leader' || isLeader ? (
                    <select
                      value={m.alliancePosition}
                      onChange={e => assignRole.mutate({ nationId: m.id, role: e.target.value })}
                      style={{ width: 'auto', padding: '3px 8px' }}
                      disabled={assignRole.isPending}
                    >
                      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : <span style={{ color: 'var(--text2)', fontSize: 12 }}>—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="mobile-card-list">
        {members.map((m, i) => (
          <div key={m.id} className="mobile-card-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>#{i + 1} </span>
                <Link to={`/nations/${m.id}`} style={{ fontWeight: 600 }}>{m.name}</Link>
              </div>
              <span className={`badge ${positionBadge(m.alliancePosition)}`}>{m.alliancePosition}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: isOfficer ? 8 : 0 }}>
              {m.leaderName} · Score {fmt(m.score)}
            </div>
            {isOfficer && m.alliancePosition !== 'Leader' && (
              <select
                value={m.alliancePosition}
                onChange={e => assignRole.mutate({ nationId: m.id, role: e.target.value })}
                style={{ width: '100%', padding: '4px 8px' }}
                disabled={assignRole.isPending}
              >
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ alliance, allianceId, customRoles, isLeader, invalidate, setError }) {
  const [newRole, setNewRole] = useState('')

  const addRole = useMutation({
    mutationFn: name => api.post(`/alliances/${allianceId}/roles`, { name }),
    onSuccess: () => { invalidate(); setNewRole('') },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const removeRole = useMutation({
    mutationFn: name => api.delete(`/alliances/${allianceId}/roles`, { data: { name } }),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  const STANDARD = ['Leader', 'Heir', 'Officer', 'Member']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Standard Roles</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STANDARD.map(r => (
            <div key={r} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 14px', fontSize: 13 }}>
              <span className={`badge ${positionBadge(r)}`} style={{ marginRight: 6 }}>{r}</span>
              <span style={{ color: 'var(--text2)', fontSize: 11 }}>
                {r === 'Leader' ? 'Full control' : r === 'Heir' ? 'Same as Leader' : r === 'Officer' ? 'Accept/reject, bank, assign roles' : 'Basic member'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Custom Roles</div>
        {customRoles.length === 0 && (
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>No custom roles yet.</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isLeader ? 16 : 0 }}>
          {customRoles.map(role => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>
              <span>{role}</span>
              {isLeader && (
                <button
                  onClick={() => removeRole.mutate(role)}
                  disabled={removeRole.isPending}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1 }}
                >×</button>
              )}
            </div>
          ))}
        </div>
        {isLeader && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              placeholder="New role name…"
              style={{ maxWidth: 220 }}
              onKeyDown={e => e.key === 'Enter' && newRole.trim() && addRole.mutate(newRole.trim())}
            />
            <button className="btn btn-sm" onClick={() => addRole.mutate(newRole.trim())}
              disabled={addRole.isPending || !newRole.trim()}>
              Add Role
            </button>
          </div>
        )}
        {!isLeader && <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 8 }}>Only the Leader or Heir can manage custom roles.</div>}
      </div>
    </div>
  )
}

// ── Treaties Tab ─────────────────────────────────────────────────────────────

function TreatiesTab({ treaties, allianceId, isOfficer, invalidate, setError }) {
  const [type, setType] = useState('NAP')
  const [targetId, setTargetId] = useState('')
  const [terms, setTerms] = useState('')

  const { data: alliancesData } = useQuery({
    queryKey: ['alliances'],
    queryFn: () => api.get('/alliances').then(r => r.data.data),
    enabled: isOfficer,
  })
  const otherAlliances = alliancesData?.filter(a => String(a.alliance.id) !== allianceId) || []

  const propose = useMutation({
    mutationFn: () => api.post(`/alliances/${allianceId}/treaties`, {
      targetAllianceId: parseInt(targetId), type, terms
    }),
    onSuccess: () => { invalidate(); setTargetId(''); setTerms('') },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const accept = useMutation({
    mutationFn: tid => api.post(`/alliances/${allianceId}/treaties/${tid}/accept`),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const cancel = useMutation({
    mutationFn: tid => api.post(`/alliances/${allianceId}/treaties/${tid}/cancel`),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  const active = treaties?.filter(t => t.status === 'active') || []
  const pending = treaties?.filter(t => t.status === 'pending') || []
  const closed = treaties?.filter(t => ['cancelled', 'rejected'].includes(t.status)) || []

  const TreatyRow = ({ t }) => {
    const partner = t.proposer.id === parseInt(allianceId) ? t.receiver : t.proposer
    const isIncoming = t.receiver.id === parseInt(allianceId) && t.status === 'pending'
    const canCancel = isOfficer && ['pending', 'active'].includes(t.status) &&
      (t.proposer.id === parseInt(allianceId) || t.receiver.id === parseInt(allianceId))
    return (
      <tr>
        <td>
          <span className="badge badge-blue" style={{ marginRight: 4 }}>{t.type}</span>
          {t.terms && <span style={{ fontSize: 11, color: 'var(--text2)' }} title={t.terms}>has terms</span>}
        </td>
        <td><Link to={`/alliances/${partner.id}`}>{partner.name}</Link></td>
        <td>
          <span className={`badge badge-${t.status === 'active' ? 'green' : t.status === 'pending' ? 'yellow' : 'gray'}`}>
            {t.status === 'pending' && isIncoming ? 'incoming' : t.status}
          </span>
        </td>
        <td style={{ fontSize: 12, color: 'var(--text2)' }}>
          {new Date(t.proposedDate).toLocaleDateString()}
        </td>
        {isOfficer && (
          <td>
            <div style={{ display: 'flex', gap: 6 }}>
              {isIncoming && <button className="btn btn-success btn-sm" onClick={() => accept.mutate(t.id)} disabled={accept.isPending}>Accept</button>}
              {canCancel && <button className="btn btn-danger btn-sm" onClick={() => cancel.mutate(t.id)} disabled={cancel.isPending}>
                {isIncoming && t.status === 'pending' ? 'Reject' : 'Cancel'}
              </button>}
            </div>
          </td>
        )}
      </tr>
    )
  }

  const TreatyTable = ({ rows, title }) => (
    rows.length > 0 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
        <table>
          <thead><tr>
            <th>Type</th><th>Partner</th><th>Status</th><th>Date</th>
            {isOfficer && <th>Actions</th>}
          </tr></thead>
          <tbody>{rows.map(t => <TreatyRow key={t.id} t={t} />)}</tbody>
        </table>
      </div>
    )
  )

  return (
    <div>
      {active.length === 0 && pending.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--text2)' }}>No active treaties.</div>
        </div>
      )}
      <TreatyTable rows={active} title="Active Treaties" />
      <TreatyTable rows={pending} title="Pending Treaties" />
      <TreatyTable rows={closed} title="Closed Treaties" />

      {isOfficer && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Propose Treaty</div>
          <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Treaty Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                {TREATY_TYPES.map(t => <option key={t} value={t}>{TREATY_LABELS[t] || t} ({t})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Target Alliance</label>
              <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                <option value="">Select alliance…</option>
                {otherAlliances.map(({ alliance: a }) => (
                  <option key={a.id} value={a.id}>{a.name} [{a.acronym}]</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Terms / Notes (optional)</label>
            <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} placeholder="Any specific terms or conditions…" />
          </div>
          <button className="btn" onClick={() => propose.mutate()} disabled={propose.isPending || !targetId}>
            {propose.isPending ? 'Proposing…' : 'Propose Treaty'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Bank Tab ─────────────────────────────────────────────────────────────────

function BankTab({ alliance, allianceId, members, isMember, isOfficer, invalidate, setError, refreshNation, RESOURCES }) {
  const [deposit, setDeposit] = useState({})
  const [withdraw, setWithdraw] = useState({})
  const [withdrawTarget, setWithdrawTarget] = useState('')
  const [taxInput, setTaxInput] = useState(alliance.taxRate ?? 0)

  const depositMut = useMutation({
    mutationFn: body => api.post(`/alliances/${allianceId}/bank/deposit`, body),
    onSuccess: () => { invalidate(); refreshNation(); setDeposit({}) },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const withdrawMut = useMutation({
    mutationFn: body => api.post(`/alliances/${allianceId}/bank/withdraw`, body),
    onSuccess: () => { invalidate(); setWithdraw({}) },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const taxMut = useMutation({
    mutationFn: rate => api.post(`/alliances/${allianceId}/tax`, { taxRate: rate }),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Alliance Bank</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Tax Rate: <strong style={{ color: 'var(--text1)' }}>{alliance.taxRate ?? 0}%</strong>
            {isOfficer && (
              <span style={{ marginLeft: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number" min={0} max={50} value={taxInput}
                  onChange={e => setTaxInput(Number(e.target.value))}
                  style={{ width: 60, padding: '2px 6px', fontSize: 13 }}
                />
                <button className="btn btn-sm" onClick={() => taxMut.mutate(taxInput)} disabled={taxMut.isPending}>Set</button>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px' }}>
          {RESOURCES.map(r => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}><ResIcon r={r} size={18} /></span>
              <span>{r === 'money' ? '$' : ''}{fmt(alliance['bank' + r.charAt(0).toUpperCase() + r.slice(1)])}</span>
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
                <label><ResIcon r={r} size={18} /></label>
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
          <div className="form-group">
            <label>Target Nation</label>
            <select value={withdrawTarget} onChange={e => setWithdrawTarget(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Select member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {RESOURCES.map(r => (
              <div key={r} className="form-group" style={{ marginBottom: 0 }}>
                <label><ResIcon r={r} size={18} /></label>
                <input type="number" min={0} value={withdraw[r] || ''} onChange={e => setWithdraw(d => ({ ...d, [r]: parseFloat(e.target.value) || 0 }))} />
              </div>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 12 }}
            onClick={() => withdrawMut.mutate({ targetNationId: withdrawTarget, resources: withdraw })}
            disabled={withdrawMut.isPending || !withdrawTarget}>Withdraw</button>
        </div>
      )}
    </div>
  )
}

// ── Applicants Tab ───────────────────────────────────────────────────────────

function ApplicantsTab({ applicants, allianceId, isOfficer, invalidate, setError }) {
  const acceptMut = useMutation({
    mutationFn: nid => api.post(`/alliances/${allianceId}/accept/${nid}`),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })
  const rejectMut = useMutation({
    mutationFn: nid => api.post(`/alliances/${allianceId}/reject/${nid}`),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  return (
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
                {isOfficer && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm" onClick={() => acceptMut.mutate(m.id)} disabled={acceptMut.isPending}>Accept</button>
                      <button className="btn btn-danger btn-sm" onClick={() => rejectMut.mutate(m.id)} disabled={rejectMut.isPending}>Reject</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
