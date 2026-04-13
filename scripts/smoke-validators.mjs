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
];

for (const route of criticalRoutes) {
  assert(`critical route exists: ${route}`, fs.existsSync(route));
  const src = read(route);
  assert(`route exports handler: ${route}`, /export\s+async\s+function\s+(GET|POST|PATCH|DELETE)/.test(src));
}

const loginSrc = read("app/api/auth/login/route.ts");
assert("login route wired to validator", loginSrc.includes("LoginBodySchema"));

const registerSrc = read("app/api/auth/register/route.ts");
assert("register route wired to validator", registerSrc.includes("RegisterBodySchema"));

const clientsSrc = read("app/api/clients/route.ts");
assert("clients route wired to validator", clientsSrc.includes("CreateClientBodySchema"));
assert("clients GET query wired to validator", clientsSrc.includes("ClientsListQuerySchema"));


const searchSrc = read("app/api/search/route.ts");
assert("search route wired to validator", searchSrc.includes("SearchQuerySchema"));

console.log("All critical route smoke checks passed.");
