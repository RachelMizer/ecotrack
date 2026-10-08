import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout, { PublicLayout } from './components/Layout'
import { useAuth } from './lib/auth'
import Login from './pages/Login'

// Pages load on demand so the login screen stays light.
const Account = lazy(() => import('./pages/Account'))
const AnimalCare = lazy(() => import('./pages/AnimalCare'))
const AnimalRecords = lazy(() => import('./pages/AnimalRecords'))
const Assignments = lazy(() => import('./pages/Assignments'))
const Catalog = lazy(() => import('./pages/Catalog'))
const CatalogGroup = lazy(() => import('./pages/CatalogGroup'))
const ClassDetail = lazy(() => import('./pages/ClassDetail'))
const Classes = lazy(() => import('./pages/Classes'))
const Incubator = lazy(() => import('./pages/Incubator'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DevNotes = lazy(() => import('./pages/DevNotes'))
const MySchedule = lazy(() => import('./pages/MySchedule'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const Person = lazy(() => import('./pages/Person'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Tracker = lazy(() => import('./pages/Tracker'))

function RequireAuth({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

/** Instructor-only pages, or student/volunteer-only pages. Waits for the account to load. */
function RequireRole({ roles, children }) {
  const { user, role } = useAuth()
  if (!user) return null
  return roles.includes(role) ? children : <Navigate to="/dashboard" replace />
}

const INSTRUCTOR = ['instructor']
const LEARNER = ['student', 'volunteer']

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
        <Route path="/catalog/:group/:slug/care" element={<AnimalCare />} />
        <Route path="/catalog/:group/:slug/:kind" element={<AnimalRecords />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/account" element={<Account />} />
        <Route path="/my-schedule" element={<RequireRole roles={LEARNER}><MySchedule /></RequireRole>} />
        <Route path="/classes" element={<RequireRole roles={INSTRUCTOR}><Classes /></RequireRole>} />
        <Route path="/classes/:id" element={<RequireRole roles={INSTRUCTOR}><ClassDetail /></RequireRole>} />
        <Route path="/people/:id" element={<RequireRole roles={INSTRUCTOR}><Person /></RequireRole>} />
        <Route path="/assignments" element={<RequireRole roles={INSTRUCTOR}><Assignments /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  )
}
