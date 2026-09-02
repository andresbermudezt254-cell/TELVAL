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

      const all = (reqs ?? []) as Array<Record<string, unknown>>
      const completed = all.filter((r) => String(r.estado ?? '') === 'COMPLETADA')
      const totalGasto = completed.reduce((s, r) => s + Number(r.total_estimado ?? 0), 0)
      const avgGasto = completed.length ? totalGasto / completed.length : 0

      // Monthly spend
      const byMonth: Record<string, number> = {}
      for (const r of completed) {
        const fecha = String(r.fecha_solicitud ?? '')
        const m = fecha.slice(0, 7)
        byMonth[m] = (byMonth[m] ?? 0) + Number(r.total_estimado ?? 0)
      }
      const monthlyData = Object.entries(byMonth)
        .sort()
        .map(([name, value]) => ({ name: name.slice(5) + '/' + name.slice(2, 4), value: Math.round(value) }))

      // By specialty
      const bySpec: Record<string, number> = {}
      for (const r of completed) {
        const especialidad = String(r.especialidad ?? '')
        if (!especialidad) continue
        bySpec[especialidad] = (bySpec[especialidad] ?? 0) + Number(r.total_estimado ?? 0)
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
    const rows = (data.all ?? []).map((r) => [
      String(r.id ?? ''),
      String(r.estado ?? ''),
      String(r.especialidad ?? ''),
      formatDate(String(r.fecha_solicitud ?? '')),
      formatCOP(Number(r.total_estimado ?? 0)),
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
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1e3a5f] font-black text-sm shadow-2xs">
            <BarChart2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Reportes y Estadísticas</h1>
              <span className="text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Auditoría
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Métricas de gasto acumulado, especialidades y exportación de datos</p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide transition-all shadow-md shadow-emerald-950/20 hover:-translate-y-0.5"
        >
          <Download size={15} />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Date Filters Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Desde:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-slate-50 shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Hasta:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-slate-50 shadow-2xs"
          />
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total gasto estimado" value={<CurrencyCOP value={data?.totalGasto} />} icon={DollarSign} color="blue" description="En requisiciones completadas" />
            <StatsCard title="Requisiciones totales" value={data?.all?.length ?? 0} icon={Package} color="orange" description="En el período seleccionado" />
            <StatsCard title="Completadas" value={data?.completed?.length ?? 0} icon={CheckCircle} color="green" description="Materiales recepcionados" />
            <StatsCard title="Promedio por req." value={<CurrencyCOP value={data?.avgGasto} />} icon={BarChart2} color="purple" description="Ticket promedio de compra" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data?.monthlyData?.length ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
                <SpendingBarChart data={data.monthlyData} title="Gasto mensual consolidado" />
              </div>
            ) : null}
            {data?.specData?.length ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
                <SpendingPieChart data={data.specData} title="Distribución de gasto por especialidad" />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
