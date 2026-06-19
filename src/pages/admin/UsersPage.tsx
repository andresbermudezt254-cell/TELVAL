import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { usuarioCreateSchema, usuarioEditSchema, especialidadOptions, type UsuarioCreateForm, type UsuarioEditForm } from '@/lib/validations'
import { Users, Plus, Edit2, ShieldCheck, UserX, UserCheck, AlertTriangle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import type { Usuario } from '@/types'

/* â”€â”€â”€ hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function useUsers() {
  return useQuery<Usuario[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nombre_completo')
      if (error) throw error
      return data
    },
  })
}

function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('usuarios').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Estado actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })
}

function useEditUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UsuarioEditForm }) => {
      const { error } = await supabase.from('usuarios').update({
        nombre_completo: data.nombre_completo,
        rol: data.rol,
        especialidad: data.especialidad || null,
        whatsapp: data.whatsapp || null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario actualizado') },
    onError: (e) => toast.error('Error: ' + (e as Error).message),
  })
}

function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form: UsuarioCreateForm) => {
      if (supabaseAdmin) {
        const { data: newAuthUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: { nombre_completo: form.nombre_completo },
        })
        if (signUpError) throw signUpError
        if (!newAuthUser.user) throw new Error('No se pudo crear el usuario')

        const { error: updateError } = await supabase
          .from('usuarios')
          .upsert(
            {
              id: newAuthUser.user.id,
              nombre_completo: form.nombre_completo,
              rol: form.rol,
              especialidad: form.especialidad || null,
              whatsapp: form.whatsapp || null,
            },
            { onConflict: 'id' }
          )
        if (updateError) throw updateError

        return newAuthUser.user
      }

      const adminApiUrl = (import.meta.env.VITE_ADMIN_API_URL as string) || 'http://localhost:4000'
      const resp = await fetch(`${adminApiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await resp.json()
      if (!resp.ok) throw new Error(body?.error || 'Error creating user')
      return body
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario creado exitosamente') },
    onError: (e) => toast.error('Error al crear usuario: ' + (e as Error).message),
  })
}

function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
          password,
          email_confirm: true,
        })
        if (error) throw error
        return
      }

      const adminApiUrl = (import.meta.env.VITE_ADMIN_API_URL as string) || 'http://localhost:4000'
      const resp = await fetch(`${adminApiUrl}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      })
      const body = await resp.json()
      if (!resp.ok) throw new Error(body?.error || 'Error al restablecer contraseña')
    },
    onSuccess: () => toast.success('Contraseña actualizada. El usuario ya puede ingresar.'),
    onError: (e) => toast.error('Error: ' + (e as Error).message),
  })
}

/* ─── ResetPasswordModal ──────────────────────────────── */
function ResetPasswordModal({ user, onClose }: { user: Usuario | null; onClose: () => void }) {
  const resetPwd = useResetPassword()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ password: string; confirm: string }>({
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = async (data: { password: string; confirm: string }) => {
    if (!user) return
    if (data.password !== data.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (data.password.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    await resetPwd.mutateAsync({ id: user.id, password: data.password })
    reset()
    onClose()
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Restablecer contraseña"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="reset-pwd-form" type="submit" loading={isSubmitting || resetPwd.isPending}>Guardar</Button>
        </div>
      }
    >
      {user && (
        <form id="reset-pwd-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-sm">
              {user.nombre_completo.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.nombre_completo}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>La nueva contraseña se aplica de inmediato y confirma el acceso del usuario.</p>
          </div>
          <Input label="Nueva contraseña" type="password" required placeholder="Mín. 8 caracteres" error={errors.password?.message} {...register('password')} />
          <Input label="Confirmar contraseña" type="password" required placeholder="Repite la contraseña" error={errors.confirm?.message} {...register('confirm')} />
        </form>
      )}
    </Modal>
  )
}

/* ─── EditUserModal ────────────────────────────────────── */
function EditUserModal({ user, onClose }: { user: Usuario | null; onClose: () => void }) {
  const editUser = useEditUser()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UsuarioEditForm>({
    resolver: zodResolver(usuarioEditSchema) as any,
    values: user ? {
      nombre_completo: user.nombre_completo,
      rol: user.rol,
      especialidad: user.especialidad ?? undefined,
      whatsapp: user.whatsapp ?? '',
    } : undefined,
  })

  const onSubmit = async (data: UsuarioEditForm) => {
    if (!user) return
    await editUser.mutateAsync({ id: user.id, data })
    onClose()
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Editar usuario"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="edit-user-form" type="submit" loading={isSubmitting || editUser.isPending}>Guardar cambios</Button>
        </div>
      }
    >
      {user && (
        <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-sm">
              {user.nombre_completo.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.nombre_completo}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <Input label="Nombre completo" required error={errors.nombre_completo?.message} {...register('nombre_completo')} />
          <Input label="WhatsApp" placeholder="3001234567" error={errors.whatsapp?.message} {...register('whatsapp')} />
          <Select
            label="Rol"
            required
            error={errors.rol?.message as string}
            options={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'almacen', label: 'Almacén' },
              { value: 'admin', label: 'Administrador' },
              { value: 'superadmin', label: 'Superadmin' },
            ]}
            {...register('rol')}
          />
          <Select
            label="Especialidad"
            error={errors.especialidad?.message as string}
            placeholder="Sin especialidad"
            options={especialidadOptions.map((e) => ({ value: e, label: e }))}
            {...register('especialidad')}
          />
        </form>
      )}
    </Modal>
  )
}

