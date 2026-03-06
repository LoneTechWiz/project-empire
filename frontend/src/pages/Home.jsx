import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    img: null,
    icon: '🏙️',
    title: 'Build & Expand',
    desc: 'Found cities, construct improvements, and grow your economic power through infrastructure and industry.',
    color: 'rgba(79,142,247,0.15)',
    border: 'rgba(79,142,247,0.3)',
  },
  {
    img: '/img/art/battle.png',
    icon: '⚔️',
    title: 'Wage War',
    desc: 'Command ground troops, aircraft, naval fleets, missiles, and nuclear weapons against your enemies.',
    color: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
  },
  {
    img: '/img/art/diplomacy.png',
    icon: '🤝',
    title: 'Trade & Diplomacy',
    desc: 'Buy and sell resources on the open market. Join alliances, sign treaties, and collaborate with allies.',
    color: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    img: '/img/art/spy.png',
    icon: '🕵️',
    title: 'Espionage',
    desc: 'Train spies to steal money, sabotage enemy infrastructure, or gather military intelligence on rivals.',
    color: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.25)',
  },
  {
    img: null,
    icon: '☢️',
    title: 'Nuclear Arsenal',
    desc: 'Research and build missiles and nuclear warheads. Use them to devastate enemy cities and end wars.',
    color: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.25)',
  },
  {
    img: null,
    icon: '🏦',
    title: 'Alliance Banking',
    desc: 'Pool resources in your alliance bank, collect taxes from members, and fund your allies in times of war.',
    color: 'rgba(79,142,247,0.12)',
    border: 'rgba(79,142,247,0.25)',
  },
]

export default function Home() {
  const { user, nation } = useAuth()
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(/img/hero_bkgd.png)',
        backgroundSize: 'cover', backgroundPosition: 'center top',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,20,0.72) 0%, rgba(10,12,20,0.55) 50%, rgba(10,12,20,0.92) 100%)' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: '110px 16px 80px', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 99, padding: '4px 14px', fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 24 }}>
          <span>⚔</span> Browser-Based Nation Builder
        </div>
        <h1 style={{ fontSize: 'clamp(36px,7vw,64px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}>
          <span style={{ color: 'var(--accent)' }}>Project</span>{' '}
          <span style={{ color: 'var(--text)' }}>Empires</span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 17, lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
          Build your nation. Command armies. Forge alliances. Dominate the world.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            nation
              ? <Link to="/dashboard" className="btn" style={{ fontSize: 15, padding: '11px 32px' }}>Go to Dashboard →</Link>
              : <Link to="/nation/create" className="btn" style={{ fontSize: 15, padding: '11px 32px' }}>Create Your Nation →</Link>
          ) : <>
            <Link to="/register" className="btn" style={{ fontSize: 15, padding: '11px 32px' }}>Get Started Free →</Link>
            <Link to="/login" className="btn btn-ghost" style={{ fontSize: 15, padding: '11px 28px' }}>Login</Link>
          </>}
          <Link to="/rankings" className="btn btn-ghost" style={{ fontSize: 15, padding: '11px 28px' }}>View Rankings</Link>
        </div>
      </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Everything you need</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>A complete geopolitical simulation</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card card-hover" style={{ background: f.color, border: `1px solid ${f.border}`, padding: 0, overflow: 'hidden' }}>
              {f.img && (
                <div style={{ height: 120, overflow: 'hidden' }}>
                  <img src={f.img} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <div style={{ padding: 20 }}>
                {!f.img && <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>}
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
                <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
