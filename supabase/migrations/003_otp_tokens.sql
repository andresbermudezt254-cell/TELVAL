-- Tabla de códigos OTP para verificación de sesión en dos pasos
CREATE TABLE IF NOT EXISTS public.otp_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID      NOT NULL,
  email      TEXT      NOT NULL,
  codigo     TEXT      NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN   NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo se accede con service_role (supabaseAdmin)

CREATE INDEX IF NOT EXISTS idx_otp_user_id  ON public.otp_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires   ON public.otp_tokens (expires_at);
