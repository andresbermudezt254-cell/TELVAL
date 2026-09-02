import { estadoBadgeClass, estadoLabel } from '@/lib/utils'

interface StatusBadgeProps {
  estado: string
  size?: 'sm' | 'md'
}

export function RequisitionStatusBadge({ estado, size = 'md' }: StatusBadgeProps) {
  const isSm = size === 'sm'
  const dotColor: Record<string, string> = {
    PENDIENTE:   'bg-amber-500',
    EN_REVISION: 'bg-blue-500',
    APROBADA:    'bg-emerald-500',
    EN_COMPRA:   'bg-orange-500',
    PARCIAL:     'bg-purple-500',
    COMPLETADA:  'bg-teal-500',
    RECHAZADA:   'bg-rose-500',
    BORRADOR:    'bg-slate-400',
  }

  const dot = dotColor[estado] ?? 'bg-slate-400'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${estadoBadgeClass(estado)}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{estadoLabel(estado)}</span>
    </span>
  )
}
