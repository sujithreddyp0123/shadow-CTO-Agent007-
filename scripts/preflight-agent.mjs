import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const localCodex = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "codex.cmd" : "codex",
);

function canRun(command, args = ["--version"]) {
  try {
    const isWindowsCommandShim = process.platform === "win32" && command.endsWith(".cmd");
    const stdout = execFileSync(isWindowsCommandShim ? "cmd.exe" : command, isWindowsCommandShim ? ["/c", command, ...args] : args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout || ""}${error.stderr || ""}${error.message || ""}`.trim(),
    };
  }
}

const customAgentCommand = process.env.SHADOW_CTO_AGENT_COMMAND;

if (customAgentCommand) {
  console.log(`Custom agent command configured: ${customAgentCommand}`);
  process.exit(0);
}

if (existsSync(localCodex)) {
  const local = canRun(localCodex);
  if (local.ok) {
    console.log("Project-local Codex CLI is available.");
    console.log(localCodex);
    if (local.output) {
      console.log(local.output);
    }
    process.exit(0);
  }
}

const codex = canRun("codex");
if (codex.ok) {
  console.log("Codex CLI is available.");
  if (codex.output) {
    console.log(codex.output);
  }
  process.exit(0);
}

console.error("No usable implementation agent found.");
console.error("");
console.error("Set SHADOW_CTO_AGENT_COMMAND to a command that edits the demo repo in place,");
console.error("or install and authorize Codex CLI before recording the real demo.");
console.error("");
console.error("Codex check output:");
console.error(codex.output || "(no output)");
process.exit(1);
