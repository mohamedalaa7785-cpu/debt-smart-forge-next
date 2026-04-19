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

console.log("Running lightweight lint checks...");

if (!run("npm run typecheck")) process.exit(1);

const mergeMarkers = getOutput(
  "rg -n \"^(<<<<<<< .+|=======|>>>>>>> .+)$\" app components lib server scripts drizzle"
);

if (mergeMarkers.trim()) {
  console.error("Found unresolved merge markers:\n", mergeMarkers);
  process.exit(1);
}

const migrationFiles = readdirSync("drizzle/migrations")
  .filter((file) => /^\d+_.*\.sql$/.test(file))
  .sort();

const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8"));
const journalTags = new Set((journal.entries || []).map((entry) => entry.tag));

const missingInJournal = migrationFiles
  .map((file) => file.replace(/\.sql$/, ""))
  .filter((tag) => !journalTags.has(tag));

if (missingInJournal.length > 0) {
  console.error(`Migration journal is missing tags: ${missingInJournal.join(", ")}`);
  process.exit(1);
}

console.log("✓ TypeScript passed");
console.log("✓ No merge markers found");
console.log("✓ Drizzle migration journal is synchronized");
