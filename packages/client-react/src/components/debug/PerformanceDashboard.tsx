import React, { useState, useEffect } from 'react'
import { performanceMonitor } from '../../utils/performanceMonitor'

interface PerformanceDashboardProps {
  visible: boolean
  onToggle: () => void
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ visible, onToggle }) => {
  const [renderStats, setRenderStats] = useState<Record<string, number>>({})
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Update stats every second when visible
  useEffect(() => {
    if (visible) {
      const updateStats = () => {
        setRenderStats(performanceMonitor.getRenderStats())
      }
      
      updateStats() // Initial update
      const interval = setInterval(updateStats, 1000)
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [visible])

  const resetStats = () => {
    performanceMonitor.reset()
    setRenderStats({})
  }

  if (!visible) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '300px',
      maxHeight: '400px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      zIndex: 1000,
      fontSize: '12px',
      fontFamily: 'monospace',
      overflow: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>📊 Performance Monitor</h3>
        <div>
          <button
            onClick={resetStats}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
              marginRight: '5px'
            }}
          >
            Reset
          </button>
          <button
            onClick={onToggle}
            style={{
              padding: '4px 8px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ffff44' }}>Component Render Counts</h4>
        {Object.keys(renderStats).length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>
            No render data yet. Interact with the game to see stats.
          </div>
        ) : (
          <div>
            {Object.entries(renderStats)
              .sort(([,a], [,b]) => b - a) // Sort by render count descending
              .map(([component, count]) => (
                <div key={component} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  borderBottom: count > 20 ? '1px solid #ff4444' : 'none'
                }}>
                  <span style={{ 
                    color: count > 20 ? '#ff4444' : count > 10 ? '#ffaa44' : '#44ff44'
                  }}>
                    {component}
                  </span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: count > 20 ? '#ff4444' : count > 10 ? '#ffaa44' : '#44ff44'
                  }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#44ffff' }}>Performance Tips</h4>
        <div style={{ fontSize: '10px', color: '#ccc', lineHeight: '1.4' }}>
          • <span style={{ color: '#44ff44' }}>Green</span>: Good (&lt;10 renders)<br/>
          • <span style={{ color: '#ffaa44' }}>Yellow</span>: Watch (10-20 renders)<br/>
          • <span style={{ color: '#ff4444' }}>Red</span>: Optimize (&gt;20 renders)<br/>
          • Check console for timing logs<br/>
          • Use React DevTools Profiler for details
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#888', textAlign: 'center' }}>
        Updates every 1 second • Development only
      </div>
    </div>
  )
}

// Hook for easy integration
export const usePerformanceDashboard = () => {
  const [visible, setVisible] = useState(false)
  
  const toggle = () => setVisible(!visible)
  
  return { visible, toggle }
}
