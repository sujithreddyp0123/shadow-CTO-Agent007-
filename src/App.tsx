import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Clock3,
  Cpu,
  FileText,
  GitBranch,
  GitPullRequest,
  Layers3,
  LockKeyhole,
  MessageSquareMore,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  changedFiles,
  checks as staticChecks,
  evidence,
  implementationPlan,
  prPacket,
  repoBrief,
  request,
  risks,
  timeline,
} from "./data/run";

type LiveRun = {
  generatedAt: string;
  repo: string;
  goal: string;
  live: boolean;
  summary: {
    filesChanged: number;
    testsPassing: boolean;
    riskItems: number;
    baselineTests: string;
  };
  implementation?: {
    mode: string;
    command: string;
    ok: boolean;
    output: string;
    durationMs: number;
  };
  changedFiles: string[];
  checks: Array<{
    command: string;
    ok: boolean;
    result: string;
    durationMs: number;
  }>;
  diffStat: string;
  prPacket: {
    title: string;
    summary: string;
    checklist: string[];
  };
  risks: Array<{
    title: string;
    body: string;
  }>;
};

type EngineeringOs = {
  repositoryIntelligence: {
    architecture: string;
    entryPoints: string[];
    impactedModules: string[];
    dependencyGraph: string[];
    apiRelationships: string[];
    dataRelationships: string[];
    callGraph: string[];
    riskHotspots: string[];
  };
  impactAnalysis: Array<{
    file: string;
    reason: string;
    dependencies: string[];
    breakingChangeRisk: string;
    complexity: string;
    publicApiAffected: string;
    regressionProbability: string;
  }>;
  autonomousPlan: {
    epic: string;
    stories: string[];
    tasks: string[];
    executionOrder: string[];
    validationPlan: string[];
    rollbackPlan: string[];
  };
  decisionLog: Array<{
    decision: string;
    why: string;
    evidence: string;
  }>;
  selfReview: Array<{
    severity: string;
    comment: string;
    recommendation: string;
  }>;
  failureRecovery: string[];
  confidenceEngine: {
    architecture: number;
    implementation: number;
    testing: number;
    security: number;
    deployment: number;
    overall: number;
  };
  repositoryMemory: Array<{
    run: string;
    changedFiles: string[];
    knownRisks: string[];
  }>;
  engineeringMetrics: Record<string, string | number>;
  whatIf: Array<{
    option: string;
    tradeoff: string;
  }>;
  trustLinks: Array<{
    claim: string;
    evidence: string;
  }>;
};

const statusLabel = {
  done: "Done",
  active: "Running",
  queued: "Queued",
};

const agents = [
  {
    name: "Planner",
    role: "Translated the business goal into acceptance criteria.",
    state: "handoff complete",
    output: "Seat limit must count active members and pending invites.",
  },
  {
    name: "Architect",
    role: "Chose the smallest durable design surface.",
    state: "approved",
    output: "Keep enforcement inside invite domain helpers.",
  },
  {
    name: "Backend",
    role: "Implemented invite enforcement through Codex CLI.",
    state: "executed",
    output: "SeatLimitReachedError, getSeatUsage, hasSeatAvailable.",
  },
  {
    name: "QA",
    role: "Validated behavior and regression coverage.",
    state: "passed",
    output: "5 tests passed; null and undefined limits covered.",
  },
  {
    name: "Security",
    role: "Checked rollout risks and abuse paths.",
    state: "reviewed",
    output: "No auth expansion; stale pending invites remain a risk.",
  },
  {
    name: "Reviewer",
    role: "Generated PR packet from the live diff.",
    state: "ready",
    output: "Reviewer summary derives from implementation evidence.",
  },
];

const sdlcStages = [
  ["Requirements", "Business goal clarified", "done"],
  ["Design", "Domain helper strategy selected", "done"],
  ["Development", "Codex CLI changed invite logic", "done"],
  ["Testing", "Generated suite passed", "done"],
  ["Security", "Risk notes captured", "done"],
  ["Review", "PR packet derived from diff", "done"],
  ["Release", "Ready with checklist", "active"],
];

