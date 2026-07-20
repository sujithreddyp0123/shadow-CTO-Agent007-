# Shadow CTO

Shadow CTO is the undercover engineering agent for startups.

Think of it like a James Bond for your codebase: it stays in the background, watches the repo, understands the mission, sends in Codex to make the change, checks the evidence, and comes back with a PR-ready report.

AI can write code fast. Shadow CTO helps startups know whether that code is actually safe to ship.

It turns one business request into a verified engineering change with the proof a human reviewer needs: plan, diff, tests, risk report, confidence score, and PR packet.

The current MVP focuses on a single realistic SaaS request:

> Add team billing seats so admins can set a seat limit and block invites when the team is over limit.

Instead of showing code generation alone, Shadow CTO shows the full engineering trail around the change:

- repo brief
- approved implementation plan
- execution timeline
- changed files
- verification commands and outcomes
- risk report
- reviewer-ready PR packet
- confidence score

## Why it matters

Startups do not just need more code. They need someone watching the operation.

Small teams are already using AI coding tools, but they still need the missing CTO layer: did the agent understand the request, touch the right files, pass the tests, introduce risk, and produce something a human can review?

Shadow CTO is built around that trust gap. It connects product intent to a trustworthy engineering outcome: what changed, why it changed, how it was verified, and what risk remains.

## How Codex and GPT-5.6 were used

Shadow CTO uses Codex as the implementation agent and GPT-5.6 as the reasoning and product layer around the engineering workflow.

Codex CLI is used to make the actual repo change. The runner writes a task file, invokes Codex against the copied demo repo, lets Codex edit the code in place, then captures the resulting git diff, changed files, and test output. The strict demo path requires Codex to be available, so the recorded run cannot silently fall back to a scripted implementation.

GPT-5.6 was used to design and refine the orchestration around Codex: the product framing, the multi-stage engineering workflow, the evidence model, the README, the demo narrative, the risk-reporting language, and the reviewer-ready PR packet structure. In the product vision, GPT-5.6 acts as the planning/review intelligence layer while Codex acts as the implementation worker.

Together, the flow is:

1. A founder gives a plain-English business request.
2. GPT-5.6-style reasoning turns that request into an engineering plan, evidence requirements, and review expectations.
3. Codex CLI edits the repo.
4. Shadow CTO runs verification, captures the diff and tests, identifies risks, and returns a PR-ready packet.

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

Before recording or sharing the demo, run:

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

## Backend MVP

The hosted site is a static demo, but the repo now includes a local backend runner for real MVP testing.

Start the API:

```bash
npm run backend
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

Run Shadow CTO against a repo:

```bash
curl -X POST http://127.0.0.1:8787/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "repoPath": "C:/path/to/agri-ai",
    "task": "Review this repo, run tests, and make the requested change.",
    "testCommand": "npm test",
    "requireAgent": true
  }'
```

The backend copies or clones the target repo into `work/backend-runs/`, writes `SHADOW_CTO_TASK.md`, runs baseline tests, calls Codex CLI when available, runs final tests, captures `git diff`, and returns an evidence packet from `GET /api/runs/:id`.

## Production build

```bash
npm run run:evidence
npm run build
```
