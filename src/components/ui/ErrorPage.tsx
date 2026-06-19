import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ErrorPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8">
      <div className="max-w-xl w-full rounded-3xl border border-red-100 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-red-700">Algo salió mal</h1>
        <p className="mt-3 text-sm text-gray-600">No se pudo cargar esta página. Intenta recargar o vuelve al panel principal.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  )
}
