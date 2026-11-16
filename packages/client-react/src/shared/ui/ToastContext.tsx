import React, { useState, ReactNode } from 'react'
import Toast from './Toast'
import { ToastContext, type ToastMessage } from './useToast'

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
    <ToastContext value={{ showToast }}>
      {children}
      <div role="status" aria-live="polite">
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
      </div>
    </ToastContext>
  )
}
