import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

const UNITS = [
  { key: 'soldiers',  label: 'Soldiers',  cost: '$5 + 0.01 food each' },
  { key: 'tanks',     label: 'Tanks',     cost: '$60 + 0.5 steel + 0.1 gas' },
  { key: 'aircraft',  label: 'Aircraft',  cost: '$4,000 + 5 alum + 5 gas' },
  { key: 'ships',     label: 'Ships',     cost: '$50,000 + 30 steel + 20 alum' },
  { key: 'spies',     label: 'Spies',     cost: '$50,000 each' },
  { key: 'missiles',  label: 'Missiles',  cost: '$150k + 100 alum + 75 gas + 75 mun' },
  { key: 'nukes',     label: 'Nukes',     cost: '$1.75M + 750 alum + 500 gas + 375 mun + 250 ura' },
]

export default function Military() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['military'],
    queryFn: () => api.get('/military').then(r => r.data.data),
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

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Unit</th><th>Current</th><th>Max</th><th>Cost</th><th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map(({ key, label, cost }) => (
              <tr key={key}>
                <td style={{ fontWeight: 600 }}>{label}</td>
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