const handoffs = [
  {
    from: "Planner",
    to: "Architect",
    message: "Seat limit must protect revenue launch without breaking legacy teams.",
  },
  {
    from: "Architect",
    to: "Backend",
    message: "Implement in invite flow; expose helpers so QA can assert exact behavior.",
  },
  {
    from: "Backend",
    to: "QA",
    message: "Validate active + pending usage, null and undefined limits, and blocking errors.",
  },
  {
    from: "QA",
    to: "Reviewer",
    message: "5/5 tests passed; summarize diff and rollout risks for reviewers.",
  },
];

const executiveMetrics = [
  ["Release status", "PR-ready", "success"],
  ["Confidence", "91%", "success"],
  ["Manual effort saved", "4.5 hrs", "neutral"],
  ["Deployment readiness", "82%", "warning"],
];

const readiness = [
  ["Tests", 100, "5/5 passed"],
  ["Security", 78, "2 rollout risks"],
  ["Documentation", 72, "PR packet ready"],
  ["Review", 88, "Diff-derived checklist"],
  ["Release", 82, "Ready with monitoring"],
];

const codeImpact = [
  {
    file: "src/invites.js",
    agent: "Backend",
    why: "Centralized seat usage and invite blocking where the business invariant belongs.",
    impact: "Changes invite creation behavior and exports helpers for review and QA.",
  },
  {
    file: "test/invites.test.js",
    agent: "QA",
    why: "Codifies at-limit, under-limit, null-limit, undefined-limit, and availability behavior.",
    impact: "Raises regression confidence for billing-sensitive invite flows.",
  },
  {
    file: "SHADOW_CTO_TASK.md",
    agent: "Planner",
    why: "Captures the handoff contract Codex implemented against.",
    impact: "Makes the agent instruction auditable after the run.",
  },
];

const reports = [
  "CTO Summary",
  "Architecture Review",
  "Security Review",
  "Release Notes",
  "Deployment Checklist",
  "Reviewer Packet",
];

