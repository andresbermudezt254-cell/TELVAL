import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('Checking public.usuarios rows for rol = almacen...');

const { data, error } = await supabaseAdmin
  .from('usuarios')
  .select('id, email, rol')
  .eq('rol', 'almacen')
  .limit(10);

console.log('query result:', {
  success: !error,
  error: error?.message,
  rows: data,
});

const { data: sample, error: sampleError } = await supabaseAdmin
  .from('usuarios')
  .select('id, email, rol')
  .order('rol')
  .limit(20);

console.log('sample rows:', {
  success: !sampleError,
  error: sampleError?.message,
  rows: sample,
});
