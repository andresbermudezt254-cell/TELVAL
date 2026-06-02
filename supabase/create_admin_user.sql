-- ============================================================
-- CREAR USUARIO ADMINISTRADOR EN TELVAL COMPRAS
-- ============================================================
-- Cómo ejecutar:
--   1. Ve a: https://supabase.com → tu proyecto → SQL Editor
--   2. Pega este script completo y haz clic en "Run"
--
-- Credenciales que se crearán:
--   Email:      admin@telval.com
--   Contraseña: Admin1234!
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_email   TEXT := 'admin@telval.com';
  v_pass    TEXT := 'Admin1234!';
  v_nombre  TEXT := 'Administrador TELVAL';
BEGIN

  -- Verificar si ya existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ya existe: solo actualizar el rol a admin
    UPDATE public.usuarios
    SET rol = 'admin', nombre_completo = v_nombre, activo = true
    WHERE id = v_user_id;

    RAISE NOTICE '✅ Usuario ya existía. Rol actualizado a admin. ID: %', v_user_id;

  ELSE
    -- Crear nuevo usuario
    v_user_id := gen_random_uuid();

    -- 1. Insertar en auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre_completo', v_nombre),
      FALSE,
      NOW(),
      NOW()
    );

    -- 2. Insertar identidad email (necesaria para el login)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_email,
      NOW(),
      NOW(),
      NOW()
    );

    -- 3. Insertar perfil en tabla pública (el trigger puede haberlo creado ya)
    INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
    VALUES (v_user_id, v_email, v_nombre, 'admin', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
      SET rol = 'admin', nombre_completo = v_nombre, activo = true;

    RAISE NOTICE '✅ Admin creado exitosamente. ID: %', v_user_id;
    RAISE NOTICE '   Email:      %', v_email;
    RAISE NOTICE '   Contraseña: %', v_pass;
  END IF;

END;
$$;
