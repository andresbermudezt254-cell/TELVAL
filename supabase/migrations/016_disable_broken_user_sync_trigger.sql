-- El backend administrativo crea y sincroniza el perfil despues de crear
-- la cuenta en Auth. El trigger antiguo usa un esquema desactualizado y hace
-- que Supabase devuelva "Database error creating new user".

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
