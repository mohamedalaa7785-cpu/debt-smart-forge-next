import { createClient } from "./supabase";

export async function setAuth() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return Boolean(session);
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function isLoggedIn() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return Boolean(session);
}
