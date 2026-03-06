const IMGS = {
  food:      '/img/icons/resources/food.png?v=3',
  coal:      '/img/icons/resources/coal.png?v=3',
  oil:       '/img/icons/resources/oil.png?v=3',
  iron:      '/img/icons/resources/iron.png?v=3',
  bauxite:   '/img/icons/resources/bauxite.png?v=3',
  lead:      '/img/icons/resources/lead.png?v=3',
  uranium:   '/img/icons/resources/uranium.png?v=3',
  gasoline:  '/img/icons/resources/gasoline.png?v=3',
  munitions: '/img/icons/resources/munitions.png?v=3',
  steel:     '/img/icons/resources/steel.png?v=3',
  aluminum:  '/img/icons/resources/aluminum.png?v=3',
}

// Inline resource icon + optional label
export default function ResIcon({ r, size = 36, label }) {
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
