import { redirect } from "next/navigation";
import { requireUser } from "@/server/lib/auth";

export default async function HomePage() {
  try {
    await requireUser();
    redirect("/dashboard");
  } catch {
    redirect("/login");
  }
}
