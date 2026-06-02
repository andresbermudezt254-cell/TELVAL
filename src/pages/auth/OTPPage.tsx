import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, RotateCcw, LogOut, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { verificarOTP } from '@/lib/otp'

const DIGITS = 4

export default function OTPPage() {
  const navigate = useNavigate()
  const {
    user,
    pendingUserId,
    pendingEmail,
    devCode,
    otpVerified,
    confirmOtp,
    clearPending,
    logout,
    resendOtp,
  } = useAuthStore()

  const [digits, setDigits]         = useState<string[]>(Array(DIGITS).fill(''))
  const [loading, setLoading]       = useState(false)
  const [sending, setSending]       = useState(false)
  const [countdown, setCountdown]   = useState(0)
  const [showDevCode, setShowDevCode] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Si ya verifico el OTP (sesion activa), redirigir directo
  useEffect(() => {
    if (otpVerified && user) {
      if (user.rol === 'admin') navigate('/admin/dashboard', { replace: true })
      else navigate('/catalogo', { replace: true })
    }
  }, [otpVerified, user, navigate])

  // Si no hay usuario pendiente Y el OTP no esta verificado: ir a login
  useEffect(() => {
    if (!pendingUserId && !otpVerified) {
      navigate('/login', { replace: true })
    }
  }, [pendingUserId, otpVerified, navigate])

  // Countdown para reenvio
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleResend() {
    setSending(true)
    try {
      await resendOtp()
      setCountdown(60)
      toast.success('Codigo generado')
    } catch (e) {
      toast.error('No se pudo generar el codigo: ' + (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (char && next.every((d) => d !== '')) {
      handleVerify(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus()
    if (pasted.length === DIGITS) handleVerify(pasted)
  }

  async function handleVerify(code?: string) {
    if (!pendingUserId) return
    const finalCode = code ?? digits.join('')
    if (finalCode.length < DIGITS) { toast.error('Ingresa los 4 digitos'); return }
    setLoading(true)
    try {
      const valid = await verificarOTP(pendingUserId, finalCode)
      if (!valid) {
        toast.error('Codigo incorrecto o expirado')
        setDigits(Array(DIGITS).fill(''))
        inputRefs.current[0]?.focus()
        return
      }
      // confirmOtp pone otpVerified:true -> useEffect redirige automaticamente
      confirmOtp()
    } catch (e) {
      toast.error('Error al verificar: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    clearPending()
    await logout()
    navigate('/login', { replace: true })
  }

  const maskedEmail = pendingEmail
    ? pendingEmail.replace(/(.{2})(.*)(@.*)/, (_m, p1, p2, p3) => p1 + '*'.repeat(Math.max(2, p2.length)) + p3)
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2440] via-[#1e3a5f] to-[#1a4a7a] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#1a4a7a] px-8 py-8 text-white text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f97316] flex items-center justify-center shadow-lg shadow-orange-900/30 mb-4">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Verificacion en 2 pasos</h1>
          {pendingEmail ? (
            <>
              <p className="text-blue-200/80 text-sm mt-1">Codigo de verificacion para</p>
              <p className="text-[#f97316] font-semibold text-sm mt-0.5">{maskedEmail}</p>
            </>
          ) : (
            <p className="text-blue-200/80 text-sm mt-1">Ingresa el codigo de 4 digitos</p>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-8 space-y-6">

          {/* Codigo visible cuando no hay EmailJS */}
          {devCode && (
            <div className="rounded-2xl border-2 border-dashed border-[#f97316] bg-orange-50 p-4 text-center">
              <p className="text-xs text-orange-600 font-medium mb-2 uppercase tracking-wider">
                Tu codigo de verificacion
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className={`text-4xl font-black tracking-[0.3em] text-[#1e3a5f] transition-all ${showDevCode ? '' : 'blur-sm select-none'}`}>
                  {devCode}
                </span>
                <button
                  onClick={() => setShowDevCode((v) => !v)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#1e3a5f] transition-colors"
                >
                  {showDevCode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-orange-400 mt-2">
                Ingresa estos digitos en las cajas de abajo
              </p>
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: DIGITS }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                className={[
                  'w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all disabled:opacity-50',
                  digits[i]
                    ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                    : 'border-gray-200 bg-gray-50 text-gray-800',
                  'focus:border-[#f97316] focus:bg-orange-50 focus:ring-4 focus:ring-orange-100',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Verificar */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || digits.some((d) => !d)}
            className="w-full py-3.5 rounded-2xl bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </>
            ) : 'Verificar codigo'}
          </button>

          {/* Reenviar */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-xs text-gray-400">
                Reenviar en <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="flex items-center gap-1.5 mx-auto text-xs text-[#1e3a5f] hover:text-[#f97316] font-medium transition-colors disabled:opacity-50"
              >
                <RotateCcw size={13} className={sending ? 'animate-spin' : ''} />
                {sending ? 'Generando...' : 'Generar nuevo codigo'}
              </button>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-300">o</span></div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut size={13} />
            Cerrar sesion y volver al inicio
          </button>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-[10px] text-gray-300">El codigo expira en 10 minutos · TELVAL S.A.S</p>
        </div>
      </div>
    </div>
  )
}