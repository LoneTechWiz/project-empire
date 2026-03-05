import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, nation } = useAuth()
  return (
    <div className="page" style={{ maxWidth: 800, textAlign: 'center', paddingTop: 80 }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
        <span style={{ color: 'var(--accent)' }}>Project</span> Empire
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 18, marginBottom: 40 }}>
        Build your nation. Command armies. Forge alliances. Dominate the world.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {user ? (
          nation
            ? <Link to="/dashboard" className="btn" style={{ fontSize: 15, padding: '10px 28px' }}>Go to Dashboard</Link>
            : <Link to="/nation/create" className="btn" style={{ fontSize: 15, padding: '10px 28px' }}>Create Your Nation</Link>
        ) : <>
          <Link to="/register" className="btn" style={{ fontSize: 15, padding: '10px 28px' }}>Get Started</Link>
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: 15, padding: '10px 28px' }}>Login</Link>
        </>}
        <Link to="/rankings" className="btn btn-ghost" style={{ fontSize: 15, padding: '10px 28px' }}>View Rankings</Link>
      </div>
      <div className="grid-3" style={{ marginTop: 60, textAlign: 'left' }}>
        {[
          { title: 'Build & Expand', desc: 'Found cities, construct improvements, and grow your economic power through infrastructure and industry.' },
          { title: 'Wage War', desc: 'Command ground troops, aircraft, naval fleets, missiles, and nuclear weapons against your enemies.' },
          { title: 'Trade & Diplomacy', desc: 'Buy and sell resources on the open market. Join alliances, deposit to alliance banks, and collaborate with allies.' },
        ].map(f => (
          <div key={f.title} className="card" style={{ marginTop: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
