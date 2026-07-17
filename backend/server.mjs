import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runsRoot = path.join(root, "work", "backend-runs");
const port = Number(process.env.PORT || 8787);
const nodeBin = process.execPath;
const localCodex = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "codex.cmd" : "codex",
);

const runs = new Map();

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function run(command, args, cwd, options = {}) {
  const started = Date.now();
  return new Promise((resolve) => {
    const isWindowsCommandShim = process.platform === "win32" && command.endsWith(".cmd");
    const child = execFile(
      isWindowsCommandShim ? "cmd.exe" : command,
      isWindowsCommandShim ? ["/c", command, ...args] : args,
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: options.timeout ?? 180000,
        env: { ...process.env, ...(options.env || {}) },
      },
      (error, stdout = "", stderr = "") => {
        resolve({
          command: `${command} ${args.join(" ")}`,
          ok: !error,
          output: `${stdout}${stderr}`.trim(),
          durationMs: Date.now() - started,
        });
      },
    );

    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

async function commandWorks(command, cwd) {
  const result = await run(command, ["--version"], cwd, { timeout: 15000 });
  return result.ok;
}

function assertSafeLocalRepo(repoPath) {
  const resolved = path.resolve(repoPath);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`Repo path does not exist or is not a directory: ${repoPath}`);
  }
  return resolved;
}

