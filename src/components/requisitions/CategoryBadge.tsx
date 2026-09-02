import { categoriaBadgeClass } from '@/lib/utils'

export function CategoryBadge({ categoria }: { categoria: string }) {
  const isUrgente = categoria === 'URGENTE'
  const dotColor =
    isUrgente ? 'bg-rose-500 animate-pulse' :
    categoria === 'IMPORTANTE' ? 'bg-amber-500' :
    categoria === 'MODERADA' ? 'bg-sky-500' : 'bg-slate-400'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoriaBadgeClass(categoria)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{categoria}</span>
    </span>
  )
}
