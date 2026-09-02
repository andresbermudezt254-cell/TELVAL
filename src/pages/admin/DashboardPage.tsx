import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SpendingBarChart, TopSuppliersChart, SpendingPieChart } from '@/components/dashboard/SpendingChart'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { Clock, CheckCircle, DollarSign, Package, Plus, ShoppingCart, Truck, ShieldCheck } from 'lucide-react'

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
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboardStats()
  const { data: charts } = useDashboardCharts()

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 pb-6">
      {/* Executive Hero Banner */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-xl text-white p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, #0b1e36 0%, #163359 55%, #1e4577 100%)' }}
      >
        {/* Ambient background glow orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-blue-200 shadow-2xs">
                <ShieldCheck size={13} className="text-[#f97316]" />
                Panel Corporativo TELVAL
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-semibold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operativo
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Hola, {user?.nombre_completo?.split(' ')[0] ?? user?.email}
            </h1>
            <p className="text-blue-200/80 text-xs md:text-sm max-w-xl leading-relaxed">
              Gestión integral de compras, control de requisiciones y análisis de proveedores para mantenimientos Metro.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/nueva-requisicion')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-xs tracking-wide transition-all duration-150 shadow-lg shadow-orange-950/30 hover:shadow-orange-900/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={15} />
              <span>Nueva Requisición</span>
            </button>
            <button
              onClick={() => navigate('/almacen')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs tracking-wide transition-all duration-150 backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              <Truck size={15} className="text-blue-300" />
              <span>Almacén</span>
            </button>
            <button
              onClick={() => navigate('/catalogo')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs tracking-wide transition-all duration-150 backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShoppingCart size={15} className="text-blue-300" />
              <span>Catálogo</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Pendientes" value={data?.pendingCount ?? 0} icon={Clock} color="orange" description="Requisiciones por revisar" />
        <StatsCard title="Completadas este mes" value={data?.completedCount ?? 0} icon={CheckCircle} color="green" description="Materiales entregados en almacén" />
        <StatsCard title="Gasto estimado mes" value={<CurrencyCOP value={data?.totalMes} />} icon={DollarSign} color="blue" description="Consolidado de compras" />
        <StatsCard title="En proceso" value={data?.pendingCount ?? 0} icon={Package} color="teal" description="En compra y parciales" />
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-bold">Analítica</p>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">Comportamiento del abastecimiento</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data?.weeklySpend && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
              <SpendingBarChart data={data.weeklySpend} title="Gasto estimado por semana (últimas 8 semanas)" />
            </div>
          )}
          {charts?.byCategory && charts.byCategory.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
              <SpendingPieChart data={charts.byCategory} title="Distribución de insumos por categoría" />
            </div>
          )}
        </div>
      </div>

      {/* Top suppliers */}
      {charts?.topSuppliers && charts.topSuppliers.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-bold">Proveedores</p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">Proveedores con mayor cobertura de catálogo</h2>
          </div>
          <TopSuppliersChart data={charts.topSuppliers} title="Productos activos por proveedor" />
        </div>
      )}
    </div>
  )
}
