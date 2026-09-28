/** Salinan lokal dari `src/shared/permissions.ts`. */

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

export const ALL_PERMISSIONS: Permission[] = Object.values(Permissions)
