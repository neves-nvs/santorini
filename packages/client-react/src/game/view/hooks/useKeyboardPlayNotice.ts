import { useEffect, useRef } from 'react'
import { useToast } from '@/shared/ui/useToast'

const PLAY_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '])

export const useKeyboardPlayNotice = () => {
  const { showToast } = useToast()
  const noticeShown = useRef(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const pressedOnPageBackground = event.target === document.body
      if (noticeShown.current || !pressedOnPageBackground || !PLAY_KEYS.has(event.key)) return
      noticeShown.current = true
      showToast("Keyboard play isn't available yet. Use the mouse or touch.", 'info', 6000)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showToast])
}
