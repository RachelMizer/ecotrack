import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="EcoTrack home">
      <span className="mark"><img src="/images/logo.png" alt="" /></span>
      <span className="word"><span className="eco">ECO</span><span className="track">TRACK</span></span>
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Rachel Mizer. All rights reserved.</span>
      <Link to="/developer-notes">Developer's Notes</Link>
    </footer>
  )
}

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = async () => {
    await logout()
    navigate('/login')
  }
  return (
    <div className="app">
      <header className="site-header">
        <Brand />
        <p className="site-tagline">Where animal health meets land insight</p>
        <nav className="nav" aria-label="Main">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/catalog">Catalog</NavLink>
          <NavLink to="/tracker">Tracker</NavLink>
          <NavLink to="/nutrition">Nutrition</NavLink>
          <NavLink to="/schedule">Schedule</NavLink>
          <span className="acct">
            <NavLink to="/account">Account</NavLink>
            <button type="button" onClick={onLogout}>Logout</button>
          </span>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="app">
      <header className="site-header">
        <Brand />
        <p className="site-tagline">Where animal health meets land insight</p>
        <nav className="nav" aria-label="Main"><NavLink to="/login">Log in</NavLink></nav>
      </header>
      <main><Outlet /></main>
      <Footer />
    </div>
  )
}
