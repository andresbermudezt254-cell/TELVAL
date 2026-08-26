import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: ReactNode
  description?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'blue' | 'orange' | 'green' | 'teal' | 'purple'
}

const colorMap = {
  blue:   { accent: 'border-l-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-700' },
  orange: { accent: 'border-l-orange-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-700' },
  green:  { accent: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700' },
  teal:   { accent: 'border-l-teal-500', iconBg: 'bg-teal-50', iconColor: 'text-teal-700' },
  purple: { accent: 'border-l-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-700' },
}

export function StatsCard({ title, value, description, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const c = colorMap[color]
  const trendUp = (trend?.value ?? 0) >= 0
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`${c.iconBg} rounded-lg p-2.5 flex-shrink-0`}>
        <Icon size={22} className={c.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-tight">{value}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-1.5">
            {trendUp
              ? <TrendingUp size={11} className="text-emerald-600" />
              : <TrendingDown size={11} className="text-red-600" />}
            <span className="text-[11px] font-semibold text-slate-500">
              {trendUp ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
