import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SpendingBarChart, TopSuppliersChart, SpendingPieChart } from '@/components/dashboard/SpendingChart'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { Clock, CheckCircle, DollarSign, Package, Activity } from 'lucide-react'

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [pending, completed] = await Promise.all([
        supabase.from('requisiciones').select('id', { count: 'exact', head: true }).in('estado', ['PENDIENTE', 'EN_REVISION']),
        supabase.from('requisiciones').select('id,total_estimado').eq('estado', 'COMPLETADA').gte('fecha_solicitud', firstDay),
      ])

      const completedRows = (completed.data ?? []) as Array<Record<string, unknown>>
      const totalMes = completedRows.reduce((s, r) => s + Number(r.total_estimado ?? 0), 0)

      const weeks: { name: string; value: number }[] = []
      for (let i = 7; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i * 7)
        const start = new Date(d)
        start.setDate(start.getDate() - 6)
        const { data } = await supabase
          .from('requisiciones').select('total_estimado').eq('estado', 'COMPLETADA')
          .gte('fecha_solicitud', start.toISOString()).lte('fecha_solicitud', d.toISOString())
        const rows = (data ?? []) as Array<Record<string, unknown>>
        const total = rows.reduce((s, r) => s + Number(r.total_estimado ?? 0), 0)
        weeks.push({ name: `S${i === 0 ? 'E' : i}`, value: Math.round(total) })
      }

      return { pendingCount: pending.count ?? 0, completedCount: completed.data?.length ?? 0, totalMes, weeklySpend: weeks }
    },
    staleTime: 60_000,
  })
}

function useDashboardCharts() {
  return useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const [ppData, prodData] = await Promise.all([
        supabase.from('proveedor_producto').select('proveedor_id, proveedores(nombre)').eq('activo', true),
        supabase.from('productos').select('categoria:categorias(nombre)').eq('activo', true),
      ])

      // Top proveedores por número de productos en catálogo
      const supplierCounts = new Map<number, { nombre: string; count: number }>()
      ppData.data?.forEach((r: any) => {
        const id = r.proveedor_id
        const nombre = (r.proveedores?.nombre ?? `Proveedor ${id}`).substring(0, 28)
        if (!supplierCounts.has(id)) supplierCounts.set(id, { nombre, count: 0 })
        supplierCounts.get(id)!.count++
      })
      const topSuppliers = Array.from(supplierCounts.values())
        .sort((a, b) => b.count - a.count).slice(0, 8)
        .map((s) => ({ name: s.nombre, value: s.count }))

      // Productos por categoría
      const catCounts = new Map<string, number>()
      prodData.data?.forEach((p: any) => {
        const cat = p.categoria?.nombre ?? 'Sin categoría'
        catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1)
      })
      const byCategory = Array.from(catCounts.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name, value }))

      return { topSuppliers, byCategory }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboardStats()
  const { data: charts } = useDashboardCharts()

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-7 pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold mb-2">
            <Activity size={13} className="text-emerald-500" /> Resumen operativo
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bienvenido, {user?.nombre_completo?.split(' ')[0] ?? user?.email}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700">Sistema en línea</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Pendientes" value={data?.pendingCount ?? 0} icon={Clock} color="orange" />
        <StatsCard title="Completadas este mes" value={data?.completedCount ?? 0} icon={CheckCircle} color="green" />
        <StatsCard title="Gasto estimado mes" value={<CurrencyCOP value={data?.totalMes} />} icon={DollarSign} color="blue" />
        <StatsCard title="En proceso" value={data?.pendingCount ?? 0} icon={Package} color="teal" />
      </div>

      {/* Charts row */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Actividad</p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Comportamiento del abastecimiento</h2>
          </div>
          <span className="hidden sm:block text-xs text-slate-400">Actualización automática</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.weeklySpend && (
          <SpendingBarChart data={data.weeklySpend} title="Gasto estimado por semana (últimas 8 semanas)" />
        )}
        {charts?.byCategory && charts.byCategory.length > 0 && (
          <SpendingPieChart data={charts.byCategory} title="Productos por categoría" />
        )}
        </div>
      </div>

      {/* Top suppliers */}
      {charts?.topSuppliers && charts.topSuppliers.length > 0 && (
        <div>
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Catálogo</p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Proveedores con mayor cobertura</h2>
          </div>
          <TopSuppliersChart data={charts.topSuppliers} title="Productos activos por proveedor" />
        </div>
      )}
    </div>
  )
}
