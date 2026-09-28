import type React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LoketScreen } from './screens/LoketScreen'
import { ShiftScreen } from './screens/ShiftScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { useAuth } from './context/AuthContext'

export function App(): React.JSX.Element {
  const { session } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="/loket" element={<LoketScreen />} />
          <Route path="/shift" element={<ShiftScreen />} />
          <Route path="/riwayat" element={<HistoryScreen />} />
          <Route path="/pengaturan" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Route>
    </Routes>
  )
}
