import emailjs from '@emailjs/browser'
import { supabaseAdmin } from './supabase'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined

/** Genera un código OTP de 4 dígitos */
export function generarCodigo(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/**
 * Genera el OTP, lo guarda en BD y lo envía por correo si EmailJS está configurado.
 * Devuelve el código cuando NO hay EmailJS, para mostrarlo en pantalla.
 */
export async function enviarOTP(userId: string, email: string): Promise<{ devCode?: string }> {
  if (!supabaseAdmin) throw new Error('Service Role Key no configurado')

  const codigo    = generarCodigo()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Invalidar OTPs anteriores del mismo usuario
  await supabaseAdmin
    .from('otp_tokens')
    .update({ usado: true })
    .eq('user_id', userId)
    .eq('usado', false)

  // Insertar nuevo OTP
  const { error } = await supabaseAdmin
    .from('otp_tokens')
    .insert({ user_id: userId, email, codigo, expires_at: expiresAt })

  if (error) throw new Error('No se pudo generar el código: ' + error.message)

  // Enviar por correo si EmailJS está configurado
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { to_email: email, otp_code: codigo, app_name: 'TELVAL Compras', expire_min: '10' },
        { publicKey: EMAILJS_PUBLIC_KEY }
      )
    } catch (error) {
      console.warn('No se pudo enviar el OTP por correo:', error)
    }
  }

  // Devolver el código para que siempre se muestre en pantalla
  console.info(`[OTP] Código para ${email}: ${codigo}`)
  return { devCode: codigo }
}

/** Verifica el código OTP; devuelve true si es válido y lo marca como usado */
export async function verificarOTP(userId: string, codigo: string): Promise<boolean> {
  if (!supabaseAdmin) throw new Error('Service Role Key no configurado')

  const { data, error } = await supabaseAdmin
    .from('otp_tokens')
    .select('id, expires_at, usado')
    .eq('user_id', userId)
    .eq('codigo', codigo)
    .eq('usado', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false
  if (new Date(data.expires_at) < new Date()) return false

  await supabaseAdmin
    .from('otp_tokens')
    .update({ usado: true })
    .eq('id', data.id)

  return true
}
