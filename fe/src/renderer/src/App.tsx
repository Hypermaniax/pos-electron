import type React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoginScreen } from './screens/LoginScreen'
import { LoketScreen } from './screens/LoketScreen'
import { KioskScreen } from './screens/KioskScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { ShiftScreen } from './screens/ShiftScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PersonelScreen } from './screens/PersonelScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { KaryawanScreen } from './screens/Karyawan'
import { MemberScreen } from './screens/Member'
import { PaymentScreen } from './screens/Payment'
import { PerangkatScreen } from './screens/Perangkat'
import { BantuanScreen } from './screens/BantuanScreen'
import { TarifScreen } from './screens/TarifScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { useAuth } from './context/AuthContext'
import { homeRouteFor } from './lib/permissions'
import { ToastProvider } from './components/park-pos/Toast'

function IndexRedirect(): React.JSX.Element {
  const { session } = useAuth()
  return <Navigate to={homeRouteFor(session)} replace />
}

export function App(): React.JSX.Element {
  const { session } = useAuth()

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginScreen />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/loket" element={<LoketScreen />} />
          <Route path="/kiosk" element={<KioskScreen />} />
          <Route element={<AppShell />}>
            <Route index element={<IndexRedirect />} />
            <Route path="/masuk" element={<CheckInScreen />} />
            <Route path="/shift" element={<ShiftScreen />} />
            <Route path="/riwayat" element={<HistoryScreen />} />
            <Route path="/pengaturan" element={<SettingsScreen />} />
            <Route path="/personel" element={<PersonelScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/perangkat" element={<PerangkatScreen />} />
            <Route path="/karyawan" element={<KaryawanScreen />} />
            <Route path="/member" element={<MemberScreen />} />
            <Route path="/payment" element={<PaymentScreen />} />
            <Route path="/bantuan" element={<BantuanScreen />} />
            <Route path="/tarif" element={<TarifScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  )
}
