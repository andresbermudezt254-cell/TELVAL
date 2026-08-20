import { CheckCircle, Clock, XCircle, AlertCircle, ShoppingCart, Package } from 'lucide-react'
import { estadoLabel, formatDateTime } from '@/lib/utils'
import type { HistorialRequisicion } from '@/types'

interface TimelineProps {
  historial: HistorialRequisicion[]
}

const estadoIcon: Record<string, React.ReactNode> = {
  pendiente:  <Clock size={16} className="text-yellow-600" />,
  revisando:  <AlertCircle size={16} className="text-blue-600" />,
  aprobado:   <CheckCircle size={16} className="text-green-600" />,
  en_compra:  <ShoppingCart size={16} className="text-orange-600" />,
  completado: <Package size={16} className="text-emerald-700" />,
  rechazado:  <XCircle size={16} className="text-red-600" />,
}

const estadoBg: Record<string, string> = {
  pendiente:  'bg-yellow-100',
  revisando:  'bg-blue-100',
  aprobado:   'bg-green-100',
  en_compra:  'bg-orange-100',
  completado: 'bg-emerald-100',
  rechazado:  'bg-red-100',
}

export function OrderTimeline({ historial }: TimelineProps) {
  return (
    <ol className="relative border-l border-gray-200 ml-4 space-y-4">
      {historial.map((item, i) => (
        <li key={item.id} className="ml-6">
          <span
            className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${estadoBg[item.estado_nuevo] ?? 'bg-gray-100'}`}
          >
            {estadoIcon[item.estado_nuevo] ?? <Clock size={16} />}
          </span>
          <div className={i === historial.length - 1 ? 'font-semibold' : ''}>
            <p className="text-sm text-gray-900">
              {item.estado_anterior ? (
                <>
                  <span className="text-gray-500">{estadoLabel(item.estado_anterior)}</span>
                  {' → '}
                </>
              ) : null}
              <span>{estadoLabel(item.estado_nuevo)}</span>
            </p>
            {item.comentario && (
              <p className="text-xs text-gray-500 mt-0.5 italic">"{item.comentario}"</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDateTime(item.created_at)}
              {item.usuario?.nombre_completo && ` · ${item.usuario.nombre_completo}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
