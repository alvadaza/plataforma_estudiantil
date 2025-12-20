import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cbuwcmodyxkfiemhzvai.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidXdjbW9keXhrZmllbWh6dmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzc0NTksImV4cCI6MjA4MDk1MzQ1OX0.vVR1mIC-cXdLhK8GnurZ_fGRURPjcQFh4JFS_VEfKrI"; // ← cámbialo

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: sessionStorage,
    autoRefreshToken: true,
  },
});
