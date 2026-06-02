import { Badge } from '@/components/ui/Badge'
import { categoriaBadgeClass } from '@/lib/utils'

export function CategoryBadge({ categoria }: { categoria: string }) {
  return (
    <Badge className={`border-0 ${categoriaBadgeClass(categoria)}`}>
      {categoria}
    </Badge>
  )
}
