// FIX: Add a triple-slash directive to include Vite's client types.
// This provides TypeScript with type definitions for `import.meta.env`.
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

// As chaves do Supabase são carregadas a partir de variáveis de ambiente,
// conforme as melhores práticas de segurança e a documentação do projeto.
// Para desenvolvimento local, crie um arquivo .env na raiz e adicione:
// VITE_SUPABASE_URL="SEU_URL_SUPABASE"
// VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON"

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram definidas. Verifique seu arquivo .env ou as configurações de ambiente.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
