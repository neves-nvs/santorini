import React, { createContext, useContext, useState, ReactNode } from 'react'
import Toast from '../components/ui/Toast'

interface ToastMessage {
  id: string
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (message: string, type: ToastMessage['type'] = 'info', duration = 4000) => {
    const id = Date.now().toString()
    const newToast: ToastMessage = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${20 + index * 70}px`, // Stack toasts vertically
            right: '20px',
            zIndex: 1000 + index
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </ToastContext.Provider>
  )
}
