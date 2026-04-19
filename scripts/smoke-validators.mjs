import fs from "node:fs";

function assert(name, condition, details = "") {
  if (!condition) {
    throw new Error(`Smoke failed: ${name}${details ? ` (${details})` : ""}`);
  }
  console.log(`OK: ${name}`);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const criticalRoutes = [
  "app/api/auth/login/route.ts",
  "app/api/auth/register/route.ts",
  "app/api/clients/route.ts",
  "app/api/dashboard/route.ts",
  "app/api/map/route.ts",
  "app/api/search/route.ts",
  "app/api/phone-lookup/route.ts",
  "app/api/search-clients/route.ts",
  "app/api/upload-image/route.ts",
  "app/api/search-by-image/route.ts",
  "app/api/face-match/route.ts",
];

for (const route of criticalRoutes) {
  assert(`critical route exists: ${route}`, fs.existsSync(route));
  const src = read(route);
  assert(`route exports handler: ${route}`, /export\s+async\s+function\s+(GET|POST|PATCH|DELETE)/.test(src));
}

const loginSrc = read("app/api/auth/login/route.ts");
assert("login route wired to auth service", loginSrc.includes("loginUser") || loginSrc.includes("LoginBodySchema"));

const registerSrc = read("app/api/auth/register/route.ts");
assert("register route wired to validator", registerSrc.includes("RegisterBodySchema"));

const clientsSrc = read("app/api/clients/route.ts");
assert("clients route wired to validator", clientsSrc.includes("CreateClientBodySchema"));
assert("clients GET query wired to validator", clientsSrc.includes("ClientsListQuerySchema"));

const searchSrc = read("app/api/search/route.ts");
assert("search route wired to validator", searchSrc.includes("SearchQuerySchema"));

const phoneLookupSrc = read("app/api/phone-lookup/route.ts");
assert("phone-lookup route uses validator", phoneLookupSrc.includes("PhoneLookupQuerySchema"));
assert("phone-lookup route uses rate-limit", phoneLookupSrc.includes("enforceRateLimit"));

const searchClientsSrc = read("app/api/search-clients/route.ts");
assert("search-clients route uses validator", searchClientsSrc.includes("SearchClientsQuerySchema"));
assert("search-clients route pinned to node runtime", searchClientsSrc.includes('export const runtime = "nodejs"'));

const uploadImageSrc = read("app/api/upload-image/route.ts");
assert("upload-image route uses validator", uploadImageSrc.includes("UploadImageBodySchema"));
assert("upload-image route pinned to node runtime", uploadImageSrc.includes('export const runtime = "nodejs"'));

const searchByImageSrc = read("app/api/search-by-image/route.ts");
assert("search-by-image route uses validator", searchByImageSrc.includes("SearchByImageBodySchema"));
assert("search-by-image route pinned to node runtime", searchByImageSrc.includes('export const runtime = "nodejs"'));

const faceMatchSrc = read("app/api/face-match/route.ts");
assert("face-match route uses validator", faceMatchSrc.includes("FaceMatchBodySchema"));
assert("face-match route pinned to node runtime", faceMatchSrc.includes('export const runtime = "nodejs"'));

const imageServiceSrc = read("server/services/image-intelligence.service.ts");
assert("image service uses signed URLs", imageServiceSrc.includes("createSignedUrl"));
assert("image service persists storage path", imageServiceSrc.includes("storagePath"));

const uiFiles = ["app/login/page.tsx", "app/signup/page.tsx", "app/layout.tsx"];
for (const file of uiFiles) {
  const src = read(file);
  assert(`no codex debug text leaked in ${file}`, !/codex\//i.test(src));
}

console.log("All critical route smoke checks passed.");
