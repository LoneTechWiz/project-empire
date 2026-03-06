import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ResIcon from '../components/ResIcon'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function Trade() {
  const qc = useQueryClient()
  const { nation } = useAuth()
  const [tab, setTab] = useState('market')
  const [filterResource, setFilterResource] = useState('')
  const [filterType, setFilterType] = useState('')
  const [form, setForm] = useState({ resource: 'food', quantity: '', pricePerUnit: '', offerType: 'sell' })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['trade', filterResource, filterType],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterResource) params.set('resource', filterResource)
      if (filterType) params.set('type', filterType)
      return api.get(`/trade?${params}`).then(r => r.data.data)
    },
  })

  const create = useMutation({
    mutationFn: body => api.post('/trade', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trade'] }); setForm(f => ({ ...f, quantity: '', pricePerUnit: '' })) },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const accept = useMutation({
    mutationFn: ({ id, quantity }) => api.post(`/trade/${id}/accept`, { quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trade'] }); qc.invalidateQueries({ queryKey: ['nation-mine'] }) },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const cancel = useMutation({
    mutationFn: id => api.post(`/trade/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trade'] }),
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>

  const myOffers = data?.offers?.filter(o => o.nation?.id === nation?.id || o.nationId === nation?.id) || []
  const otherOffers = data?.offers?.filter(o => o.nation?.id !== nation?.id && o.nationId !== nation?.id) || []

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Trade Market</h1>

      <div className="tab-bar">
        {['market','create','history'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'market' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Market Prices (7-day avg)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {data?.resources?.map(r => (
                <div key={r} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}><ResIcon r={r} size={22}/></div>
                  <div style={{ fontWeight: 600 }}>${fmt(data?.marketPrices?.[r])}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>base ${fmt(data?.basePrices?.[r])}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select value={filterResource} onChange={e => setFilterResource(e.target.value)} style={{ width: 160 }}>
              <option value="">All Resources</option>
              {data?.resources?.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 120 }}>
              <option value="">All Types</option>
              <option value="buy">Buy Offers</option>
              <option value="sell">Sell Offers</option>
            </select>
          </div>

          {myOffers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>My Active Offers</div>
              <OffersTable offers={myOffers} onCancel={id => cancel.mutate(id)} isOwn />
            </div>
          )}

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Active Offers</div>
            <OffersTable offers={otherOffers} onAccept={(id, quantity) => accept.mutate({ id, quantity })} />
          </div>
        </>
      )}

      {tab === 'create' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Create Trade Offer</div>
          <div className="form-group"><label>Offer Type</label>
            <select value={form.offerType} onChange={e => setForm(f => ({ ...f, offerType: e.target.value }))}>
              <option value="sell">Sell</option>
              <option value="buy">Buy</option>
            </select>
          </div>
          <div className="form-group"><label>Resource</label>
            <select value={form.resource} onChange={e => setForm(f => ({ ...f, resource: e.target.value }))}>
              {data?.resources?.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group"><label>Quantity</label>
              <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="form-group"><label>Price Per Unit ($)</label>
              <input type="number" min={0.01} step={0.01} value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
            </div>
          </div>
          {form.quantity && form.pricePerUnit && (
            <div style={{ marginBottom: 12, color: 'var(--text2)', fontSize: 13 }}>
              Total: ${fmt(parseFloat(form.quantity) * parseFloat(form.pricePerUnit))}
            </div>
          )}
          <button className="btn" onClick={() => { setError(''); create.mutate(form) }} disabled={create.isPending || !form.quantity || !form.pricePerUnit}>
            {create.isPending ? 'Posting…' : 'Post Offer'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent Trades</div>
          <table>
            <thead><tr><th>Resource</th><th>Qty</th><th>Price</th><th>Total</th><th>Buyer</th><th>Seller</th><th>Date</th></tr></thead>
            <tbody>
              {data?.recentTrades?.map(t => (
                <tr key={t.id}>
                  <td><ResIcon r={t.resource} size={22}/></td>
                  <td>{fmt(t.quantity)}</td>
                  <td>${fmt(t.pricePerUnit)}</td>
                  <td>${fmt(t.total)}</td>
                  <td><Link to={`/nations/${t.buyer?.id}`}>{t.buyer?.name}</Link></td>
                  <td><Link to={`/nations/${t.seller?.id}`}>{t.seller?.name}</Link></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(t.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OfferRow({ o, onAccept, onCancel, isOwn }) {
  const [qty, setQty] = useState(String(o.quantity))
  const parsedQty = parseFloat(qty)
  const valid = !isNaN(parsedQty) && parsedQty > 0 && parsedQty <= o.quantity

  return (
    <tr key={o.id}>
      <td><span className={`badge badge-${o.offerType === 'sell' ? 'red' : 'green'}`}>{o.offerType.toUpperCase()}</span></td>
      <td><ResIcon r={o.resource} size={22}/></td>
      <td>{Number(o.quantity).toLocaleString()}</td>
      <td>${Number(o.pricePerUnit).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      <td>${Number(o.quantity * o.pricePerUnit).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
      <td><Link to={`/nations/${o.nation?.id}`}>{o.nation?.name}</Link></td>
      <td>
        {isOwn
          ? <button className="btn btn-danger btn-sm" onClick={() => onCancel(o.id)}>Cancel</button>
          : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="number" min={0.01} max={o.quantity} step="any"
                value={qty} onChange={e => setQty(e.target.value)}
                style={{ width: 80, padding: '3px 6px' }}
              />
              <button className="btn btn-sm" onClick={() => onAccept(o.id, parsedQty)} disabled={!valid}>
                {o.offerType === 'sell' ? 'Buy' : 'Sell'}
              </button>
            </div>
          )
        }
      </td>
    </tr>
  )
}

function OffersTable({ offers, onAccept, onCancel, isOwn }) {
  if (!offers?.length) return <div style={{ color: 'var(--text2)', fontSize: 13 }}>No offers.</div>
  return (
    <table>
      <thead><tr><th>Type</th><th>Resource</th><th>Qty</th><th>Price</th><th>Total</th><th>Nation</th><th></th></tr></thead>
      <tbody>
        {offers.map(o => (
          <OfferRow key={o.id} o={o} onAccept={onAccept} onCancel={onCancel} isOwn={isOwn} />
        ))}
      </tbody>
    </table>
  )
}
