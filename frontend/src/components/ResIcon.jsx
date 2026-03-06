const IMGS = {
  food:      '/img/icons/resources/food.png',
  coal:      '/img/icons/resources/coal.png',
  oil:       '/img/icons/resources/oil.png',
  iron:      '/img/icons/resources/iron.png',
  bauxite:   '/img/icons/resources/bauxite.png',
  lead:      '/img/icons/resources/lead.png',
  uranium:   '/img/icons/resources/uranium.png',
  gasoline:  '/img/icons/resources/gasoline.png',
  munitions: '/img/icons/resources/munitions.png',
  steel:     '/img/icons/resources/steel.png',
  aluminum:  '/img/icons/resources/aluminum.png',
}

// Inline resource icon + optional label
export default function ResIcon({ r, size = 18, label }) {
  const img = IMGS[r]
  const text = label !== undefined ? label : (r === 'money' ? 'Money' : r.charAt(0).toUpperCase() + r.slice(1))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {img
        ? <img src={img} alt={r} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
        : <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>💰</span>
      }
      <span>{text}</span>
    </span>
  )
}

// Just the icon, no label
export function ResImg({ r, size = 14 }) {
  const img = IMGS[r]
  if (!img) return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>💰</span>
  return <img src={img} alt={r} style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }} />
}
