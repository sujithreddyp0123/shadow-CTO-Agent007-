import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEngineeringOs, writeReports } from "./engineering-os-builder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(root, "public", "live-run.json");
const osEvidencePath = path.join(root, "public", "engineering-os.json");
const reportsDir = path.join(root, "outputs", "reports");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const finalTestOutput = evidence.checks?.[evidence.checks.length - 1]?.result ?? "";
const os = buildEngineeringOs({
  evidence,
  diffOutput: evidence.diff ?? "",
  finalTestOutput,
});

mkdirSync(path.dirname(osEvidencePath), { recursive: true });
writeFileSync(osEvidencePath, `${JSON.stringify(os, null, 2)}\n`);
writeReports({ evidence, os, reportsDir });

console.log(`Wrote ${osEvidencePath}`);
console.log(`Wrote reports to ${reportsDir}`);
