import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorPage } from '@/components/ui/ErrorPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import RequisitionsPage from '@/pages/admin/RequisitionsPage'
import RequisitionDetailPage from '@/pages/admin/RequisitionDetailPage'
import ProductsPage from '@/pages/admin/ProductsPage'
import SuppliersPage from '@/pages/admin/SuppliersPage'
import UsersPage from '@/pages/admin/UsersPage'
import ReportsPage from '@/pages/admin/ReportsPage'
import OrderSummaryPage from '@/pages/admin/OrderSummaryPage'
import WarehousePage from '@/pages/admin/WarehousePage'
import WarehouseArrivalsPage from '@/pages/admin/WarehouseArrivalsPage'
import CatalogPage from '@/pages/employee/CatalogPage'
import NewRequisitionPage from '@/pages/employee/NewRequisitionPage'
import MyRequisitionsPage from '@/pages/employee/MyRequisitionsPage'

function RoleRedirect() {
  const user = useAuthStore((s) => s.user)
  if (user?.rol === 'admin' || user?.rol === 'superadmin') return <Navigate to="/admin/dashboard" replace />
  if (user?.rol === 'almacen') return <Navigate to="/almacen" replace />
  return <Navigate to="/catalogo" replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <RoleRedirect /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        ),
      },
      // Employee + Admin shared routes
      {
        path: 'catalogo',
        element: (
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'nueva-requisicion',
        element: (
          <ProtectedRoute>
            <NewRequisitionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'requisiciones/nueva',
        element: (
          <ProtectedRoute roles={['empleado', 'superadmin']}>
            <NewRequisitionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mis-requisiciones',
        element: (
          <ProtectedRoute>
            <MyRequisitionsPage />
          </ProtectedRoute>
        ),
      },
      // Admin routes
      {
        path: 'admin',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>,
      },
      {
        path: 'admin/dashboard',
        element: <ProtectedRoute roles={['admin', 'superadmin', 'almacen']}><DashboardPage /></ProtectedRoute>,
      },
      {
        path: 'admin/requisiciones',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><RequisitionsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/requisiciones/:id',
        element: <ProtectedRoute roles={['admin', 'superadmin', 'almacen']}><RequisitionDetailPage /></ProtectedRoute>,
      },
      {
        path: 'admin/productos',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><ProductsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/proveedores',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><SuppliersPage /></ProtectedRoute>,
      },
      {
        path: 'admin/usuarios',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><UsersPage /></ProtectedRoute>,
      },
      {
        path: 'admin/reportes',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><ReportsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/consolidado',
        element: <ProtectedRoute roles={['admin', 'superadmin']}><OrderSummaryPage /></ProtectedRoute>,
      },
      {
        path: 'admin/almacen',
        element: <ProtectedRoute roles={['almacen', 'superadmin', 'admin']}><WarehousePage /></ProtectedRoute>,
      },
      {
        path: 'admin/almacen/llegadas',
        element: <ProtectedRoute roles={['almacen', 'superadmin', 'admin']}><WarehouseArrivalsPage /></ProtectedRoute>,
      },
      {
        path: 'almacen',
        element: <ProtectedRoute roles={['almacen', 'superadmin', 'admin']}><WarehousePage /></ProtectedRoute>,
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])
