import type React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoginScreen } from './screens/LoginScreen'
import { LoketScreen } from './screens/LoketScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { ShiftScreen } from './screens/ShiftScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PersonelScreen } from './screens/PersonelScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './components/park-pos/Toast'

export function App(): React.JSX.Element {
  const { session } = useAuth()

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginScreen />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/loket" element={<LoketScreen />} />
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/loket" replace />} />
            <Route path="/masuk" element={<CheckInScreen />} />
            <Route path="/shift" element={<ShiftScreen />} />
            <Route path="/riwayat" element={<HistoryScreen />} />
            <Route path="/pengaturan" element={<SettingsScreen />} />
            <Route path="/personel" element={<PersonelScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  )
}
