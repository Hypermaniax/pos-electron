import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastPush = (message: string, variant?: ToastVariant) => void

const noop = (): void => {}

export const ToastContext = createContext<ToastPush>(noop)
