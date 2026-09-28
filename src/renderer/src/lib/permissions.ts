import { Permissions, PermissionLabels } from '@shared/permissions'
import type { Permission } from '@shared/permissions'
import type { SessionState } from '@shared/types'

export function can(session: SessionState | null, permission: Permission): boolean {
  if (!session) return false
  return session.operator.permissions.includes(permission)
}

export function describePermissions(permissions: string[]): string[] {
  return permissions
    .filter((permission): permission is Permission => permission in PermissionLabels)
    .map((permission) => PermissionLabels[permission])
}

export { Permissions }
