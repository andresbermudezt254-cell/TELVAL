import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UnidadMedida } from '@/types'

export function useUnidadesMedida() {
  return useQuery({
    queryKey: ['unidades-medida'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('id, nombre, abreviatura')
        .order('nombre')
      if (error) throw error
      return data as UnidadMedida[]
    },
  })
}
