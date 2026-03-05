import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'

export default function Navbar() {
  const { user, nation, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: msgData } = useQuery({
    queryKey: ['unread'],
    queryFn: () => api.get('/messages').then(r => r.data.data.unread),
    enabled: !!user,
    refetchInterval: 60000,
  })

  const handleSearch = e => {
    e.preventDefault()
    if (search.trim()) { navigate(`/search?q=${encodeURIComponent(search.trim())}`); setSearch('') }
  }

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 16, height: 52 }}>
      <Link to="/" style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.5px' }}>
        <span style={{ color: 'var(--accent)' }}>Project</span> Empire
      </Link>

      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
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

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nations..." style={{ width: 160, padding: '5px 10px' }} />
      </form>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/messages" style={{ color: msgData > 0 ? 'var(--yellow)' : 'var(--text2)', fontSize: 13 }}>
            Messages{msgData > 0 ? ` (${msgData})` : ''}
          </Link>
          {nation
            ? <Link to="/dashboard" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{nation.name}</Link>
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
    </nav>
  )
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ padding: '0 10px', color: 'var(--text2)', fontSize: 13, fontWeight: 500, lineHeight: '52px', borderBottom: '2px solid transparent' }}
      className="navlink">{children}</Link>
  )
}
