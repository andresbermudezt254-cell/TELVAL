import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: ReactNode
  description?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'blue' | 'orange' | 'green' | 'purple'
}

const colorMap = {
  blue:   { gradient: 'from-[#1e3a5f] to-[#1a4a7a]', iconBg: 'bg-white/20', iconColor: 'text-white', badge: 'bg-blue-100 text-[#1e3a5f]' },
  orange: { gradient: 'from-[#ea6c0a] to-[#f97316]', iconBg: 'bg-white/20', iconColor: 'text-white', badge: 'bg-orange-100 text-orange-800' },
  green:  { gradient: 'from-emerald-600 to-emerald-500', iconBg: 'bg-white/20', iconColor: 'text-white', badge: 'bg-emerald-100 text-emerald-800' },
  purple: { gradient: 'from-violet-600 to-violet-500', iconBg: 'bg-white/20', iconColor: 'text-white', badge: 'bg-violet-100 text-violet-800' },
}

export function StatsCard({ title, value, description, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const c = colorMap[color]
  const trendUp = (trend?.value ?? 0) >= 0
  return (
    <div className={`bg-gradient-to-br ${c.gradient} rounded-2xl p-5 flex gap-4 items-start shadow-md hover:shadow-lg transition-shadow`}>
      <div className={`${c.iconBg} rounded-xl p-3 flex-shrink-0 backdrop-blur-sm`}>
        <Icon size={22} className={c.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-tight">{value}</p>
        {description && <p className="text-xs text-white/50 mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-1.5">
            {trendUp
              ? <TrendingUp size={11} className="text-white/70" />
              : <TrendingDown size={11} className="text-white/70" />}
            <span className="text-[11px] font-semibold text-white/70">
              {trendUp ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
