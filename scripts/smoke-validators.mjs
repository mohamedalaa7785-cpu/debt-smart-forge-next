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
  "app/api/health/route.ts",
  "app/api/health/secure/route.ts",
  "app/api/autonomy/route.ts",
  "app/api/autonomy/approvals/route.ts",
  "app/api/autonomy/publish/preview/route.ts",
  "app/api/autonomy/experiments/route.ts",
];

for (const route of criticalRoutes) {
  assert(`critical route exists: ${route}`, fs.existsSync(route));
  const src = read(route);
  assert(`route exports handler: ${route}`, /export\s+async\s+function\s+(GET|POST|PATCH|DELETE)/.test(src));
}

const loginSrc = read("app/api/auth/login/route.ts");
assert("login route wired to auth service", loginSrc.includes("loginUser") || loginSrc.includes("LoginBodySchema"));

const registerSrc = read("app/api/auth/register/route.ts");
assert(
  "register route wired to signup service",
  registerSrc.includes("handleSignupRequest") || registerSrc.includes("RegisterBodySchema"),
);

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


const healthSrc = read("app/api/health/route.ts");
assert("health route pinned to node runtime", healthSrc.includes('export const runtime = "nodejs"'));

const secureHealthSrc = read("app/api/health/secure/route.ts");
assert("secure health route pinned to node runtime", secureHealthSrc.includes('export const runtime = "nodejs"'));
assert("secure health route uses auth", secureHealthSrc.includes("withAuth"));

const autonomySrc = read("app/api/autonomy/route.ts");
assert("autonomy route supports pause/resume", autonomySrc.includes("setAutonomyStatus"));
assert("autonomy route handles duplicate runs", autonomySrc.includes("AUTONOMY_RUN_IN_PROGRESS"));

const publishPreviewSrc = read("app/api/autonomy/publish/preview/route.ts");
assert("publish preview is protected", publishPreviewSrc.includes("withRole"));
assert("publish preview never sends external request", publishPreviewSrc.includes("externalRequestSent: false"));
const experimentsRouteSrc = read("app/api/autonomy/experiments/route.ts");
assert("experiments route validates payload", experimentsRouteSrc.includes("ExperimentSchema"));
assert("experiments route is role protected", experimentsRouteSrc.includes("withRole"));
const publishingRouteSrc = read("app/api/autonomy/publishing/route.ts");
assert("publishing route validates channels", publishingRouteSrc.includes("channelSchema"));
assert("publishing route supports preview jobs", publishingRouteSrc.includes("createPreviewPublishJob"));

const autonomyServiceSrc = read("server/services/autonomy.service.ts");
assert("autonomy run starts as running", autonomyServiceSrc.includes('status: "running"'));
assert("autonomy run records completed state", autonomyServiceSrc.includes('status: "completed"'));
assert("autonomy run records failed state", autonomyServiceSrc.includes('status: "failed"'));
const concurrencyMigration = read("supabase/20260818_autonomy_concurrency.sql");
assert("autonomy concurrency index exists", concurrencyMigration.includes("autonomy_runs_one_active_per_owner_idx"));
assert("growth experiments are exposed in overview", autonomyServiceSrc.includes("autonomyExperiments") && autonomyServiceSrc.includes("experiments"));
const experimentsMigration = read("supabase/20260819_autonomy_experiments.sql");
assert("growth experiments migration exists", experimentsMigration.includes("create table if not exists public.autonomy_experiments"));
const socialMigration = read("supabase/20260819_social_publishing_control.sql");
assert("social channels migration exists", socialMigration.includes("create table if not exists public.social_channels"));
assert("publish jobs migration exists", socialMigration.includes("create table if not exists public.publish_jobs"));

const imageServiceSrc = read("server/services/image-intelligence.service.ts");
assert("image service uses signed URLs", imageServiceSrc.includes("createSignedUrl"));
assert("image service persists storage path", imageServiceSrc.includes("storagePath"));

const uiFiles = ["app/login/page.tsx", "app/signup/page.tsx", "app/layout.tsx"];
for (const file of uiFiles) {
  const src = read(file);
  assert(`no codex debug text leaked in ${file}`, !/codex\//i.test(src));
}

console.log("All critical route smoke checks passed.");
