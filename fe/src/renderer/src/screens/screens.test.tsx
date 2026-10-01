import type React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionState } from '@shared/types'
import { App } from '../App'
import { LoginScreen } from './LoginScreen'
import { DashboardScreen } from './DashboardScreen'
import { KaryawanScreen } from './Karyawan'
import { MemberScreen } from './Member'
import { PaymentScreen } from './Payment'
import { PerangkatScreen } from './Perangkat'
import { ShiftScreen } from './ShiftScreen'
import { NotFoundScreen } from './NotFoundScreen'
import { AuthProvider } from '../context/AuthContext'
import { ConfigProvider } from '../context/ConfigContext'
import { ShiftProvider } from '../context/ShiftContext'
import { ToastProvider } from '../components/park-pos/Toast'
import { restore, verifySession } from '../lib/server-api'

vi.mock('../lib/server-api', () => ({
  login: vi.fn().mockResolvedValue({ ok: false, error: { code: 'AUTH', message: 'Invalid' } }),
  logout: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockReturnValue(null),
  verifySession: vi.fn().mockResolvedValue(null),
  searchSessions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  payCash: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  createQrIntent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  cancelQrIntent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  openGate: vi.fn().mockResolvedValue({ ok: true, data: { status: 'SUCCESS', message: 'OK', correlationId: '1' } }),
  getActiveShift: vi.fn().mockResolvedValue(null),
  getShiftSummary: vi.fn().mockResolvedValue(null),
  openShift: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  closeShift: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  listTransactions: vi.fn().mockResolvedValue([]),
  fetchPersonel: vi.fn().mockResolvedValue({ ok: true, data: { items: [] } }),
  setPersonelActive: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  createSession: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  pingServer: vi.fn().mockResolvedValue({ ok: true, data: { status: 'ok', db: 'ok', version: '1' } })
}))

vi.mock('../lib/config-api', () => ({
  configApi: {
    get: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        siteServerUrl: 'http://localhost:4000',
        deviceId: 'test-device',
        laneName: 'Loket 1',
        gateName: 'Exit 1',
        operationalMode: 'operator',
        sessionTimeoutSeconds: 300,
        printerName: null
      }
    }),
    update: vi.fn().mockResolvedValue({ ok: true, data: {} })
  }
}))

