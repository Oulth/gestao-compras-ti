import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://amhfrpmibhouunyqiheq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaGZycG1pYmhvdXVueXFpaGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODg2MjcsImV4cCI6MjEwNjM2NDYyN30.Ovw7nFCV4iB3KTJrx-yxewCKLfbRdNVJ4Omt73DbnOM';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Variáveis de ambiente VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não encontradas no bundle; utilizando valores padrão de fallback.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
