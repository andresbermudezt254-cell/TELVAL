import { Package } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'Sin resultados',
  description = 'No hay datos para mostrar.',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-gray-300">
        {icon ?? <Package size={48} strokeWidth={1} />}
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