/* â”€â”€â”€ CreateUserModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UsuarioCreateForm>({
    resolver: zodResolver(usuarioCreateSchema) as any,
    defaultValues: { rol: 'empleado' },
  })

  const onSubmit = async (data: UsuarioCreateForm) => {
    await createUser.mutateAsync(data)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Crear nuevo usuario"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button form="create-user-form" type="submit" loading={isSubmitting || createUser.isPending}>Crear usuario</Button>
        </div>
      }
    >
      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-4">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <p>El usuario recibirá acceso inmediato con la contraseña que establezcas. Compártela de forma segura.</p>
      </div>
      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nombre completo" required error={errors.nombre_completo?.message} {...register('nombre_completo')} />
        <Input label="Correo electrónico" type="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Contraseña temporal" type="password" required error={errors.password?.message} placeholder="Mín. 8 caracteres" {...register('password')} />
        <Input label="WhatsApp" placeholder="3001234567" error={errors.whatsapp?.message} {...register('whatsapp')} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Rol"
            required
            error={errors.rol?.message as string}
            options={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'almacen', label: 'Almacén' },
              { value: 'admin', label: 'Administrador' },
              { value: 'superadmin', label: 'Superadmin' },
            ]}
            {...register('rol')}
          />
          <Select
            label="Especialidad"
            placeholder="Sin especialidad"
            error={errors.especialidad?.message as string}
            options={especialidadOptions.map((e) => ({ value: e, label: e }))}
            {...register('especialidad')}
          />
        </div>
      </form>
    </Modal>
  )
}

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function UsersPage() {
  const { user: me } = useAuthStore()
  const { data: users, isLoading } = useUsers()
  const toggleActive = useToggleUserActive()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)
  const [resetUser, setResetUser] = useState<Usuario | null>(null)

  const adminCount = users?.filter((u) => u.rol === 'admin').length ?? 0
  const warehouseCount = users?.filter((u) => u.rol === 'almacen').length ?? 0
  const empleadoCount = users?.filter((u) => u.rol === 'empleado').length ?? 0
  const activeCount = users?.filter((u) => u.activo).length ?? 0

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-full">
            <ShieldCheck size={13} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
            <Users size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">{empleadoCount} empleado{empleadoCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full">
            <Users size={13} className="text-orange-600" />
            <span className="text-xs font-semibold text-orange-700">{warehouseCount} almacén</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
            <UserCheck size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700">{activeCount} activo{activeCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus size={15} />}>
          Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      {!users?.length ? (
        <EmptyState icon={<Users size={40} strokeWidth={1} />} title="Sin usuarios" description="No hay usuarios registrados." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Usuario', 'Contacto', 'Especialidad', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        u.rol === 'superadmin' ? 'bg-fuchsia-600' : u.rol === 'admin' ? 'bg-purple-600' : u.rol === 'almacen' ? 'bg-orange-600' : 'bg-[#1e3a5f]'
                      }`}>
                        {u.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{u.nombre_completo}</p>
                          {u.id === me?.id && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">Tú</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {u.whatsapp ? (
                      <a href={`https://wa.me/57${u.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="text-green-700 hover:underline font-medium">
                        {u.whatsapp}
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {u.especialidad
                      ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">{u.especialidad}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={
                      u.rol === 'superadmin'
                        ? 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200'
                        : u.rol === 'admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : u.rol === 'almacen'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }>
                      {u.rol === 'superadmin' ? 'Superadmin' : u.rol === 'admin' ? 'Administrador' : u.rol === 'almacen' ? 'Almacén' : 'Empleado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                      u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#1e3a5f] transition-colors"
                        title="Editar datos"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setResetUser(u)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Restablecer contraseña"
                      >
                        <KeyRound size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, activo: !u.activo })}
                          disabled={toggleActive.isPending}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.activo
                              ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                              : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                          }`}
                          title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {u.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
    </div>
  )
}

