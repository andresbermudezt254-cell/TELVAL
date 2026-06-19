import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { loginSchema, type LoginForm } from '@/lib/validations'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    const { error } = await login(data.email, data.password)
    if (error) {
      toast.error(error)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f2440 0%, #1e3a5f 60%, #1a4a7a 100%)' }}>

        {/* Geometric decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/[0.03] border border-white/[0.06]" />
          <div className="absolute top-1/2 -right-24 w-72 h-72 rounded-full bg-[#f97316]/[0.08] border border-[#f97316]/[0.12]" />
          <div className="absolute -bottom-20 left-1/3 w-56 h-56 rounded-full bg-white/[0.03] border border-white/[0.05]" />
          {/* Fine grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center shadow-lg shadow-orange-900/30">
            <span className="text-white font-black text-lg">T</span>
          </div>
          <div>
            <p className="font-bold text-base leading-none tracking-wide">TELVAL S.A.S</p>
            <p className="text-blue-300/80 text-[10px] tracking-[0.2em] uppercase mt-0.5">Mantenimientos Metro</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight">
              Sistema de<br />Gestión de<br />
              <span className="text-[#f97316]">Requisiciones</span>
            </h2>
            <p className="text-blue-200/70 mt-5 text-sm leading-relaxed max-w-[280px]">
              Plataforma integral para la gestión de compras, control de inventario y análisis de proveedores.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '1.896', label: 'Precios' },
              { value: '43', label: 'Proveedores' },
              { value: '100%', label: 'En línea' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-blue-300/70 text-[10px] uppercase tracking-widest mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 text-blue-300/60 text-xs">
            <ShieldCheck size={14} className="text-[#f97316]/60" />
            <span>Acceso seguro con autenticación empresarial</span>
          </div>
        </div>

        <p className="text-blue-400/50 text-xs relative z-10">© 2025 TELVAL S.A.S · Medellín, Colombia</p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="min-h-screen lg:min-h-0 flex flex-col items-center justify-center bg-white px-8 py-12">

        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-[#1e3a5f] flex items-center justify-center">
            <span className="text-white font-black text-base">T</span>
          </div>
          <div>
            <p className="font-bold text-sm text-[#1e3a5f] leading-none">TELVAL S.A.S</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Mantenimientos Metro</p>
          </div>
        </div>

        <div className="w-full max-w-[360px]">
          {/* Header */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Bienvenido de vuelta</h3>
            <p className="text-sm text-gray-400 mt-1.5">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="usuario@telval.com"
                {...register('email')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-lg shadow-[#1e3a5f]/20"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al sistema</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            ¿Problemas para ingresar? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
