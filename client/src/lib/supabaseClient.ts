import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hvnjlxxcxfxvuwlmnwtw.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bmpseHhjeGZ4dnV3bG1ud3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzA3ODIsImV4cCI6MjA3OTU0Njc4Mn0.SmL4eqGq8XLfbLOolxGdafLhS6eeTgYGGn1w9gcrWdU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

