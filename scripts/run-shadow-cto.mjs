import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEngineeringOs as buildDerivedEngineeringOs, writeReports as writeDerivedReports } from "./engineering-os-builder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedRepo = path.join(root, "demo-repos", "acme-saas-demo");
const repo = path.join(root, "work", "shadow-demo-repo");
const evidencePath = path.join(root, "public", "live-run.json");
const osEvidencePath = path.join(root, "public", "engineering-os.json");
const reportsDir = path.join(root, "outputs", "reports");
const nodeCommand = process.execPath;
const localCodex = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "codex.cmd" : "codex",
);

function run(command, args, options = {}) {
  const started = Date.now();
  try {
    const isWindowsCommandShim = process.platform === "win32" && command.endsWith(".cmd");
    const stdout = execFileSync(isWindowsCommandShim ? "cmd.exe" : command, isWindowsCommandShim ? ["/c", command, ...args] : args, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    return {
      command: `${command} ${args.join(" ")}`,
      ok: true,
      output: stdout.trim(),
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      command: `${command} ${args.join(" ")}`,
      ok: false,
      output: `${error.stdout || ""}${error.stderr || ""}`.trim(),
      durationMs: Date.now() - started,
    };
  }
}

function runShell(command, options = {}) {
  const started = Date.now();
  try {
    const stdout = execFileSync(process.platform === "win32" ? "cmd.exe" : "sh", [
      process.platform === "win32" ? "/c" : "-lc",
      command,
    ], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    return {
      command,
      ok: true,
      output: stdout.trim(),
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      command,
      ok: false,
      output: `${error.stdout || ""}${error.stderr || ""}`.trim(),
      durationMs: Date.now() - started,
    };
  }
}

function commandWorks(command, args = ["--version"]) {
  try {
    const isWindowsCommandShim = process.platform === "win32" && command.endsWith(".cmd");
    execFileSync(isWindowsCommandShim ? "cmd.exe" : command, isWindowsCommandShim ? ["/c", command, ...args] : args, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function resetDemoRepo() {
  if (!existsSync(seedRepo)) {
    throw new Error(`Missing demo seed repo: ${seedRepo}`);
  }

  rmSync(repo, { recursive: true, force: true });
  mkdirSync(path.dirname(repo), { recursive: true });
  cpSync(seedRepo, repo, { recursive: true });
}

function ensureGitRepo() {
  run("git", ["init"]);
  run("git", ["config", "user.email", "shadow-cto@example.com"]);
  run("git", ["config", "user.name", "Shadow CTO"]);
  run("git", ["add", "."]);
  run("git", ["commit", "-m", "Initial demo repo"]);
}

function writeAgentTask() {
  const task = `You are implementing a small SaaS backend change.

Business goal:
Add team billing seats so admins can set a seat limit and block invites when the team is over limit.

Repo facts:
- This repo is a tiny Node ESM project.
- src/store.js contains teams, members, pending invites, and a seatLimit field.
- src/invites.js currently creates pending invites without checking seat limits.
- test/invites.test.js has the baseline tests.

Acceptance criteria:
- Add seat-usage accounting for active members plus pending invites.
- Block invite creation when usage is greater than or equal to a team's finite seatLimit.
- Preserve legacy/unlimited teams when seatLimit is null or undefined.
- Throw an actionable typed error when the limit is reached.
- Add tests for under-limit, at-limit, unlimited, and seat-availability behavior.
- Make node --test pass.

Constraints:
- Do not commit changes.
- Keep the implementation small and idiomatic.
- Prefer new helper code only where it makes the behavior easier to test.
`;

  writeFileSync(path.join(repo, "SHADOW_CTO_TASK.md"), task);
}

function scriptedSeatLimitFallback() {
  const seatUsage = `import { findTeam } from "./store.js";

export function countSeatUsage(store, teamId) {
  findTeam(store, teamId);

  const activeMembers = store.members.filter((member) => member.teamId === teamId).length;
  const pendingInvites = store.invites.filter(
    (invite) => invite.teamId === teamId && invite.status === "pending",
  ).length;

  return activeMembers + pendingInvites;
}

export function canInviteMember(store, teamId) {
  const team = findTeam(store, teamId);
  if (team.seatLimit === null || team.seatLimit === undefined) {
    return { allowed: true, usage: countSeatUsage(store, teamId), limit: null };
  }

  const usage = countSeatUsage(store, teamId);
  return {
    allowed: usage < team.seatLimit,
    usage,
    limit: team.seatLimit,
  };
}
`;

  const invites = `import { findTeam } from "./store.js";
import { canInviteMember } from "./seatUsage.js";

export function inviteMember(store, teamId, email) {
  findTeam(store, teamId);

  const seatCheck = canInviteMember(store, teamId);
  if (!seatCheck.allowed) {
    const error = new Error(
      \`Team has reached its seat limit of \${seatCheck.limit}. Remove a member, cancel a pending invite, or increase the limit before inviting more people.\`,
    );
    error.code = "TEAM_SEAT_LIMIT_REACHED";
    error.details = seatCheck;
    throw error;
  }

  const invite = {
    id: \`inv_\${store.invites.length + 1}\`,
    teamId,
    email,
    status: "pending",
  };

  store.invites.push(invite);
  return invite;
}
`;

  const tests = `import assert from "node:assert/strict";
import test from "node:test";
import { inviteMember } from "../src/invites.js";
import { canInviteMember, countSeatUsage } from "../src/seatUsage.js";
import { createDemoStore } from "../src/store.js";

test("creates an invite while the team is under its seat limit", () => {
  const store = createDemoStore();
  store.invites = [];

  const invite = inviteMember(store, "team_starter", "new@example.com");

  assert.equal(invite.email, "new@example.com");
  assert.equal(store.invites.length, 1);
});

test("blocks an invite when active members plus pending invites meet the seat limit", () => {
  const store = createDemoStore();

  assert.equal(countSeatUsage(store, "team_starter"), 3);
  assert.throws(
    () => inviteMember(store, "team_starter", "blocked@example.com"),
    (error) => {
      assert.equal(error.code, "TEAM_SEAT_LIMIT_REACHED");
      assert.equal(error.details.usage, 3);
      assert.equal(error.details.limit, 3);
      return true;
    },
  );
});

test("legacy teams without a seat limit can continue inviting members", () => {
  const store = createDemoStore();

  const invite = inviteMember(store, "team_legacy", "new@example.com");

  assert.equal(invite.teamId, "team_legacy");
});

test("reports seat availability for admin UI copy", () => {
  const store = createDemoStore();
  store.invites = [];

  assert.deepEqual(canInviteMember(store, "team_starter"), {
    allowed: true,
    usage: 2,
    limit: 3,
  });
});
`;

  writeFileSync(path.join(repo, "src", "seatUsage.js"), seatUsage);
  writeFileSync(path.join(repo, "src", "invites.js"), invites);
  writeFileSync(path.join(repo, "test", "invites.test.js"), tests);

  return {
    mode: "scripted-fallback",
    ok: true,
    command: "internal scripted fallback",
    output:
      "No usable Codex/agent command was available, so Shadow CTO used a transparent offline fallback. Set SHADOW_CTO_AGENT_COMMAND or run where Codex CLI is authorized for an agent-authored implementation.",
    durationMs: 0,
  };
}

function applyImplementationWithAgent() {
  writeAgentTask();

  if (process.env.SHADOW_CTO_AGENT_COMMAND) {
    return {
      mode: "custom-agent-command",
      ...runShell(process.env.SHADOW_CTO_AGENT_COMMAND, { timeout: 180000 }),
    };
  }

  const codexCommand = existsSync(localCodex) && commandWorks(localCodex) ? localCodex : "codex";

  if (commandWorks(codexCommand)) {
    const prompt =
      "Implement the task in SHADOW_CTO_TASK.md. Modify the repo files as needed, run node --test, and stop without committing.";
    return {
      mode: "codex-cli",
      ...run(codexCommand, [
        "--ask-for-approval",
        "never",
        "exec",
        "--sandbox",
        "workspace-write",
        "--cd",
        repo,
        "--skip-git-repo-check",
        prompt,
      ], { timeout: 180000 }),
    };
  }

  if (process.env.SHADOW_CTO_REQUIRE_AGENT === "1") {
    return {
      mode: "missing-agent",
      ok: false,
      command: "codex exec or SHADOW_CTO_AGENT_COMMAND",
      output:
        "No accessible Codex/agent command was found. Set SHADOW_CTO_AGENT_COMMAND or install/authorize Codex CLI.",
      durationMs: 0,
    };
  }

  return scriptedSeatLimitFallback();
}

function parseChangedFiles(diffNameOnly) {
  return diffNameOnly
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPrPacket({ diffOutput, implementationOutput, finalTestOutput }) {
  const combined = `${diffOutput}\n${implementationOutput}\n${finalTestOutput}`;
  const checklist = [];

  if (/getSeatUsage|countSeatUsage|seat usage/i.test(combined)) {
    checklist.push("Seat usage counts active members and pending invites.");
  }

  if (/SeatLimitReachedError|SEAT_LIMIT_REACHED|TEAM_SEAT_LIMIT_REACHED|seat-limit error/i.test(combined)) {
    checklist.push("At-limit teams receive a typed, actionable seat-limit error.");
  }

  if (/seatLimit\s*==\s*null|seatLimit === null|undefined seat limit|unlimited/i.test(combined)) {
    checklist.push("Null or undefined seat limits preserve unlimited legacy teams.");
  }

  if (/hasSeatAvailable|availability|admin/i.test(combined)) {
    checklist.push("Seat availability is exposed for admin-facing copy and checks.");
  }

  if (/pass\s+\d+|tests?, \d+ passed|# pass \d+/i.test(combined)) {
    checklist.push("Verification passed with the generated test suite.");
  }

  return {
    title: "Enforce team billing seat limits on member invites",
    summary:
      "Adds seat usage accounting from the actual implementation diff, blocks invite creation at capacity, and preserves unlimited legacy teams.",
    checklist: checklist.length > 0 ? checklist : [
      "Implementation changed invite behavior and tests.",
      "Verification output was captured from the live run.",
    ],
  };
}

function buildEngineeringOs({ evidence, diffOutput, finalTestOutput }) {
  return buildDerivedEngineeringOs({ evidence, diffOutput, finalTestOutput });
}

function writeReports({ evidence, os }) {
  writeDerivedReports({ evidence, os, reportsDir });
}

resetDemoRepo();
ensureGitRepo();

const baselineTests = run(nodeCommand, ["--test"]);
const implementation = applyImplementationWithAgent();
const finalTests = run(nodeCommand, ["--test"]);

run("git", ["add", "-N", "."]);
const diffStat = run("git", ["diff", "--stat"]);
const diffNameOnly = run("git", ["diff", "--name-only"]);
const diff = run("git", ["diff", "--", "src", "test"]);
const prPacket = buildPrPacket({
  diffOutput: diff.output,
  implementationOutput: implementation.output,
  finalTestOutput: finalTests.output,
});

const changedFiles = parseChangedFiles(diffNameOnly.output);

const changedImplementationFiles = changedFiles.filter(
  (file) => file.startsWith("src/") || file.startsWith("test/"),
);

if (process.env.SHADOW_CTO_REQUIRE_AGENT === "1") {
  if (!implementation.ok) {
    console.error(implementation.output || "Implementation agent failed.");
    process.exit(1);
  }

  if (changedImplementationFiles.length === 0) {
    console.error("Implementation agent completed but did not change src/ or test/ files.");
    process.exit(1);
  }

  if (!finalTests.ok) {
    console.error(finalTests.output || "Final tests failed.");
    process.exit(1);
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  repo: "work/shadow-demo-repo",
  goal:
    "Add team billing seats so admins can set a seat limit and block invites when the team is over limit.",
  live: true,
  implementation: {
    mode: implementation.mode,
    command: implementation.command,
    ok: implementation.ok,
    output: implementation.output,
    durationMs: implementation.durationMs,
  },
  summary: {
    filesChanged: changedFiles.length,
    testsPassing: finalTests.ok,
    riskItems: 2,
    baselineTests: baselineTests.ok ? "passing before change" : "failing before change",
  },
  changedFiles,
  checks: [
    {
      command: baselineTests.command,
      ok: baselineTests.ok,
      result: baselineTests.output.split(/\r?\n/).slice(-4).join("\n"),
      durationMs: baselineTests.durationMs,
    },
    {
      command: finalTests.command,
      ok: finalTests.ok,
      result: finalTests.output.split(/\r?\n/).slice(-6).join("\n"),
      durationMs: finalTests.durationMs,
    },
  ],
  diffStat: diffStat.output,
  diff: diff.output,
  prPacket,
  risks: [
    {
      title: "Billing source of truth",
      body: "This demo reads seat limits from the local team record. Production should confirm payment-provider sync timing.",
    },
    {
      title: "Pending invite lifecycle",
      body: "Seat usage includes pending invites. Production should expire stale invites or expose cancellation clearly.",
    },
  ],
};

const osEvidence = buildEngineeringOs({ evidence, diffOutput: diff.output, finalTestOutput: finalTests.output });
writeReports({ evidence, os: osEvidence });

mkdirSync(path.dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(osEvidencePath, `${JSON.stringify(osEvidence, null, 2)}\n`);

console.log(JSON.stringify(evidence, null, 2));
