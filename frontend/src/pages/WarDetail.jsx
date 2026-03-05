import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const ATTACK_TYPES = [
  { key: 'ground',    label: 'Ground Attack',   desc: 'Soldiers & tanks' },
  { key: 'airstrike', label: 'Air Strike',       desc: 'Aircraft' },
  { key: 'naval',     label: 'Naval Battle',     desc: 'Ships' },
  { key: 'missile',   label: 'Missile Strike',   desc: 'Uses 1 missile' },
  { key: 'nuke',      label: 'Nuclear Strike',   desc: 'Uses 1 nuke' },
]

export default function WarDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [attackType, setAttackType] = useState('ground')
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['war', id],
    queryFn: () => api.get(`/wars/${id}`).then(r => r.data.data),
  })

  const attack = useMutation({
    mutationFn: type => api.post(`/wars/${id}/attack`, { attackType: type }),
    onSuccess: r => { qc.invalidateQueries({ queryKey: ['war', id] }); setLastResult(r.data.data.attack) },
    onError: err => setError(err.response?.data?.message || 'Attack failed.')
  })
  const peace = useMutation({
    mutationFn: () => api.post(`/wars/${id}/peace`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['war', id] }); qc.invalidateQueries({ queryKey: ['wars'] }) },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const declinePeace = useMutation({
    mutationFn: () => api.post(`/wars/${id}/peace/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['war', id] }),
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">War not found.</div>

  const { war, attacks, isAttacker, isDefender, attacksUsed } = data
  const isParticipant = isAttacker || isDefender
  const canAttack = isParticipant && war.status === 'active' && attacksUsed < 3
  const myNationId = isAttacker ? war.attacker?.id : war.defender?.id
  const iOfferedPeace = war.peaceOfferedBy && war.peaceOfferedBy === myNationId
  const opponentOfferedPeace = war.peaceOfferedBy && war.peaceOfferedBy !== myNationId

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}><Link to="/wars" style={{ color: 'var(--text2)', fontSize: 13 }}>← Wars</Link></div>
      <div className="page-header">
        <div>
          <h1 className="page-title">War #{war.id}</h1>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>{war.reason || 'No reason given'}</div>
        </div>
        <span className={`badge badge-${war.status === 'active' ? 'yellow' : 'gray'}`} style={{ fontSize: 14, padding: '4px 12px' }}>
          {war.status.toUpperCase()}
        </span>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>ATTACKER</div>
          <Link to={`/nations/${war.attacker?.id}`} style={{ fontWeight: 700, fontSize: 18 }}>{war.attacker?.name}</Link>
          <div style={{ marginTop: 12 }}>
            <div className="stat-label">Resistance</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: war.attackerResistance < 30 ? 'var(--red)' : 'var(--text)' }}>{war.attackerResistance}</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>DEFENDER</div>
          <Link to={`/nations/${war.defender?.id}`} style={{ fontWeight: 700, fontSize: 18 }}>{war.defender?.name}</Link>
          <div style={{ marginTop: 12 }}>
            <div className="stat-label">Resistance</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: war.defenderResistance < 30 ? 'var(--red)' : 'var(--text)' }}>{war.defenderResistance}</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {lastResult && (
        <div className={`alert alert-${lastResult.success ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
          <strong>{lastResult.success ? 'Attack succeeded!' : 'Attack failed!'}</strong>
          {lastResult.attackerSoldierCasualties > 0 && <span> Your casualties: {fmt(lastResult.attackerSoldierCasualties)} soldiers.</span>}
          {lastResult.defenderSoldierCasualties > 0 && <span> Enemy casualties: {fmt(lastResult.defenderSoldierCasualties)} soldiers.</span>}
          {lastResult.moneyLooted > 0 && <span> Looted: ${fmt(lastResult.moneyLooted)}.</span>}
          {lastResult.infraDestroyed > 0 && <span> Infra destroyed: {fmt(lastResult.infraDestroyed)}.</span>}
        </div>
      )}

      {canAttack && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Launch Attack ({3 - attacksUsed} charges remaining)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {ATTACK_TYPES.map(t => (
              <button key={t.key} className={`btn btn-sm ${attackType === t.key ? '' : 'btn-ghost'}`}
                onClick={() => setAttackType(t.key)}>
                {t.label}
                <span style={{ fontSize: 11, opacity: .7 }}> ({t.desc})</span>
              </button>
            ))}
          </div>
          <button className="btn btn-danger" disabled={attack.isPending}
            onClick={() => { setError(''); setLastResult(null); attack.mutate(attackType) }}>
            {attack.isPending ? 'Attacking…' : `Launch ${ATTACK_TYPES.find(t => t.key === attackType)?.label}`}
          </button>
        </div>
      )}

      {isParticipant && war.status === 'active' && (
        <div style={{ marginBottom: 16 }}>
          {opponentOfferedPeace ? (
            <div className="card" style={{ borderColor: 'var(--accent)', padding: '12px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>🕊 Your opponent has offered peace</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" onClick={() => peace.mutate()} disabled={peace.isPending}>
                  Accept Peace
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => declinePeace.mutate()} disabled={declinePeace.isPending}>
                  Decline
                </button>
              </div>
            </div>
          ) : iOfferedPeace ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>🕊 Peace offer pending…</span>
              <button className="btn btn-ghost btn-sm" onClick={() => peace.mutate()} disabled={peace.isPending}>
                Withdraw Offer
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => peace.mutate()} disabled={peace.isPending}>
              {peace.isPending ? 'Sending…' : 'Offer Peace'}
            </button>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Attack Log</div>
        {attacks?.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>No attacks yet.</div>
        ) : (
          <table>
            <thead><tr><th>Attacker</th><th>Type</th><th>Result</th><th>Casualties</th><th>Date</th></tr></thead>
            <tbody>
              {attacks?.map(a => (
                <tr key={a.id}>
                  <td>{a.attacker?.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.attackType}</td>
                  <td><span className={`badge badge-${a.success ? 'green' : 'red'}`}>{a.success ? 'Success' : 'Failed'}</span></td>
                  <td style={{ fontSize: 12 }}>
                    A: {fmt(a.attackerSoldierCasualties)}s / D: {fmt(a.defenderSoldierCasualties)}s
                    {a.moneyLooted > 0 && ` / $${fmt(a.moneyLooted)}`}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(a.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
