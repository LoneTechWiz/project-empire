import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function Navbar() {
  const { user, nation, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: msgData } = useQuery({
    queryKey: ['unread'],
    queryFn: () => api.get('/messages').then(r => r.data.data.unread),
    enabled: !!user,
    refetchInterval: 60000,
  })

  const { data: tickInfo } = useQuery({
    queryKey: ['game-info'],
    queryFn: () => api.get('/game/info').then(r => r.data.data),
    enabled: !!user,
    refetchInterval: 60000,
  })

  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!tickInfo?.nextTickMs) return
    const update = () => {
      const ms = tickInfo.nextTickMs - Date.now()
      if (ms <= 0) { setCountdown('00:00'); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [tickInfo?.nextTickMs])

  const { data: nationData } = useQuery({
    queryKey: ['nation-mine'],
    queryFn: () => api.get('/nations/mine').then(r => r.data.data),
    enabled: !!user && !!nation,
    refetchInterval: 60000,
  })

  const n = nationData?.nation || nationData
  const resources = n ? [
    ['$', fmt(n.money)],
    ['Food', fmt(n.food)],
    ['Coal', fmt(n.coal)],
    ['Oil', fmt(n.oil)],
    ['Iron', fmt(n.iron)],
    ['Bauxite', fmt(n.bauxite)],
    ['Lead', fmt(n.lead)],
    ['Uranium', fmt(n.uranium)],
    ['Gasoline', fmt(n.gasoline)],
    ['Munitions', fmt(n.munitions)],
    ['Steel', fmt(n.steel)],
    ['Aluminum', fmt(n.aluminum)],
  ] : []

  const handleSearch = e => {
    e.preventDefault()
    if (search.trim()) { navigate(`/search?q=${encodeURIComponent(search.trim())}`); setSearch(''); setMenuOpen(false) }
  }

  const closeMenu = () => setMenuOpen(false)

  const ResourceItems = () => (
    <>
      {resources.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', gap: 4, alignItems: 'baseline', whiteSpace: 'nowrap', fontSize: 12 }}>
          <span style={{ color: 'var(--text2)' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
      {countdown && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', whiteSpace: 'nowrap', fontSize: 12, marginLeft: 'auto' }}>
          <span style={{ color: 'var(--text2)' }}>Tick</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{countdown}</span>
        </div>
      )}
    </>
  )

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <nav style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, height: 52 }}>
        <Link to="/" onClick={closeMenu} style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.5px', whiteSpace: 'nowrap', marginRight: 8 }}>
          <span style={{ color: 'var(--accent)' }}>Project</span> Empire
        </Link>

        <div className="nav-links-desktop">
          <NavLink to="/rankings">Rankings</NavLink>
          <NavLink to="/alliances">Alliances</NavLink>
          {user && <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/cities">Cities</NavLink>
            <NavLink to="/military">Military</NavLink>
            <NavLink to="/wars">Wars</NavLink>
            <NavLink to="/trade">Trade</NavLink>
          </>}
        </div>

        {/* Resources inline in desktop nav bar */}
        {user && nation && resources.length > 0 && (
          <div className="nav-resources">
            <ResourceItems />
          </div>
        )}

        <div className="nav-right">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nations..." style={{ width: 160, padding: '5px 10px' }} />
          </form>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/messages" style={{ color: msgData > 0 ? 'var(--yellow)' : 'var(--text2)', fontSize: 13, whiteSpace: 'nowrap' }}>
                Msgs{msgData > 0 ? ` (${msgData})` : ''}
              </Link>
              {nation
                ? <Link to="/dashboard" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{nation.name}</Link>
                : <Link to="/nation/create" className="btn btn-sm">Create Nation</Link>
              }
              <button className="btn-ghost btn btn-sm" onClick={() => { logout(); navigate('/') }}>Logout</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-sm">Register</Link>
            </div>
          )}
        </div>

        <button className="hamburger-btn" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile: resource strip always visible below nav */}
      {user && nation && resources.length > 0 && (
        <div className="mobile-resource-bar">
          <ResourceItems />
        </div>
      )}

      {/* Mobile: hamburger menu */}
      {menuOpen && (
        <div className="mobile-nav">
          <MobileNavLink to="/rankings" onClick={closeMenu}>Rankings</MobileNavLink>
          <MobileNavLink to="/alliances" onClick={closeMenu}>Alliances</MobileNavLink>
          {user && <>
            <MobileNavLink to="/dashboard" onClick={closeMenu}>Dashboard</MobileNavLink>
            <MobileNavLink to="/cities" onClick={closeMenu}>Cities</MobileNavLink>
            <MobileNavLink to="/military" onClick={closeMenu}>Military</MobileNavLink>
            <MobileNavLink to="/wars" onClick={closeMenu}>Wars</MobileNavLink>
            <MobileNavLink to="/trade" onClick={closeMenu}>Trade</MobileNavLink>
          </>}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nations..." style={{ padding: '6px 10px' }} />
            </form>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/messages" onClick={closeMenu} style={{ color: msgData > 0 ? 'var(--yellow)' : 'var(--text2)', fontSize: 13 }}>
                  Messages{msgData > 0 ? ` (${msgData})` : ''}
                </Link>
                {nation && <Link to="/dashboard" onClick={closeMenu} style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{nation.name}</Link>}
                <button className="btn-ghost btn btn-sm" onClick={() => { logout(); navigate('/'); closeMenu() }}>Logout</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/login" onClick={closeMenu} className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" onClick={closeMenu} className="btn btn-sm">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ padding: '0 10px', color: 'var(--text2)', fontSize: 13, fontWeight: 500, lineHeight: '52px', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' }}
      className="navlink">{children}</Link>
  )
}

function MobileNavLink({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={{ padding: '8px 4px', color: 'var(--text2)', fontSize: 14, fontWeight: 500, borderBottom: '1px solid var(--border)', display: 'block' }}>
      {children}
    </Link>
  )
}
