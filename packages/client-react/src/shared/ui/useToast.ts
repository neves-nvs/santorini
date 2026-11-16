import { createContext, use } from 'react'

export interface ToastMessage {
  id: string
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast needs a ToastProvider')
  return context
}
