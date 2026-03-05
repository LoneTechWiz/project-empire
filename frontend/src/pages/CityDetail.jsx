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
// Static effects per improvement. Farm food is dynamic (land-based), handled separately.
const IMP_EFFECTS = {
  impCoalpower:        ['+500 ⚡'],
  impOilpower:         ['+500 ⚡'],
  impNuclearpower:     ['+2000 ⚡'],
  impWindpower:        ['+250 ⚡'],
  impCoalmine:         ['+3 coal', '-3 ⚡'],
  impOilwell:          ['+3 oil', '-3 ⚡'],
  impIronmine:         ['+3 iron', '-3 ⚡'],
  impBauxitemine:      ['+3 bauxite', '-3 ⚡'],
  impLeadmine:         ['+3 lead', '-3 ⚡'],
  impUraniummine:      ['+3 uranium', '-3 ⚡'],
  impFarm:             [null, '-2 ⚡'], // food is dynamic
  impOilrefinery:      ['+6 gasoline', '-3 oil', '-6 ⚡'],
  impSteelmill:        ['+9 steel', '-3 coal', '-3 iron', '-6 ⚡'],
  impAluminumrefinery: ['+9 aluminum', '-3 bauxite', '-6 ⚡'],
  impMunitionsfactory: ['+18 munitions', '-6 lead', '-8 ⚡'],
  impPolicestation:    ['+1% commerce', '-1.5 ⚡'],
  impHospital:         ['+1% commerce', '-1.5 ⚡'],
  impRecyclingcenter:  ['+2% commerce', '-1.5 ⚡'],
  impSubway:           ['+8% commerce', '-1.5 ⚡'],
  impSupermarket:      ['+3% commerce', '-1.5 ⚡'],
  impBank:             ['+5% commerce', '-1.5 ⚡'],
  impMall:             ['+9% commerce', '-1.5 ⚡'],
  impStadium:          ['+12% commerce', '-1.5 ⚡'],
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
  const [landTarget, setLandTarget] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['city', id],
    queryFn: () => api.get(`/cities/${id}`).then(r => r.data.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['city', id] })
    qc.invalidateQueries({ queryKey: ['nation-mine'] })
  }

  const buildMut = useMutation({
    mutationFn: imp => api.post(`/cities/${id}/build`, { improvement: imp }),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const demolishMut = useMutation({
    mutationFn: imp => api.post(`/cities/${id}/demolish`, { improvement: imp }),
    onSuccess: invalidate,
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const infraMut = useMutation({
    mutationFn: target => api.post(`/cities/${id}/infra`, { target: parseFloat(target) }),
    onSuccess: () => { invalidate(); setInfraTarget('') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })
  const landMut = useMutation({
    mutationFn: target => api.post(`/cities/${id}/land`, { target: parseFloat(target) }),
    onSuccess: () => { invalidate(); setLandTarget('') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">City not found.</div>

  const { city, impCosts, impSlots, impsUsed, commerceUsed, powerAvailable, powerNeeded, production } = data

  return (
    <div className="page">
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <Link to="/cities" style={{ color: 'var(--text2)', fontSize: 13 }}>← Cities</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>{city.name}</h1>
        </div>
        <div className="grid-2" style={{ gap: 12, minWidth: 0, flex: 1, maxWidth: 420 }}>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Infrastructure</div>
            <div style={{ fontWeight: 700 }}>{fmt(city.infrastructure)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={infraTarget} onChange={e => setInfraTarget(e.target.value)} placeholder="Target" style={{ width: 80, padding: '4px 8px' }} type="number" />
              <button className="btn btn-sm" onClick={() => infraMut.mutate(infraTarget)} disabled={infraMut.isPending}>Upgrade</button>
            </div>
            {(() => {
              const target = parseFloat(infraTarget)
              if (!infraTarget || isNaN(target) || target <= city.infrastructure || target > 5000) return null
              let cost = 0
              for (let i = city.infrastructure; i < target; i++) cost += 10 + (i * 2)
              return <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Cost: <span style={{ color: 'var(--text)', fontWeight: 600 }}>${fmt(cost)}</span></div>
            })()}
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Land</div>
            <div style={{ fontWeight: 700 }}>{fmt(city.land)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={landTarget} onChange={e => setLandTarget(e.target.value)} placeholder="Target" style={{ width: 80, padding: '4px 8px' }} type="number" />
              <button className="btn btn-sm" onClick={() => landMut.mutate(landTarget)} disabled={landMut.isPending}>Buy</button>
            </div>
            {(() => {
              const target = parseFloat(landTarget)
              if (!landTarget || isNaN(target) || target <= city.land || target > 10000) return null
              let cost = 0
              for (let i = city.land; i < target; i++) cost += 30 + (i * 0.2)
              return <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Cost: <span style={{ color: 'var(--text)', fontWeight: 600 }}>${fmt(cost)}</span></div>
            })()}
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {production && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Per Turn</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
            <div>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>Money </span>
              <span style={{ fontWeight: 600, color: production.money >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {production.money >= 0 ? '+' : ''}${fmt(production.money)}
              </span>
            </div>
            {['food','coal','oil','iron','bauxite','lead','uranium','gasoline','munitions','steel','aluminum'].map(r => {
              const v = production[r]
              if (!v || Math.abs(v) < 0.01) return null
              return (
                <div key={r}>
                  <span style={{ color: 'var(--text2)', fontSize: 12, textTransform: 'capitalize' }}>{r} </span>
                  <span style={{ fontWeight: 600, color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {v >= 0 ? '+' : ''}{fmt(v)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>Improvement Slots </span>
          <span style={{ fontWeight: 600 }}>{impsUsed ?? 0} / {impSlots ?? 0}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>Commerce </span>
          <span style={{ fontWeight: 600 }}>{commerceUsed ?? 0}%</span>
        </div>
        <div>
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>Power </span>
          <span style={{ fontWeight: 600, color: powerNeeded > powerAvailable ? 'var(--red)' : 'inherit' }}>
            {fmt(powerNeeded)} / {fmt(powerAvailable)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>Population </span>
          <span style={{ fontWeight: 600 }}>{fmt(city.population)}</span>
        </div>
      </div>

      {Object.entries(IMP_CATEGORIES).map(([cat, imps]) => (
        <div key={cat} className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>{cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {imps.map(imp => {
              const count = city[imp] ?? 0
              const cost = (impCosts?.[imp] ?? 0) * (1 + count * 0.5)
              const noSlots = (impsUsed ?? 0) >= (impSlots ?? 0)
              return (
                <div key={imp} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{IMP_LABELS[imp]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{count} · ${fmt(cost)}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {imp === 'impFarm' && (
                        <span style={{ fontSize: 10, color: 'var(--green)' }}>+{fmt(city.land * 0.03)} food</span>
                      )}
                      {(IMP_EFFECTS[imp] || []).filter(Boolean).map(e => (
                        <span key={e} style={{ fontSize: 10, color: e.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{e}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" disabled={count <= 0 || demolishMut.isPending} onClick={() => demolishMut.mutate(imp)}>-</button>
                    <button className="btn btn-sm" disabled={noSlots || buildMut.isPending} onClick={() => buildMut.mutate(imp)}>+</button>
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
