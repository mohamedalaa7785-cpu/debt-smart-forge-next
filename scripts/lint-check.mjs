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
    return execSync(cmd, { encoding: "utf8" });
  } catch (error) {
    return String(error?.stdout || "");
  }
}

console.log("Running lightweight lint checks...");

if (!run("npm run typecheck")) process.exit(1);

const mergeMarkers = getOutput(
  "rg -n \"^(<<<<<<< .+|=======|>>>>>>> .+)$\" app components lib server scripts"
);

if (mergeMarkers.trim()) {
  console.error("Found unresolved merge markers:\n", mergeMarkers);
  process.exit(1);
}

console.log("✓ TypeScript passed");
console.log("✓ No merge markers found");
