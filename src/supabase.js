import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfvwbepzyjtrprbjfotb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdndiZXB6eWp0cnByYmpmb3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzQ5NzMsImV4cCI6MjEwMTk1MDk3M30.RorwGxwjPqEKSeGnKHJlt2lNG4ABnzWtRl2Y-Tlk6f8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
