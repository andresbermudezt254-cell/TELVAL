import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SpendingBarChart, TopSuppliersChart, SpendingPieChart } from '@/components/dashboard/SpendingChart'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { CategoryBadge } from '@/components/requisitions/CategoryBadge'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { Clock, CheckCircle, DollarSign, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [pending, completed, recent] = await Promise.all([
        supabase.from('requisiciones').select('id', { count: 'exact', head: true }).in('estado', ['PENDIENTE', 'EN_REVISION']),
        supabase.from('requisiciones').select('id,total_estimado').eq('estado', 'COMPLETADA').gte('fecha_solicitud', firstDay),
        supabase.from('requisiciones')
          .select('id,codigo,estado,categoria,fecha_solicitud,total_estimado,punto,numero_aviso')
          .order('fecha_solicitud', { ascending: false })
          .limit(8),
      ])

      const totalMes = (completed.data ?? []).reduce((s, r) => s + (r.total_estimado ?? 0), 0)

      const weeks: { name: string; value: number }[] = []
      for (let i = 7; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i * 7)
        const start = new Date(d)
        start.setDate(start.getDate() - 6)
        const { data } = await supabase
          .from('requisiciones').select('total_estimado').eq('estado', 'COMPLETADA')
          .gte('fecha_solicitud', start.toISOString()).lte('fecha_solicitud', d.toISOString())
        const total = (data ?? []).reduce((s, r) => s + (r.total_estimado ?? 0), 0)
        weeks.push({ name: `S${i === 0 ? 'E' : i}`, value: Math.round(total) })
      }

      return { pendingCount: pending.count ?? 0, completedCount: completed.data?.length ?? 0, totalMes, recent: recent.data ?? [], weeklySpend: weeks }
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
  const navigate = useNavigate()
  const { data, isLoading } = useDashboardStats()
  const { data: charts } = useDashboardCharts()

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f2440] to-[#1e3a5f] px-6 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Bienvenido, {user?.nombre_completo?.split(' ')[0] ?? user?.email}
          </h1>
          <p className="text-blue-300/70 text-sm mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white/80">Sistema en línea</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Pendientes" value={data?.pendingCount ?? 0} icon={Clock} color="orange" />
        <StatsCard title="Completadas este mes" value={data?.completedCount ?? 0} icon={CheckCircle} color="green" />
        <StatsCard title="Gasto estimado mes" value={<CurrencyCOP value={data?.totalMes} />} icon={DollarSign} color="blue" />
        <StatsCard title="En proceso" value={data?.pendingCount ?? 0} icon={Package} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.weeklySpend && (
          <SpendingBarChart data={data.weeklySpend} title="Gasto estimado por semana (últimas 8 semanas)" />
        )}
        {charts?.byCategory && charts.byCategory.length > 0 && (
          <SpendingPieChart data={charts.byCategory} title="Productos por categoría" />
        )}
      </div>

      {/* Top suppliers */}
      {charts?.topSuppliers && charts.topSuppliers.length > 0 && (
        <TopSuppliersChart data={charts.topSuppliers} title="Top proveedores por productos en catálogo" />
      )}

      {/* Recent requisitions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">Requisiciones recientes</h3>
          <button onClick={() => navigate('/admin/requisiciones')} className="text-xs text-[#1e3a5f] font-medium hover:underline">Ver todas</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Código', 'Fecha', 'Punto', 'Aviso', 'Categoría', 'Estado', 'Total'].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.recent ?? []).map((r) => (
              <tr key={r.id} onClick={() => navigate(`/admin/requisiciones/${r.id}`)} className="border-t hover:bg-blue-50 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 font-mono font-semibold text-[#1e3a5f]">{r.codigo}</td>
                <td className="px-4 py-2.5 text-gray-500">{formatDate(r.fecha_solicitud)}</td>
                <td className="px-4 py-2.5">{r.punto}</td>
                <td className="px-4 py-2.5">{r.numero_aviso}</td>
                <td className="px-4 py-2.5"><CategoryBadge categoria={r.categoria} /></td>
                <td className="px-4 py-2.5"><StatusBadge estado={r.estado} /></td>
                <td className="px-4 py-2.5 font-semibold"><CurrencyCOP value={r.total_estimado} /></td>
              </tr>
            ))}
            {!(data?.recent?.length) && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Sin requisiciones aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
