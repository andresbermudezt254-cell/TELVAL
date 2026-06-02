interface BadgeProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export function Badge({ children, className = '', size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${className}`}>
      {children}
    </span>
  )
}
