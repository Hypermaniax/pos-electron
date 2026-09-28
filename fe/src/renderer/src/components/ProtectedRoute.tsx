import type React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute(): React.JSX.Element {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
