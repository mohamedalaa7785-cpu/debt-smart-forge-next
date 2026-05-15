import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";
import { handleApiError } from "@/server/core/error.handler";

export async function POST() {
  try {
    if (!hasSupabaseEnv()) {
      return NextResponse.json({ success: true });
    }

    const cookieStore = await cookies();
    const { url, anonKey } = getSupabaseEnv();

    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookieValues) => {
            cookieValues.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          },
        },
      }
    );

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