async function prepareRepo({ runDir, repoPath, repoUrl }) {
  const repoDir = path.join(runDir, "repo");

  if (repoUrl) {
    const clone = await run("git", ["clone", "--depth", "1", repoUrl, repoDir], runDir, {
      timeout: 180000,
    });
    if (!clone.ok) {
      throw new Error(`Git clone failed: ${clone.output}`);
    }
    return repoDir;
  }

  const source = assertSafeLocalRepo(repoPath);
  cpSync(source, repoDir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`),
  });
  return repoDir;
}

async function ensureGit(repoDir) {
  const gitDir = path.join(repoDir, ".git");
  if (!existsSync(gitDir)) {
    await run("git", ["init"], repoDir);
    await run("git", ["config", "user.email", "shadow-cto@example.com"], repoDir);
    await run("git", ["config", "user.name", "Shadow CTO"], repoDir);
    await run("git", ["add", "."], repoDir);
    await run("git", ["commit", "-m", "Initial imported repo"], repoDir);
  }
}

function detectTestCommand(repoDir, requested) {
  if (requested) {
    return requested;
  }

  const packagePath = path.join(repoDir, "package.json");
  if (existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.test) {
      return "npm test";
    }
  }

  if (existsSync(path.join(repoDir, "pytest.ini")) || existsSync(path.join(repoDir, "pyproject.toml"))) {
    return "python -m pytest";
  }

  return "";
}

async function runShell(command, repoDir, timeout = 180000) {
  if (!command) {
    return {
      command: "no test command detected",
      ok: true,
      output: "No test command was provided or detected.",
      durationMs: 0,
    };
  }

  return run(process.platform === "win32" ? "cmd.exe" : "sh", [
    process.platform === "win32" ? "/c" : "-lc",
    command,
  ], repoDir, { timeout });
}

async function runImplementationAgent({ repoDir, task, requireAgent }) {
  const taskPath = path.join(repoDir, "SHADOW_CTO_TASK.md");
  writeFileSync(taskPath, `${task.trim()}\n`);

  if (requireAgent === false) {
    return {
      mode: "verify-only",
      ok: true,
      command: "agent skipped by request",
      output: "Implementation agent was skipped; backend captured baseline/final tests and repo evidence.",
      durationMs: 0,
    };
  }

  if (process.env.SHADOW_CTO_AGENT_COMMAND) {
    return {
      mode: "custom-agent-command",
      ...(await runShell(process.env.SHADOW_CTO_AGENT_COMMAND, repoDir, 240000)),
    };
  }

  const codexCommand = existsSync(localCodex) && await commandWorks(localCodex, repoDir) ? localCodex : "codex";
  if (await commandWorks(codexCommand, repoDir)) {
    const prompt = [
      "You are Shadow CTO's implementation agent.",
      "Read SHADOW_CTO_TASK.md.",
      "Modify the repo files as needed.",
      "Run the available tests if practical.",
      "Stop without committing.",
    ].join(" ");

    return {
      mode: "codex-cli",
      ...(await run(codexCommand, [
        "--ask-for-approval",
        "never",
        "exec",
        "--sandbox",
        "workspace-write",
        "--cd",
        repoDir,
        "--skip-git-repo-check",
        prompt,
      ], repoDir, { timeout: 240000 })),
    };
  }

  return {
    mode: "missing-agent",
    ok: !requireAgent,
    command: "codex exec or SHADOW_CTO_AGENT_COMMAND",
    output: requireAgent
      ? "No usable implementation agent found."
      : "No usable implementation agent found. Evidence captured without implementation.",
    durationMs: 0,
  };
}

function parseChangedFiles(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function executeRun(runRecord) {
  runRecord.status = "running";
  runRecord.updatedAt = new Date().toISOString();

  try {
    const { input, runDir } = runRecord;
    rmSync(runDir, { recursive: true, force: true });
    mkdirSync(runDir, { recursive: true });

    const repoDir = await prepareRepo({ runDir, ...input });
    await ensureGit(repoDir);

    const testCommand = detectTestCommand(repoDir, input.testCommand);
    const baseline = await runShell(testCommand, repoDir);
    const implementation = await runImplementationAgent({
      repoDir,
      task: input.task,
      requireAgent: input.requireAgent !== false,
    });
    const finalTests = await runShell(testCommand, repoDir);

    await run("git", ["add", "-N", "."], repoDir);
    const diffStat = await run("git", ["diff", "--stat"], repoDir);
    const diffNameOnly = await run("git", ["diff", "--name-only"], repoDir);
    const diff = await run("git", ["diff"], repoDir);
    const changedFiles = parseChangedFiles(diffNameOnly.output);

    const evidence = {
      id: runRecord.id,
      generatedAt: new Date().toISOString(),
      repo: input.repoUrl || input.repoPath,
      goal: input.task,
      live: true,
      backend: true,
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
        riskItems: finalTests.ok ? 1 : 2,
        baselineTests: baseline.ok ? "passing before change" : "failing before change",
      },
      changedFiles,
      checks: [
        {
          command: baseline.command,
          ok: baseline.ok,
          result: baseline.output.split(/\r?\n/).slice(-8).join("\n"),
          durationMs: baseline.durationMs,
        },
        {
          command: finalTests.command,
          ok: finalTests.ok,
          result: finalTests.output.split(/\r?\n/).slice(-8).join("\n"),
          durationMs: finalTests.durationMs,
        },
      ],
      diffStat: diffStat.output,
      diff: diff.output,
      prPacket: {
        title: input.title || "Shadow CTO verified repo change",
        summary: "Backend run captured implementation output, git diff, test results, and review evidence from the target repo.",
        checklist: [
          "Baseline state was captured before implementation.",
          "Implementation agent status was recorded.",
          "Final verification was executed.",
          "Changed files and diff were captured for human review.",
        ],
      },
      risks: [
        {
          title: finalTests.ok ? "Production review required" : "Verification failed",
          body: finalTests.ok
            ? "Tests passed, but a human should still review the diff before merging."
            : "Final tests did not pass. The run should be treated as blocked until failures are reviewed.",
        },
      ],
    };

    writeFileSync(path.join(runDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    runRecord.status = finalTests.ok && implementation.ok ? "completed" : "needs-review";
    runRecord.evidence = evidence;
    runRecord.updatedAt = new Date().toISOString();
  } catch (error) {
    runRecord.status = "failed";
    runRecord.error = error.message;
    runRecord.updatedAt = new Date().toISOString();
  }
}

function publicRun(runRecord) {
  return {
    id: runRecord.id,
    status: runRecord.status,
    createdAt: runRecord.createdAt,
    updatedAt: runRecord.updatedAt,
    input: runRecord.input,
    error: runRecord.error,
    evidence: runRecord.evidence,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, service: "shadow-cto-backend" });
  }

  if (req.method === "GET" && url.pathname === "/") {
    return json(res, 200, {
      ok: true,
      service: "shadow-cto-backend",
      message: "Shadow CTO backend is running. Use POST /api/runs to start a repo run.",
      endpoints: {
        health: "GET /health",
        startRun: "POST /api/runs",
        getRun: "GET /api/runs/:id",
      },
      example: {
        repoPath: "C:\\path\\to\\your\\repo",
        task: "Add the requested feature and verify it with tests.",
        testCommand: "npm test",
        requireAgent: true,
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/runs") {
    try {
      const body = await readBody(req);
      if (!body.repoPath && !body.repoUrl) {
        return json(res, 400, { error: "repoPath or repoUrl is required" });
      }
      if (!body.task || typeof body.task !== "string") {
        return json(res, 400, { error: "task is required" });
      }

      const id = randomUUID();
      const runRecord = {
        id,
        status: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        runDir: path.join(runsRoot, id),
        input: {
          repoPath: body.repoPath,
          repoUrl: body.repoUrl,
          task: body.task,
          title: body.title,
          testCommand: body.testCommand,
          requireAgent: body.requireAgent,
        },
      };

      runs.set(id, runRecord);
      executeRun(runRecord);
      return json(res, 202, publicRun(runRecord));
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (req.method === "GET" && runMatch) {
    const runRecord = runs.get(runMatch[1]);
    if (!runRecord) {
      return json(res, 404, { error: "Run not found" });
    }
    return json(res, 200, publicRun(runRecord));
  }

  return json(res, 404, { error: "Not found" });
});

mkdirSync(runsRoot, { recursive: true });
server.listen(port, () => {
  console.log(`Shadow CTO backend listening on http://127.0.0.1:${port}`);
});