function wrapWithProviders(ui: React.ReactElement): React.ReactElement {
  return (
    <MemoryRouter>
      <ToastProvider>
        <ConfigProvider>
          <AuthProvider>
            <ShiftProvider>
              {ui}
            </ShiftProvider>
          </AuthProvider>
        </ConfigProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(wrapWithProviders(<LoginScreen />))
    expect(screen.getByRole('heading', { name: 'Masuk Workstation' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Masukkan username')).toBeTruthy()
    expect(screen.getByPlaceholderText('Masukkan password')).toBeTruthy()
  })

  it('has role preset buttons', () => {
    render(wrapWithProviders(<LoginScreen />))
    expect(screen.getByText('OPR')).toBeTruthy()
    expect(screen.getByText('SPV')).toBeTruthy()
    expect(screen.getByText('ENG')).toBeTruthy()
  })

  it('shows error on failed login', async () => {
    render(wrapWithProviders(<LoginScreen />))
    fireEvent.change(screen.getByPlaceholderText('Masukkan username'), { target: { value: 'wrong' } })
    fireEvent.change(screen.getByPlaceholderText('Masukkan password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Masuk Sesuai Role/ }))
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByText('Invalid')).toBeTruthy()
  })
})

describe('DashboardScreen', () => {
  it('renders operational overview', () => {
    render(wrapWithProviders(<DashboardScreen />))
    expect(screen.getByText('Ringkasan & Status Operasional Loket')).toBeTruthy()
    expect(screen.getByText('5 Transaksi Terakhir Selesai')).toBeTruthy()
    expect(screen.getByText('Quick Actions Supervisor')).toBeTruthy()
  })
})

describe('ShiftScreen', () => {
  it('renders shift management', () => {
    render(wrapWithProviders(<ShiftScreen />))
    expect(screen.getByText('Manajemen Shift')).toBeTruthy()
    expect(screen.getByText('Buka Shift Baru')).toBeTruthy()
  })
})

describe('NotFoundScreen', () => {
  it('renders 404', () => {
    render(wrapWithProviders(<NotFoundScreen />))
    expect(screen.getByText('404')).toBeTruthy()
    expect(screen.getByText('Halaman Tidak Ditemukan')).toBeTruthy()
  })
})

describe('PerangkatScreen', () => {
  it('renders device management', () => {
    const { unmount } = render(wrapWithProviders(<PerangkatScreen />))
    expect(screen.getByText('Manajemen Perangkat & Konektivitas')).toBeTruthy()
    expect(screen.getByText('Tambah Perangkat')).toBeTruthy()
    expect(screen.getByText('Lane Controller Barat In')).toBeTruthy()
    unmount()
  })
})

describe('KaryawanScreen', () => {
  it('renders employee management', () => {
    render(wrapWithProviders(<KaryawanScreen />))
    expect(screen.getByText('Manajemen Karyawan & Operator Loket')).toBeTruthy()
    expect(screen.getByText('+ Tambah Karyawan Baru')).toBeTruthy()
    expect(screen.getByText('Budi Santoso')).toBeTruthy()
    expect(screen.getByText('Form Cepat Penugasan Shift & Role')).toBeTruthy()
  })
})

describe('MemberScreen', () => {
  it('renders membership management', () => {
    render(wrapWithProviders(<MemberScreen />))
    expect(screen.getByText('Otoritas Keanggotaan & Personel POS')).toBeTruthy()
    expect(screen.getByText('Registrasi Kartu Member')).toBeTruthy()
    expect(screen.getByText('RFID-984210394')).toBeTruthy()
  })

  it('switches to operator tab', () => {
    render(wrapWithProviders(<MemberScreen />))
    fireEvent.click(screen.getByText('Karyawan & Operator'))
    expect(screen.getByText('TAMBAH KARYAWAN / AKUN POS')).toBeTruthy()
    expect(screen.getByText('Siti Aminah')).toBeTruthy()
  })
})

describe('PaymentScreen', () => {
  it('renders payment channels and incident feed', () => {
    render(wrapWithProviders(<PaymentScreen />))
    expect(screen.getByText('Aktivasi Fitur Pembayaran & Health Feed')).toBeTruthy()
    expect(screen.getByText('Pengaturan Kanal Pembayaran')).toBeTruthy()
    expect(screen.getByText('Live Incident Feed')).toBeTruthy()
    expect(screen.getByText('Uang Tunai (Cash)')).toBeTruthy()
  })
})

describe('Role landing (App penuh)', () => {
  function sessionWithRole(role: string): SessionState {
    return {
      operator: { id: 'usr_test', username: 'tester', name: 'Tester', role, permissions: [] },
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    }
  }

  function renderApp(entry: string): void {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <ToastProvider>
          <ConfigProvider>
            <AuthProvider>
              <ShiftProvider>
                <App />
              </ShiftProvider>
            </AuthProvider>
          </ConfigProvider>
        </ToastProvider>
      </MemoryRouter>
    )
  }

  it('supervisor dari /login mendarat di dashboard', async () => {
    const session = sessionWithRole('Supervisor')
    vi.mocked(restore).mockReturnValue(session)
    vi.mocked(verifySession).mockResolvedValue(session)
    renderApp('/login')
    expect(await screen.findByText('Ringkasan & Status Operasional Loket')).toBeTruthy()
  })

  it('operator dari /login mendarat di loket', async () => {
    const session = sessionWithRole('Operator')
    vi.mocked(restore).mockReturnValue(session)
    vi.mocked(verifySession).mockResolvedValue(session)
    renderApp('/login')
    expect(await screen.findByText('Uang Tunai Diterima (Rp)')).toBeTruthy()
  })
})
