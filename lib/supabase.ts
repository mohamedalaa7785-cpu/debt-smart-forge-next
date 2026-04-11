import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase-env";

export const createClient = () => {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
};
