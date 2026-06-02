import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SpendingBarChart, SpendingPieChart } from '@/components/dashboard/SpendingChart'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCOP } from '@/lib/utils'
import { DollarSign, CheckCircle, Package, BarChart2 } from 'lucide-react'

function useReportData(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', from, to],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from('requisiciones')
        .select('id,estado,total_estimado,especialidad,fecha_solicitud')
        .gte('fecha_solicitud', from)
        .lte('fecha_solicitud', to + 'T23:59:59')

      const all = reqs ?? []
      const completed = all.filter((r) => r.estado === 'COMPLETADA')
      const totalGasto = completed.reduce((s, r) => s + (r.total_estimado ?? 0), 0)
      const avgGasto = completed.length ? totalGasto / completed.length : 0

      // Monthly spend
      const byMonth: Record<string, number> = {}
      for (const r of completed) {
        const m = r.fecha_solicitud.slice(0, 7)
        byMonth[m] = (byMonth[m] ?? 0) + (r.total_estimado ?? 0)
      }
      const monthlyData = Object.entries(byMonth)
        .sort()
        .map(([name, value]) => ({ name: name.slice(5) + '/' + name.slice(2, 4), value: Math.round(value) }))

      // By specialty
      const bySpec: Record<string, number> = {}
      for (const r of completed) {
        if (!r.especialidad) continue
        bySpec[r.especialidad] = (bySpec[r.especialidad] ?? 0) + (r.total_estimado ?? 0)
      }
      const specData = Object.entries(bySpec)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name: name.split(' ')[0], value: Math.round(value) }))

      return { all, completed, totalGasto, avgGasto, monthlyData, specData }
    },
  })
}

export default function ReportsPage() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(now.toISOString().slice(0, 10))

  const { data, isLoading } = useReportData(from, to)

  const exportCSV = () => {
    if (!data?.all) return
    const headers = ['ID', 'Estado', 'Especialidad', 'Fecha', 'Total Estimado']
    const rows = data.all.map((r) => [
      r.id,
      r.estado,
      r.especialidad,
      formatDate(r.fecha_solicitud),
      formatCOP(r.total_estimado),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `telval_reporte_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
        </div>
        <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCSV}>Exportar CSV</Button>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total gasto estimado" value={<CurrencyCOP value={data?.totalGasto} />} icon={DollarSign} color="blue" />
            <StatsCard title="Requisiciones totales" value={data?.all?.length ?? 0} icon={Package} color="orange" />
            <StatsCard title="Completadas" value={data?.completed?.length ?? 0} icon={CheckCircle} color="green" />
            <StatsCard title="Promedio por req." value={<CurrencyCOP value={data?.avgGasto} />} icon={BarChart2} color="purple" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.monthlyData?.length ? (
              <SpendingBarChart data={data.monthlyData} title="Gasto mensual (completadas)" />
            ) : null}
            {data?.specData?.length ? (
              <SpendingPieChart data={data.specData} title="Gasto por especialidad" />
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
