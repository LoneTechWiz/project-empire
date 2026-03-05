import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

const IMP_LABELS = {
  impCoalpower:'Coal Power Plant', impOilpower:'Oil Power Plant', impNuclearpower:'Nuclear Power Plant', impWindpower:'Wind Power Farm',
  impCoalmine:'Coal Mine', impOilwell:'Oil Well', impIronmine:'Iron Mine', impBauxitemine:'Bauxite Mine',
  impLeadmine:'Lead Mine', impUraniummine:'Uranium Mine', impFarm:'Farm', impOilrefinery:'Oil Refinery',
  impSteelmill:'Steel Mill', impAluminumrefinery:'Aluminum Refinery', impMunitionsfactory:'Munitions Factory',
  impPolicestation:'Police Station', impHospital:'Hospital', impRecyclingcenter:'Recycling Center',
  impSubway:'Subway', impSupermarket:'Supermarket', impBank:'Bank', impMall:'Shopping Mall', impStadium:'Stadium',
}
const IMP_CATEGORIES = {
  Power: ['impCoalpower','impOilpower','impNuclearpower','impWindpower'],
  Resources: ['impCoalmine','impOilwell','impIronmine','impBauxitemine','impLeadmine','impUraniummine','impFarm'],
  Industry: ['impOilrefinery','impSteelmill','impAluminumrefinery','impMunitionsfactory'],
  Commerce: ['impPolicestation','impHospital','impRecyclingcenter','impSubway','impSupermarket','impBank','impMall','impStadium'],
}

export default function CityDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [infraTarget, setInfraTarget] = useState('')
  const [landAmount, setLandAmount] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['city', id],
    queryFn: () => api.get(`/cities/${id}`).then(r => r.data.data),
  })

  const buildMut = useMutation({
    mutationFn: imp => api.post(`/cities/${id}/build`, { improvement: imp }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['city', id] }),
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const demolishMut = useMutation({
    mutationFn: imp => api.post(`/cities/${id}/demolish`, { improvement: imp }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['city', id] }),
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const infraMut = useMutation({
    mutationFn: target => api.post(`/cities/${id}/infra`, { target: parseFloat(target) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['city', id] }); setInfraTarget('') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const landMut = useMutation({
    mutationFn: amount => api.post(`/cities/${id}/land`, { amount: parseFloat(amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['city', id] }); setLandAmount('') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">City not found.</div>

  const { city, impCosts, impMax } = data

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/cities" style={{ color: 'var(--text2)', fontSize: 13 }}>← Cities</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>{city.name}</h1>
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Infrastructure</div>
            <div style={{ fontWeight: 700 }}>{fmt(city.infrastructure)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={infraTarget} onChange={e => setInfraTarget(e.target.value)} placeholder="Target" style={{ width: 80, padding: '4px 8px' }} type="number" />
              <button className="btn btn-sm" onClick={() => infraMut.mutate(infraTarget)} disabled={infraMut.isPending}>Upgrade</button>
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Land</div>
            <div style={{ fontWeight: 700 }}>{fmt(city.land)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={landAmount} onChange={e => setLandAmount(e.target.value)} placeholder="Amount" style={{ width: 80, padding: '4px 8px' }} type="number" />
              <button className="btn btn-sm" onClick={() => landMut.mutate(landAmount)} disabled={landMut.isPending}>Buy ($400/acre)</button>
            </div>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {Object.entries(IMP_CATEGORIES).map(([cat, imps]) => (
        <div key={cat} className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>{cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {imps.map(imp => {
              const count = city[imp] ?? 0
              const max = impMax?.[imp] ?? 5
              const cost = impCosts?.[imp] ?? 0
              return (
                <div key={imp} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{IMP_LABELS[imp]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                      {count}/{max} · ${fmt(cost)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" disabled={count <= 0 || demolishMut.isPending} onClick={() => demolishMut.mutate(imp)}>-</button>
                    <button className="btn btn-sm" disabled={count >= max || buildMut.isPending} onClick={() => buildMut.mutate(imp)}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
