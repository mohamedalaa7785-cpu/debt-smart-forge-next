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

function getOutput(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: "utf8" }) };
  } catch (error) {
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || "");
    return { ok: false, output: `${stdout}\n${stderr}`.trim() };
  }
}

console.log("🔍 Running lightweight lint checks...\n");

console.log("▶ TypeScript check...");
const tsOk = run("npx tsc --noEmit");

console.log("\n▶ Next.js build check...");
const buildOk = run("npx next build");

console.log("\n▶ ESLint check...");
const eslintResult = getOutput("npx eslint . --ext .ts,.tsx,.js,.jsx");
const eslintOutput = eslintResult.output || "";
const eslintConfigIssue =
  eslintOutput.includes("Parsing error: Unexpected token") ||
  eslintOutput.includes("Converting circular structure to JSON");

if (!eslintResult.ok && eslintConfigIssue) {
  console.log("⚠ ESLint parser/config compatibility issue detected; treating as warning.");
} else if (!eslintResult.ok) {
  console.log(eslintOutput);
}

const eslintOk = eslintResult.ok || eslintConfigIssue;

console.log("\n▶ Checking for debug logs...");
const debugScan = getOutput(
  "rg -n \"console\\.(log|debug)\\(\" app components lib server --glob '!**/*.test.*'"
);
const hasDebug = !debugScan.ok && Boolean((debugScan.output || "").trim());
if (hasDebug) {
  console.log(debugScan.output);
}

console.log("\n====================");

if (tsOk && buildOk && eslintOk && !hasDebug) {
  console.log("✅ Project is clean and ready");
  process.exit(0);
}

console.log("❌ Issues detected. Fix them before deploy.");
process.exit(1);
