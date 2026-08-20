import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { supabase } from '@/lib/supabase'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const queryClient = useQueryClient()

  // Sincronización en tiempo real: cualquier cambio en productos o precios
  // se refleja automáticamente en todas las vistas sin necesidad de recargar
  useEffect(() => {
    const channel = supabase
      .channel('realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proveedor_producto' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mejor-proveedor-all'] })
          queryClient.invalidateQueries({ queryKey: ['comparacion-precios'] })
          queryClient.invalidateQueries({ queryKey: ['products'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-[228px] flex-col flex-shrink-0 shadow-xl">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 w-[228px] h-full flex flex-col shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
