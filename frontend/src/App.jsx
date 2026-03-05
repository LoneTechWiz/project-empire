import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NationCreate from './pages/NationCreate'
import NationView from './pages/NationView'
import Cities from './pages/Cities'
import CityDetail from './pages/CityDetail'
import Military from './pages/Military'
import Wars from './pages/Wars'
import WarDetail from './pages/WarDetail'
import Alliances from './pages/Alliances'
import AllianceDetail from './pages/AllianceDetail'
import AllianceCreate from './pages/AllianceCreate'
import Trade from './pages/Trade'
import Rankings from './pages/Rankings'
import Messages from './pages/Messages'
import MessageDetail from './pages/MessageDetail'
import Search from './pages/Search'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <div className="loading">Loading…</div>

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/alliances" element={<Alliances />} />
        <Route path="/alliances/create" element={<Protected><AllianceCreate /></Protected>} />
        <Route path="/alliances/:id" element={<AllianceDetail />} />
        <Route path="/nations/:id" element={<NationView />} />
        <Route path="/search" element={<Search />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/nation/create" element={<Protected><NationCreate /></Protected>} />
        <Route path="/cities" element={<Protected><Cities /></Protected>} />
        <Route path="/cities/:id" element={<Protected><CityDetail /></Protected>} />
        <Route path="/military" element={<Protected><Military /></Protected>} />
        <Route path="/wars" element={<Protected><Wars /></Protected>} />
        <Route path="/wars/:id" element={<Protected><WarDetail /></Protected>} />
        <Route path="/trade" element={<Protected><Trade /></Protected>} />
        <Route path="/messages" element={<Protected><Messages /></Protected>} />
        <Route path="/messages/:id" element={<Protected><MessageDetail /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}
