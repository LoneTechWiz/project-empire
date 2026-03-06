import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'

const RESOURCE_IMGS = {
  'Food': '/img/icons/resources/food.png?v=3',
  'Coal': '/img/icons/resources/coal.png?v=3',
  'Oil': '/img/icons/resources/oil.png?v=3',
  'Iron': '/img/icons/resources/iron.png?v=3',
  'Bauxite': '/img/icons/resources/bauxite.png?v=3',
  'Lead': '/img/icons/resources/lead.png?v=3',
  'Uranium': '/img/icons/resources/uranium.png?v=3',
  'Gasoline': '/img/icons/resources/gasoline.png?v=3',
  'Munitions': '/img/icons/resources/munitions.png?v=3',
  'Steel': '/img/icons/resources/steel.png?v=3',
  'Aluminum': '/img/icons/resources/aluminum.png?v=3',
}

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function Navbar() {
  const { user, nation, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
        <div key={label} style={{ display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 12 }}>
          {RESOURCE_IMGS[label]
            ? <img src={RESOURCE_IMGS[label]} alt={label} style={{ width: 36, height: 36, objectFit: 'contain' }} />
            : <span style={{ fontSize: 13, lineHeight: 1 }}>💰</span>
          }
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
      {countdown && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 12, marginLeft: 'auto', padding: '2px 8px', background: 'rgba(79,142,247,0.1)', borderRadius: 20, border: '1px solid rgba(79,142,247,0.2)' }}>
          <span style={{ color: 'var(--text2)' }}>Turn in</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{countdown}</span>
        </div>
      )}
    </>
  )

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
      <nav style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, height: 52 }}>
        <Link to="/" onClick={closeMenu} style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)', letterSpacing: '-0.5px', whiteSpace: 'nowrap', marginRight: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--accent)', fontSize: 20 }}>⚔</span>
          <span><span style={{ color: 'var(--accent)' }}>Project</span> Empires</span>
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
            <NavLink to="/finance">Finance</NavLink>
          </>}
        </div>

        <div className="nav-right">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nations..." style={{ width: 160, padding: '5px 10px' }} />
          </form>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/messages" style={{ color: msgData > 0 ? 'var(--yellow)' : 'var(--text2)', fontSize: 13, whiteSpace: 'nowrap' }}>
                Messages{msgData > 0 ? ` (${msgData})` : ''}
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

      {/* Desktop: resource + next turn row below nav */}
      {user && nation && resources.length > 0 && (
        <div className="desktop-resource-bar hide-mobile">
          <ResourceItems />
        </div>
      )}

      {/* Mobile: resource strip always visible below nav */}
      {user && nation && resources.length > 0 && (
        <div className="mobile-resource-bar hide-desktop">
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
            <MobileNavLink to="/finance" onClick={closeMenu}>Finance</MobileNavLink>
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
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link to={to} style={{
      padding: '0 12px', fontSize: 13, fontWeight: isActive ? 700 : 500,
      lineHeight: '52px', whiteSpace: 'nowrap',
      color: isActive ? 'var(--text)' : 'var(--text2)',
      borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
      transition: 'color 0.15s, border-color 0.15s',
    }}
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
