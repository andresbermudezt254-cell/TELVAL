import { formatCOP } from '@/lib/utils'

interface CurrencyCOPProps {
  value: number | null | undefined
  className?: string
}

export function CurrencyCOP({ value, className = '' }: CurrencyCOPProps) {
  return <span className={className}>{formatCOP(value)}</span>
}
