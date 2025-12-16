import { createClient } from '@supabase/supabase-js';

// Support both standard process.env and Vite import.meta.env
const supabaseUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;