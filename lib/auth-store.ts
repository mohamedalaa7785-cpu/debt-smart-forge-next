import { createClient } from "./supabase";

export function setAuth(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}
