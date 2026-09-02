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
  blue: {
    topBar: 'bg-blue-600',
    iconBg: 'bg-blue-50/90 text-blue-700 border-blue-200/70',
    ring: 'hover:border-blue-300',
  },
  orange: {
    topBar: 'bg-[#f97316]',
    iconBg: 'bg-orange-50/90 text-[#f97316] border-orange-200/70',
    ring: 'hover:border-orange-300',
  },
  green: {
    topBar: 'bg-emerald-600',
    iconBg: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70',
    ring: 'hover:border-emerald-300',
  },
  teal: {
    topBar: 'bg-teal-600',
    iconBg: 'bg-teal-50/90 text-teal-700 border-teal-200/70',
    ring: 'hover:border-teal-300',
  },
  purple: {
    topBar: 'bg-violet-600',
    iconBg: 'bg-violet-50/90 text-violet-700 border-violet-200/70',
    ring: 'hover:border-violet-300',
  },
}

export function StatsCard({ title, value, description, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const c = colorMap[color]
  const trendUp = (trend?.value ?? 0) >= 0

  return (
    <div className={`relative bg-white border border-slate-200/80 rounded-2xl p-5 flex gap-4 items-start shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${c.ring}`}>
      {/* Top subtle color indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${c.topBar}`} />

      <div className={`${c.iconBg} border rounded-xl p-3 flex-shrink-0 shadow-2xs`}>
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{title}</p>
        <div className="text-2xl font-black text-slate-900 mt-1 leading-tight tracking-tight">{value}</div>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            {trendUp
              ? <TrendingUp size={12} className="text-emerald-600" />
              : <TrendingDown size={12} className="text-rose-600" />}
            <span className={`text-[11px] font-bold ${trendUp ? 'text-emerald-700' : 'text-rose-700'}`}>
              {trendUp ? '+' : ''}{trend.value}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
