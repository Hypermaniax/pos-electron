export const Permissions = {
  SessionView: 'session.view',
  PaymentCash: 'payment.cash',
  PaymentQr: 'payment.qr',
  PaymentCancel: 'payment.cancel',
  GateOpen: 'gate.open',
  GateOverride: 'gate.override',
  ReceiptPrint: 'receipt.print',
  ReceiptReprint: 'receipt.reprint',
  ShiftManage: 'shift.manage',
  HistoryView: 'history.view',
  HistoryViewRange: 'history.view_range',
  SettingsManage: 'settings.manage'
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

export const PermissionLabels: Record<Permission, string> = {
  [Permissions.SessionView]: 'Melihat tagihan parkir',
  [Permissions.PaymentCash]: 'Menerima pembayaran cash',
  [Permissions.PaymentQr]: 'Menampilkan QR pembayaran',
  [Permissions.PaymentCancel]: 'Membatalkan pembayaran',
  [Permissions.GateOpen]: 'Membuka palang pintu',
  [Permissions.GateOverride]: 'Override buka palang',
  [Permissions.ReceiptPrint]: 'Mencetak bukti pembayaran',
  [Permissions.ReceiptReprint]: 'Mencetak ulang bukti',
  [Permissions.ShiftManage]: 'Mengelola shift',
  [Permissions.HistoryView]: 'Melihat riwayat shift',
  [Permissions.HistoryViewRange]: 'Melihat riwayat rentang waktu',
  [Permissions.SettingsManage]: 'Mengubah konfigurasi'
}
