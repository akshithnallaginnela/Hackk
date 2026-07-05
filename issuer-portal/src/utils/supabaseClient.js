import { createClient } from '@supabase/supabase-js';

// Fallback to placeholders so the app won't crash immediately if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ Supabase URL is missing. Please set VITE_SUPABASE_URL in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
