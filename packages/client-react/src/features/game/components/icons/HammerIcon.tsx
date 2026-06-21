import { memo } from 'react'

interface IconProps {
  size?: number
  color?: string
  className?: string
}

const HammerIcon = memo(({ size = 24, color = 'currentColor', className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={color}
    className={className}
  >
    <path d="M2 19.63L13.43 8.2l-.71-.7 1.42-1.43 3.54 3.54-1.42 1.41-.71-.7L4.13 21.75a1.5 1.5 0 0 1-2.12-2.12zM18.37 3.29l2.12 2.12a1 1 0 0 1 0 1.41l-3.54 3.54-3.54-3.54 3.54-3.54a1 1 0 0 1 1.42 0z" />
  </svg>
))

HammerIcon.displayName = 'HammerIcon'

export default HammerIcon

