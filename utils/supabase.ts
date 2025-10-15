import { createClient } from '@supabase/supabase-js';

// As chaves do Supabase agora são carregadas a partir de variáveis de ambiente
// usando o padrão do Vite (prefixo VITE_).
// Crie um arquivo .env na raiz do projeto com as suas chaves.
// FIX: Cast import.meta to any to access Vite environment variables without global type modification.
export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
// FIX: Cast import.meta to any to access Vite environment variables without global type modification.
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in the .env file with the VITE_ prefix.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
