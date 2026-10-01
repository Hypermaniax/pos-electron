import { Permissions, PermissionLabels } from '@shared/permissions'
import type { Permission } from '@shared/permissions'
import type { SessionState } from '@shared/types'

export function can(session: SessionState | null, permission: Permission): boolean {
  if (!session) return false
  return session.operator.permissions.includes(permission)
}

/** Operator loket: hanya boleh membuka layar loket, tidak ada akses admin. */
export function isOperator(session: SessionState | null): boolean {
  return session?.operator.role.toLowerCase() === 'operator'
}

/** Tujuan pendaratan setelah login sesuai role. */
export function homeRouteFor(session: SessionState | null): string {
  return isOperator(session) ? '/loket' : '/dashboard'
}

export function describePermissions(permissions: string[]): string[] {
  return permissions
    .filter((permission): permission is Permission => permission in PermissionLabels)
    .map((permission) => PermissionLabels[permission])
}

export { Permissions }
