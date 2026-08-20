import { Badge } from '@/components/ui/Badge'
import { estadoBadgeClass, estadoLabel } from '@/lib/utils'

interface StatusBadgeProps {
  estado: string
  size?: 'sm' | 'md'
}

export function RequisitionStatusBadge({ estado, size = 'md' }: StatusBadgeProps) {
  return (
    <Badge className={estadoBadgeClass(estado)} size={size}>
      {estadoLabel(estado)}
    </Badge>
  )
}
