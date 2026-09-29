import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout, { PublicLayout } from './components/Layout'
import { useAuth } from './lib/auth'
import Login from './pages/Login'

// Pages load on demand so the login screen stays light.
const Account = lazy(() => import('./pages/Account'))
const AnimalRecords = lazy(() => import('./pages/AnimalRecords'))
const Catalog = lazy(() => import('./pages/Catalog'))
const CatalogGroup = lazy(() => import('./pages/CatalogGroup'))
const Incubator = lazy(() => import('./pages/Incubator'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DevNotes = lazy(() => import('./pages/DevNotes'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Tracker = lazy(() => import('./pages/Tracker'))

function RequireAuth({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export default function App() {
  const { token } = useAuth()
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={token ? <Layout /> : <PublicLayout />}>
        <Route path="/developer-notes" element={<DevNotes />} />
      </Route>
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/catalog/incubator" element={<Incubator />} />
        <Route path="/catalog/:group" element={<CatalogGroup />} />
        <Route path="/catalog/:group/:slug/:kind" element={<AnimalRecords />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  )
}
