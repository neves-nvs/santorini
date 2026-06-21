import { memo } from 'react'

interface IconProps {
  size?: number
  color?: string
  className?: string
}

const RunningIcon = memo(({ size = 24, color = 'currentColor', className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={color}
    className={className}
  >
    <circle cx="13.5" cy="5.5" r="2.5" />
    <path d="M9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A6.4 6.4 0 0 0 18.5 13H20a8 8 0 0 0-5.5-3.5l-2-0.5a1.5 1.5 0 0 0-1.7 1L9.8 8.9zM5.5 12L4 23h2l1-7.5L5.5 12z" />
  </svg>
))

RunningIcon.displayName = 'RunningIcon'

export default RunningIcon