function App() {
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [engineeringOs, setEngineeringOs] = useState<EngineeringOs | null>(null);

  useEffect(() => {
    fetch("/live-run.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LiveRun | null) => setLiveRun(data))
      .catch(() => setLiveRun(null));

    fetch("/engineering-os.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: EngineeringOs | null) => setEngineeringOs(data))
      .catch(() => setEngineeringOs(null));
  }, []);

  const liveEvidence = useMemo(() => {
    if (!liveRun) {
      return evidence;
    }

    const lastCheck = liveRun.checks[liveRun.checks.length - 1];
    const testCount = lastCheck?.result.match(/# pass (\d+)/)?.[1] ?? "5";

    return [
      { label: "Files changed", value: String(liveRun.summary.filesChanged), tone: "neutral" as const },
      {
        label: "Tests passing",
        value: liveRun.summary.testsPassing ? `${testCount} / ${testCount}` : "Needs review",
        tone: liveRun.summary.testsPassing ? ("success" as const) : ("warning" as const),
      },
      { label: "Risk items", value: String(liveRun.summary.riskItems), tone: "warning" as const },
      {
        label: "Implementation",
        value: liveRun.implementation?.ok === false
          ? `${liveRun.implementation.mode} failed`
          : liveRun.implementation?.mode ?? "Live run",
        tone: liveRun.implementation?.ok === false || liveRun.implementation?.mode === "scripted-fallback"
          ? ("warning" as const)
          : ("success" as const),
      },
    ];
  }, [liveRun]);

  const displayFiles = liveRun?.changedFiles ?? changedFiles;
  const displayChecks = liveRun?.checks ?? staticChecks;
  const displayPacket = liveRun?.prPacket ?? prPacket;
  const displayRisks = liveRun?.risks ?? risks;
  const confidence = engineeringOs?.confidenceEngine;

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Codex Build Week vertical slice
          </div>
          <h1>Shadow CTO runs an autonomous engineering org for one business request.</h1>
          <p>
            Watch specialized agents plan, design, implement, test, review, and package a
            production-ready change with traceable decisions, live evidence, and executive reporting.
          </p>
        </div>
        <div className="request-panel" aria-label="Current business request">
          <div className="panel-header">
            <span>{liveRun ? "Live runner evidence" : request.owner}</span>
            <strong>{liveRun ? "Actual git diff + tests" : request.risk}</strong>
          </div>
          <h2>{liveRun?.repo ?? request.repo}</h2>
          <p>{liveRun?.goal ?? request.goal}</p>
          {liveRun ? (
            <div className="live-stamp">
              {liveRun.implementation?.mode ?? "live-run"} evidence generated{" "}
              {new Date(liveRun.generatedAt).toLocaleString()}
            </div>
          ) : null}
          <button type="button" className="primary-action">
            <Play size={18} aria-hidden="true" />
            Run autonomous workflow
          </button>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Evidence summary">
        {liveEvidence.map((item) => (
          <article className={`metric metric-${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="executive-grid" aria-label="Executive dashboard">
        <article className="module executive-summary">
          <div className="module-title">
            <TrendingUp size={18} aria-hidden="true" />
            <h2>CTO Dashboard</h2>
          </div>
          <div className="executive-metrics">
            {executiveMetrics.map(([label, value, tone]) => (
              <div className={`exec-metric exec-${tone}`} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="module observability">
          <div className="module-title">
            <Radio size={18} aria-hidden="true" />
            <h2>Live Observability</h2>
          </div>
          <div className="signal-row">
            <span>Agent health</span>
            <strong>6/6 nominal</strong>
          </div>
          <div className="signal-row">
            <span>Codex latency</span>
            <strong>{liveRun?.implementation ? `${Math.round(liveRun.implementation.durationMs / 1000)}s` : "76s"}</strong>
          </div>
          <div className="signal-row">
            <span>Execution mode</span>
            <strong>{liveRun?.implementation?.mode ?? "codex-cli"}</strong>
          </div>
          <div className="progress-track" aria-label="Workflow progress">
            <span style={{ width: "92%" }} />
          </div>
        </article>
      </section>

      {engineeringOs ? (
        <section className="os-grid">
          <article className="module repo-intel">
            <div className="module-title">
              <BrainCircuit size={18} aria-hidden="true" />
              <h2>Repository Intelligence</h2>
            </div>
            <p>{engineeringOs.repositoryIntelligence.architecture}</p>
            <div className="intel-columns">
              <div>
                <span>Entry points</span>
                {engineeringOs.repositoryIntelligence.entryPoints.map((item) => <code key={item}>{item}</code>)}
              </div>
              <div>
                <span>Dependency graph</span>
                {engineeringOs.repositoryIntelligence.dependencyGraph.map((item) => <code key={item}>{item}</code>)}
              </div>
              <div>
                <span>Risk hotspots</span>
                {engineeringOs.repositoryIntelligence.riskHotspots.map((item) => <code key={item}>{item}</code>)}
              </div>
            </div>
          </article>

          <article className="module confidence-module">
            <div className="module-title">
              <ShieldCheck size={18} aria-hidden="true" />
              <h2>Confidence Engine</h2>
            </div>
            {confidence ? (
              <>
                <div className="confidence-score">{confidence.overall}%</div>
                {Object.entries(confidence)
                  .filter(([key]) => key !== "overall")
                  .map(([key, value]) => (
                    <div className="readiness-item compact" key={key}>
                      <div>
                        <span>{key}</span>
                        <strong>{value}%</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
              </>
            ) : null}
          </article>
        </section>
      ) : null}

      {engineeringOs ? (
        <section className="planning-grid">
          <article className="module">
            <div className="module-title">
              <Layers3 size={18} aria-hidden="true" />
              <h2>Autonomous Planning</h2>
            </div>
            <p>{engineeringOs.autonomousPlan.epic}</p>
            <div className="plan-columns">
              <div>
                <span>Stories</span>
                <ul>{engineeringOs.autonomousPlan.stories.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span>Execution order</span>
                <ul>{engineeringOs.autonomousPlan.executionOrder.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span>Rollback plan</span>
                <ul>{engineeringOs.autonomousPlan.rollbackPlan.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </article>

          <article className="module">
            <div className="module-title">
              <MessageSquareMore size={18} aria-hidden="true" />
              <h2>Decision Log</h2>
            </div>
            <div className="decision-list">
              {engineeringOs.decisionLog.map((item) => (
                <div className="decision-item" key={item.decision}>
                  <strong>{item.decision}</strong>
                  <p>{item.why}</p>
                  <small>Evidence: {item.evidence}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="agent-grid" aria-label="Agent collaboration">
        <article className="module agent-org">
          <div className="module-title">
            <UsersRound size={18} aria-hidden="true" />
            <h2>Multi-Agent Engineering Org</h2>
          </div>
          <div className="agent-list">
            {agents.map((agent) => (
              <div className="agent-card" key={agent.name}>
                <div>
                  <strong>{agent.name}</strong>
                  <span>{agent.state}</span>
                </div>
                <p>{agent.role}</p>
                <small>{agent.output}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="module handoff-module">
          <div className="module-title">
            <MessageSquareMore size={18} aria-hidden="true" />
            <h2>Agent Handoffs</h2>
          </div>
          <div className="handoff-list">
            {handoffs.map((handoff) => (
              <div className="handoff-item" key={`${handoff.from}-${handoff.to}`}>
                <span>{handoff.from} → {handoff.to}</span>
                <p>{handoff.message}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {engineeringOs ? (
        <section className="review-grid">
          <article className="module">
            <div className="module-title">
              <GitPullRequest size={18} aria-hidden="true" />
              <h2>Code Review Simulation</h2>
            </div>
            <div className="decision-list">
              {engineeringOs.selfReview.map((item) => (
                <div className="decision-item" key={item.comment}>
                  <span>{item.severity}</span>
                  <p>{item.comment}</p>
                  <small>{item.recommendation}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="module">
            <div className="module-title">
              <Radio size={18} aria-hidden="true" />
              <h2>Failure Recovery</h2>
            </div>
            <ol className="plan-list">
              {engineeringOs.failureRecovery.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </article>

          <article className="module">
            <div className="module-title">
              <Sparkles size={18} aria-hidden="true" />
              <h2>What-If Mode</h2>
            </div>
            <div className="decision-list">
              {engineeringOs.whatIf.map((item) => (
                <div className="decision-item" key={item.option}>
                  <strong>{item.option}</strong>
                  <p>{item.tradeoff}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="sdlc module" aria-label="Interactive SDLC timeline">
        <div className="module-title">
          <Layers3 size={18} aria-hidden="true" />
          <h2>Autonomous SDLC Timeline</h2>
        </div>
        <div className="sdlc-track">
          {sdlcStages.map(([stage, detail, state]) => (
            <div className={`sdlc-stage stage-${state}`} key={stage}>
              <strong>{stage}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="workbench">
        <div className="left-rail">
          <article className="module">
            <div className="module-title">
              <BrainCircuit size={18} aria-hidden="true" />
              <h2>Repo Brief</h2>
            </div>
            <div className="brief-list">
              {repoBrief.map((item) => (
                <div className="brief-item" key={item.label}>
                  <span>{item.label}</span>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="module">
            <div className="module-title">
              <BadgeCheck size={18} aria-hidden="true" />
              <h2>Approved Plan</h2>
            </div>
            <ol className="plan-list">
              {implementationPlan.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </div>

        <article className="timeline module" aria-label="Execution timeline">
          <div className="module-title">
            <Clock3 size={18} aria-hidden="true" />
            <h2>Execution Timeline</h2>
          </div>
          <div className="timeline-list">
            {timeline.map((event) => {
              const Icon = event.icon;
              const isDone = event.status === "done";
              return (
                <div className={`timeline-event event-${event.status}`} key={event.title}>
                  <div className="event-icon">
                    {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </div>
                  <div>
                    <div className="event-topline">
                      <h3>{event.title}</h3>
                      <span>{event.time}</span>
                    </div>
                    <p>{event.detail}</p>
                    <small>{statusLabel[event.status]}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <div className="right-rail">
          <article className="module">
            <div className="module-title">
              <GitBranch size={18} aria-hidden="true" />
              <h2>Changed Files</h2>
            </div>
            <ul className="file-list">
              {displayFiles.map((file) => (
                <li key={file}>
                  <Circle size={8} aria-hidden="true" />
                  {file}
                </li>
              ))}
            </ul>
          </article>

          <article className="module">
            <div className="module-title">
              <ShieldCheck size={18} aria-hidden="true" />
              <h2>Verification</h2>
            </div>
            <div className="check-list">
              {displayChecks.map((check) => {
                const Icon = "icon" in check ? check.icon : CheckCircle2;
                return (
                  <div className="check-item" key={check.command}>
                    <Icon size={17} aria-hidden="true" />
                    <div>
                      <code>{check.command}</code>
                      <span>
                        {"ok" in check ? (check.ok ? "Passed" : "Failed") : check.result}
                        {"durationMs" in check ? ` in ${check.durationMs}ms` : ""}
                      </span>
                      {"ok" in check ? <pre>{check.result}</pre> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </section>

      <section className="intelligence-grid">
        <article className="module readiness-module">
          <div className="module-title">
            <LockKeyhole size={18} aria-hidden="true" />
            <h2>Deployment Readiness</h2>
          </div>
          <div className="readiness-list">
            {readiness.map(([label, score, detail]) => (
              <div className="readiness-item" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{score}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${score}%` }} />
                </div>
                <small>{detail}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="module impact-module">
          <div className="module-title">
            <Cpu size={18} aria-hidden="true" />
            <h2>Code Impact Analysis</h2>
          </div>
          <div className="impact-list">
            {(engineeringOs?.impactAnalysis ?? codeImpact).map((item) => (
              <div className="impact-item" key={item.file}>
                <div>
                  <code>{item.file}</code>
                  <span>{"agent" in item ? item.agent : item.breakingChangeRisk}</span>
                </div>
                <p>{"why" in item ? item.why : item.reason}</p>
                <small>
                  {"impact" in item
                    ? item.impact
                    : `Dependencies: ${item.dependencies.join(", ")}. API affected: ${item.publicApiAffected}. Regression: ${item.regressionProbability}.`}
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {engineeringOs ? (
        <section className="memory-trust-grid">
          <article className="module">
            <div className="module-title">
              <Clock3 size={18} aria-hidden="true" />
              <h2>Repository Memory</h2>
            </div>
            <div className="decision-list">
              {engineeringOs.repositoryMemory.map((item) => (
                <div className="decision-item" key={item.run}>
                  <strong>{item.run}</strong>
                  <p>{item.changedFiles.join(", ")}</p>
                  <small>Known risks: {item.knownRisks.join(", ")}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="module">
            <div className="module-title">
              <Cpu size={18} aria-hidden="true" />
              <h2>Engineering Metrics</h2>
            </div>
            <div className="metric-table">
              {Object.entries(engineeringOs.engineeringMetrics).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="module">
            <div className="module-title">
              <LockKeyhole size={18} aria-hidden="true" />
              <h2>Trust Layer</h2>
            </div>
            <div className="decision-list">
              {engineeringOs.trustLinks.map((item) => (
                <div className="decision-item" key={item.claim}>
                  <strong>{item.claim}</strong>
                  <p>{item.evidence}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="packet-grid">
        <article className="module pr-module">
          <div className="module-title">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2>PR Packet</h2>
          </div>
          <h3>{displayPacket.title}</h3>
          <p>{displayPacket.summary}</p>
          <ul className="checklist">
            {displayPacket.checklist.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <button type="button" className="secondary-action">
            <FileText size={17} aria-hidden="true" />
            Copy reviewer summary
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>

        <article className="module risk-module">
          <div className="module-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2>Risk Report</h2>
          </div>
          {displayRisks.map((risk) => {
            const Icon = (risk as { icon?: typeof ShieldCheck }).icon ?? ShieldCheck;
            return (
              <div className="risk-item" key={risk.title}>
                <Icon size={18} aria-hidden="true" />
                <div>
                  <h3>{risk.title}</h3>
                  <p>{risk.body}</p>
                </div>
              </div>
            );
          })}
        </article>
      </section>

      <section className="module reports-module">
        <div className="module-title">
          <FileText size={18} aria-hidden="true" />
          <h2>Enterprise Reports</h2>
        </div>
        <div className="report-list">
          {reports.map((report) => (
            <div className="report-chip" key={report}>
              <CheckCircle2 size={15} aria-hidden="true" />
              {report}
            </div>
          ))}
        </div>
      </section>

      {liveRun ? (
        <section className="module diff-module">
          <div className="module-title">
            <GitBranch size={18} aria-hidden="true" />
            <h2>Implementation Evidence</h2>
          </div>
          {liveRun.implementation ? (
            <>
              <p className="implementation-copy">
                Mode: <strong>{liveRun.implementation.mode}</strong>
              </p>
              <pre>{liveRun.implementation.command}</pre>
            </>
          ) : null}
          <p className="implementation-copy">Diff stat</p>
          <pre>{liveRun.diffStat}</pre>
        </section>
      ) : null}
    </main>
  );
}

export default App;
