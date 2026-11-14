import React, { ReactNode } from 'react'

// Provider component for backwards compatibility (now just renders children)
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>
}
