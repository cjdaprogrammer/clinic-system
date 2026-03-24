import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This will print to your browser console
console.log("DEBUG: Supabase URL is:", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  // If you see this message in the console, the file is in the wrong place!
  console.error("CRITICAL ERROR: Supabase Keys are missing from .env.local");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.co', supabaseAnonKey || 'placeholder')