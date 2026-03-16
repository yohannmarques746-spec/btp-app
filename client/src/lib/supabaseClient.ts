import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jdrgpfsgfixacxkkrjof.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcmdwZnNnZml4YWN4a2tyam9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTIzNzMsImV4cCI6MjA4NjE2ODM3M30.3ECsVrrO0-fm7gRQIn4BKkBceAXeV0RLG7UIbpRryy4'

// #region agent log
fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H1',location:'client/src/lib/supabaseClient.ts:6',message:'Supabase client configuration resolved',data:{url:SUPABASE_URL,urlHasJdrg:SUPABASE_URL.includes('jdrgpfsgfixacxkkrjof'),keyType:SUPABASE_ANON_KEY.startsWith('sb_publishable_')?'publishable':(SUPABASE_ANON_KEY.startsWith('eyJ')?'jwt':'other'),envUrlPresent:Boolean(import.meta.env.VITE_SUPABASE_URL),envKeyPresent:Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)},timestamp:Date.now()})}).catch(()=>{});
// #endregion

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

