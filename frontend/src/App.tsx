import type { JSX } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getUser } from './api'
import RoleSelect from './pages/RoleSelect'
import Login from './pages/Login'
import ManagerDashboard from './pages/ManagerDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'

function Protected({ role, children }: { role: string; children: JSX.Element }) {
  const user = getUser()
  if (!user) return <Navigate to="/" replace />
  if (user.role !== role)
    return <Navigate to={user.role === 'Manager' ? '/manager' : '/employee'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelect />} />
      <Route path="/login/:role" element={<Login />} />
      <Route
        path="/manager"
        element={
          <Protected role="Manager">
            <ManagerDashboard />
          </Protected>
        }
      />
      <Route
        path="/employee"
        element={
          <Protected role="Employee">
            <EmployeeDashboard />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
