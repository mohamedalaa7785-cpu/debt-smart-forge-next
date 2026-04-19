#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function getOutput(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch (error) {
    return String(error?.stdout || "");
  }
}

console.log("🔍 Running lightweight lint checks...\n");

// ======================
// 1) TypeScript check
// ======================
console.log("▶ TypeScript check...");
const tsOk = run("npx tsc --noEmit");

// ======================
// 2) Next.js build check
// ======================
console.log("\n▶ Next.js build check...");
const buildOk = run("npx next build");

// ======================
// 3) ESLint (optional)
// ======================
console.log("\n▶ ESLint check...");
const eslintOk = run("npx eslint . --ext .ts,.tsx,.js,.jsx");

// ======================
// 4) Detect console.log
// ======================
console.log("\n▶ Checking for debug logs...");

const files = readdirSync(".");

let hasDebug = false;

for (const file of files) {
  if (file.endsWith(".js") || file.endsWith(".ts")) {
    const content = readFileSync(file, "utf8");
    if (content.includes("console.log")) {
      console.log(`⚠ Debug log found in ${file}`);
      hasDebug = true;
    }
  }
}

// ======================
// FINAL RESULT
// ======================
console.log("\n====================");

if (tsOk && buildOk && eslintOk && !hasDebug) {
  console.log("✅ Project is clean and ready");
  process.exit(0);
} else {
  console.log("❌ Issues detected. Fix them before deploy.");
  process.exit(1);
}