import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

import LoginPage from '@/pages/auth/LoginPage'
import OTPPage from '@/pages/auth/OTPPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import RequisitionsPage from '@/pages/admin/RequisitionsPage'
import RequisitionDetailPage from '@/pages/admin/RequisitionDetailPage'
import ProductsPage from '@/pages/admin/ProductsPage'
import SuppliersPage from '@/pages/admin/SuppliersPage'
import UsersPage from '@/pages/admin/UsersPage'
import ReportsPage from '@/pages/admin/ReportsPage'
import OrderSummaryPage from '@/pages/admin/OrderSummaryPage'
import CatalogPage from '@/pages/employee/CatalogPage'
import NewRequisitionPage from '@/pages/employee/NewRequisitionPage'
import MyRequisitionsPage from '@/pages/employee/MyRequisitionsPage'

function RoleRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={user?.rol === 'admin' ? '/admin/dashboard' : '/catalogo'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/verificar-otp',
    element: <OTPPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleRedirect /> },
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
        element: <ProtectedRoute rol="admin"><Navigate to="/admin/dashboard" replace /></ProtectedRoute>,
      },
      {
        path: 'admin/dashboard',
        element: <ProtectedRoute rol="admin"><DashboardPage /></ProtectedRoute>,
      },
      {
        path: 'admin/requisiciones',
        element: <ProtectedRoute rol="admin"><RequisitionsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/requisiciones/:id',
        element: <ProtectedRoute rol="admin"><RequisitionDetailPage /></ProtectedRoute>,
      },
      {
        path: 'admin/productos',
        element: <ProtectedRoute rol="admin"><ProductsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/proveedores',
        element: <ProtectedRoute rol="admin"><SuppliersPage /></ProtectedRoute>,
      },
      {
        path: 'admin/usuarios',
        element: <ProtectedRoute rol="admin"><UsersPage /></ProtectedRoute>,
      },
      {
        path: 'admin/reportes',
        element: <ProtectedRoute rol="admin"><ReportsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/consolidado',
        element: <ProtectedRoute rol="admin"><OrderSummaryPage /></ProtectedRoute>,
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])
