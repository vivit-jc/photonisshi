import { createClient } from '@supabase/supabase-js'

// 接続先は Vite のモード別 .env ファイル、またはシェルの環境変数で切り替える（.env.example 参照）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    `Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (mode: ${import.meta.env.MODE})`,
  )
}

if (import.meta.env.DEV) {
  console.info(`[supabase] mode: ${import.meta.env.MODE}, url: ${supabaseUrl}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
