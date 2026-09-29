import { useContext } from 'react'
import { ToastContext, type ToastVariant } from '@renderer/components/park-pos/toast-context'

export function useToast(): (message: string, variant?: ToastVariant) => void {
  return useContext(ToastContext)
}
