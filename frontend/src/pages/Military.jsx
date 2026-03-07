import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ResIcon from '../components/ResIcon'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })
const fmtMoney = n => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtSign = n => (n >= 0 ? '+' : '') + fmt(n)

const SPY_OPS = [
  { key: 'steal_money', label: 'Steal Money', desc: 'Steal up to 5% of target treasury (max $500k).' },
  { key: 'sabotage_infra', label: 'Sabotage Infrastructure', desc: 'Destroy 10–50 infrastructure in a random city.' },
  { key: 'gather_intel', label: 'Gather Intelligence', desc: 'Reveal full military composition of target.' },
]

function SpyOpsPanel({ spies }) {
  const [search, setSearch] = useState('')
  const [targetId, setTargetId] = useState(null)
  const [targetName, setTargetName] = useState('')
  const [op, setOp] = useState('steal_money')
  const [result, setResult] = useState(null)
  const searchTimer = useRef(null)

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['nation-search', search],
    queryFn: () => api.get(`/nations/search?q=${encodeURIComponent(search)}`).then(r => r.data.data),
    enabled: search.length >= 2,
  })

  const spyOp = useMutation({
    mutationFn: () => api.post('/military/spies/operation', { operation: op, targetNationId: targetId }),
    onSuccess: r => setResult(r.data.data),
    onError: err => setResult({ error: err.response?.data?.message || 'Operation failed.' }),
  })

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Spy Operations</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>You have {spies} spy{spies !== 1 ? 's' : ''} available. Failed operations lose 1 spy.</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {SPY_OPS.map(o => (
          <button
            key={o.key}
            className={`btn btn-sm${op === o.key ? '' : ' btn-ghost'}`}
            onClick={() => setOp(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        {SPY_OPS.find(o => o.key === op)?.desc}
      </div>

      <div style={{ position: 'relative', marginBottom: 12, maxWidth: 320 }}>
        <input
          value={targetName}
          onChange={e => {
            setTargetName(e.target.value)
            setTargetId(null)
            setSearch(e.target.value)
          }}
          placeholder="Search target nation…"
          style={{ width: '100%' }}
        />
        {search.length >= 2 && !targetId && searchResults?.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: 2, maxHeight: 200, overflowY: 'auto'
          }}>
            {searchResults.map(nation => (
              <div
                key={nation.id}
                onClick={() => { setTargetId(nation.id); setTargetName(nation.name); setSearch('') }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <strong>{nation.name}</strong>
                <span style={{ color: 'var(--text2)', fontSize: 11, marginLeft: 8 }}>{nation.leaderName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn"
        onClick={() => { setResult(null); spyOp.mutate() }}
        disabled={spyOp.isPending || !targetId}
      >
        {spyOp.isPending ? 'Executing…' : 'Execute Operation'}
      </button>

      {result && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 6,
          background: result.error ? 'rgba(239,68,68,0.1)' : result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${result.error || !result.success ? 'var(--red)' : 'var(--green)'}`,
          fontSize: 13
        }}>
          {result.error
            ? result.error
            : (
              <>
                <div style={{ fontWeight: 600, marginBottom: 6, color: result.success ? 'var(--green)' : 'var(--red)' }}>
                  {result.success ? 'Operation Successful' : 'Operation Failed'}
                </div>
                <div style={{ marginBottom: result.intel ? 8 : 0 }}>{result.message}</div>
                {result.intel && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8 }}>
                    {Object.entries(result.intel).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: 'var(--text2)', fontSize: 11, textTransform: 'capitalize' }}>{k}: </span>
                        <strong>{fmt(v)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      )}
    </div>
  )
}

const UNITS = [
  { key: 'soldiers',  label: 'Soldiers',  cost: '$5 + 0.01 food each',                              img: '/img/icons/military/soldiers.png' },
  { key: 'tanks',     label: 'Tanks',     cost: '$60 + 0.5 steel + 0.1 gas',                        img: '/img/icons/military/tanks.png' },
  { key: 'aircraft',  label: 'Aircraft',  cost: '$4,000 + 5 alum + 5 gas',                          img: '/img/icons/military/aircraft.png' },
  { key: 'ships',     label: 'Ships',     cost: '$50,000 + 30 steel + 20 alum',                     img: '/img/icons/military/ships.png' },
  { key: 'spies',     label: 'Spies',     cost: '$50,000 each',                                      img: '/img/icons/military/spies.png' },
  { key: 'missiles',  label: 'Missiles',  cost: '$150k + 100 alum + 75 gas + 75 mun',               img: '/img/icons/military/missiles.png' },
  { key: 'nukes',     label: 'Nukes',     cost: '$1.75M + 750 alum + 500 gas + 375 mun + 250 ura',  img: '/img/icons/military/nukes.png' },
]

export default function Military() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['military'],
    queryFn: () => api.get('/military').then(r => r.data.data),
  })
  const { data: financeData } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/nations/mine/finances').then(r => r.data.data),
  })
  const [qty, setQty] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const buy = useMutation({
    mutationFn: ({ unit, quantity }) => api.post('/military/buy', { unit, quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['military'] }); qc.invalidateQueries({ queryKey: ['nation-mine'] }); setSuccess('Purchased!'); setTimeout(() => setSuccess(''), 3000) },
    onError: err => setError(err.response?.data?.message || 'Purchase failed.')
  })
  const disband = useMutation({
    mutationFn: ({ unit, quantity }) => api.post('/military/disband', { unit, quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['military'] }); setSuccess('Disbanded.'); setTimeout(() => setSuccess(''), 3000) },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>
  const n = data?.nation
  const max = data?.max || {}

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 24 }}>Military</h1>
      {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Desktop table */}
      <div className="card mobile-card-table">
        <table>
          <thead>
            <tr>
              <th>Unit</th><th>Current</th><th>Max</th><th>Cost</th><th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map(({ key, label, cost, img }) => (
              <tr key={key}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={img} alt={label} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, background: 'var(--surface2)' }} />
                    <span style={{ fontWeight: 600 }}>{label}</span>
                  </div>
                </td>
                <td>{fmt(n?.[key] ?? 0)}</td>
                <td>{max[key] != null ? fmt(max[key]) : '∞'}</td>
                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{cost}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number" min={1} value={qty[key] || ''}
                      onChange={e => setQty(q => ({ ...q, [key]: e.target.value }))}
                      style={{ width: 70, padding: '4px 8px' }}
                      placeholder="Qty"
                    />
                    <button className="btn btn-sm btn-success" disabled={buy.isPending || !qty[key]}
                      onClick={() => { setError(''); buy.mutate({ unit: key, quantity: parseInt(qty[key]) }) }}>Buy</button>
                    <button className="btn btn-sm btn-danger" disabled={disband.isPending || !qty[key]}
                      onClick={() => { setError(''); disband.mutate({ unit: key, quantity: parseInt(qty[key]) }) }}>Disband</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-card-list">
        {UNITS.map(({ key, label, cost, img }) => (
          <div key={key} className="mobile-card-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={img} alt={label} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, background: 'var(--surface2)' }} />
                <span style={{ fontWeight: 600 }}>{label}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                {fmt(n?.[key] ?? 0)} / {max[key] != null ? fmt(max[key]) : '∞'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{cost}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number" min={1} value={qty[key] || ''}
                onChange={e => setQty(q => ({ ...q, [key]: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px' }}
                placeholder="Quantity"
              />
              <button className="btn btn-sm btn-success" disabled={buy.isPending || !qty[key]}
                onClick={() => { setError(''); buy.mutate({ unit: key, quantity: parseInt(qty[key]) }) }}>Buy</button>
              <button className="btn btn-sm btn-danger" disabled={disband.isPending || !qty[key]}
                onClick={() => { setError(''); disband.mutate({ unit: key, quantity: parseInt(qty[key]) }) }}>Disband</button>
            </div>
          </div>
        ))}
      </div>

      {(n?.spies ?? 0) > 0 && <SpyOpsPanel spies={n.spies} />}

      {financeData?.militaryUpkeep && Object.values(financeData.militaryUpkeep).some(v => Math.abs(v) > 0.001) && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Daily Upkeep Cost</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>Per turn × 144 turns/day</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
            {Object.entries(financeData.militaryUpkeep).filter(([, v]) => Math.abs(v) > 0.001).map(([r, v]) => (
              <div key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ResIcon r={r} size={22} />
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--red)' }}>
                    {r === 'money' ? '-$' + fmt(Math.abs(v * 144)) : fmtSign(v * 144)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>
                    /day
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>War Stats</div>
          {[['Offensive Wins', n?.offensiveWarsWon], ['Offensive Losses', n?.offensiveWarsLost], ['Defensive Wins', n?.defensiveWarsWon], ['Defensive Losses', n?.defensiveWarsLost]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{k}</span><span>{fmt(v)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Casualties</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text2)' }}>Soldier Casualties</span><span>{fmt(n?.soldierCasualties)}</span>
          </div>
          {n?.beigeTurns > 0 && (
            <div style={{ marginTop: 8, padding: 10, background: '#422006', border: '1px solid #ca8a04', borderRadius: 6, fontSize: 13 }}>
              Beige protection: {n.beigeTurns} turns remaining
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
