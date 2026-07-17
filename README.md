# Shadow CTO

Shadow CTO is a Codex Build Week vertical slice: turn one business request into a verified PR-ready change.

The demo focuses on a single realistic SaaS request:

> Add team billing seats so admins can set a seat limit and block invites when the team is over limit.

Instead of showing code generation alone, Shadow CTO shows the accountable engineering trail around the change:

- repo brief
- approved implementation plan
- execution timeline
- changed files
- verification commands and outcomes
- risk report
- reviewer-ready PR packet

## Why it matters

Small teams rarely need an AI that only writes code. They need a system that can connect product intent to a trustworthy engineering outcome. Shadow CTO is designed around that trust gap: what changed, why it changed, how it was verified, and what risk remains.

## Current vertical slice

This first version includes both the dashboard and a live local runner for a controlled demo repo.

The runner:

- copies the committed seed repo from `demo-repos/acme-saas-demo` into `work/shadow-demo-repo`
- initializes a fresh git repo
- runs the baseline test suite
- asks an implementation agent to make the seat-limit change
- runs the final test suite
- captures changed files, `git diff --stat`, and test output
- writes `public/live-run.json` for the dashboard

## Implementation modes

Shadow CTO records the implementation source in `public/live-run.json`.

Before recording the actual Build Week demo, run:

```bash
npm run preflight:agent
npm run run:demo
```

`npm run run:demo` requires a real agent path. It fails rather than using `scripted-fallback`, so the demo video cannot accidentally show fallback output as Codex-authored work.

Preferred mode: Codex CLI. If `codex` is installed and authorized, the runner calls:

```bash
codex exec --ask-for-approval never --sandbox workspace-write --skip-git-repo-check "Implement the task in SHADOW_CTO_TASK.md..."
```

Custom mode: provide any agent command that edits the repo in place:

```bash
SHADOW_CTO_AGENT_COMMAND="your-agent-command" node scripts/run-shadow-cto.mjs
```

Strict mode: fail instead of using the offline fallback when no agent is available:

```bash
SHADOW_CTO_REQUIRE_AGENT=1 node scripts/run-shadow-cto.mjs
```

Offline mode: if no agent is available and strict mode is not enabled, the runner uses a transparent scripted fallback so the evidence pipeline remains reproducible. The dashboard labels this as `scripted-fallback`; it should not be represented as Codex-authored work.

## Local development

```bash
npm install
npm run run:evidence
npm run dev -- --port 5173
```

## Production build

```bash
npm run run:evidence
npm run build
```
