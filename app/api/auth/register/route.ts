export const dynamic = "force-dynamic";

import { handleSignupRequest } from "@/server/services/auth/signup-http.service";

export async function POST(request: Request) {
  return handleSignupRequest(request, "Invalid registration payload");
}
