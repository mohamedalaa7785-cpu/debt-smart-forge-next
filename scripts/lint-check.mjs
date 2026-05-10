#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

console.log("🔍 Running lightweight lint checks...\n");

console.log("▶ TypeScript check...");
const tsOk = run("npx tsc --noEmit");

console.log("\n▶ Next.js build check...");
const buildOk = run("npx next build");

console.log("\n====================");
if (tsOk && buildOk) {
  console.log("✅ Project is clean and ready");
  process.exit(0);
}

console.log("❌ Issues detected. Fix them before deploy.");
process.exit(1);
