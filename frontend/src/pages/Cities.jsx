import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function Cities() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then(r => r.data.data),
  })
  const [cityName, setCityName] = useState('')
  const [error, setError] = useState('')

  const buyCity = useMutation({
    mutationFn: name => api.post('/cities', { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cities'] }); qc.invalidateQueries({ queryKey: ['nation-mine'] }); setCityName('') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Cities</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={cityName} onChange={e => setCityName(e.target.value)} placeholder="New city name" style={{ width: 180 }} />
          <button onClick={() => { setError(''); buyCity.mutate(cityName) }} disabled={buyCity.isPending || !cityName.trim()}>
            Buy City (${fmt(data?.buyCost)})
          </button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-3">
        {data?.cities?.map(({ city, powered, powerAvailable, powerNeeded, commerce, production }) => (
          <Link key={city.id} to={`/cities/${city.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{city.name}</span>
                <span className={`badge badge-${powered ? 'green' : 'red'}`}>{powered ? 'Powered' : 'Unpowered'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>Infrastructure</span><span>{fmt(city.infrastructure)}</span>
                <span style={{ color: 'var(--text2)' }}>Land</span><span>{fmt(city.land)}</span>
                <span style={{ color: 'var(--text2)' }}>Commerce</span><span>{commerce}%</span>
                <span style={{ color: 'var(--text2)' }}>Power</span><span>{fmt(powerAvailable)}/{fmt(powerNeeded)}</span>
              </div>
              {production && Object.entries(production).filter(([, v]) => v !== 0).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text2)' }}>
                  {Object.entries(production).filter(([, v]) => v !== 0).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 8 }}>{k}: {v > 0 ? '+' : ''}{fmt(v)}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
