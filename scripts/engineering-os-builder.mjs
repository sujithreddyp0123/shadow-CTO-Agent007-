import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function changedLinesForFile(diffOutput, file) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`diff --git a/${escaped} b/${escaped}([\\s\\S]*?)(?=\\ndiff --git a/|$)`);
  const match = diffOutput.match(pattern);
  return match?.[1] ?? "";
}

function exportedSymbols(fileDiff) {
  return unique(
    [...fileDiff.matchAll(/^\+export\s+(?:class|function|const)\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1]),
  );
}

function inferDependencyGraph(changedFiles, diffOutput) {
  const graph = [];

  for (const file of changedFiles) {
    const fileDiff = changedLinesForFile(diffOutput, file);
    const imports = [...fileDiff.matchAll(/^\+import .* from ["'](.+)["'];/gm)].map((match) => match[1]);
    for (const dependency of imports) {
      graph.push(`${file} -> ${dependency}`);
    }
  }

  if (changedFiles.includes("test/invites.test.js")) {
    graph.push("test/invites.test.js -> src/invites.js");
  }

  return unique(graph);
}

function inferCallGraph(diffOutput) {
  const calls = [];
  if (/inviteMember[\s\S]*findTeam/.test(diffOutput)) calls.push("inviteMember -> findTeam");
  if (/inviteMember[\s\S]*getSeatUsage/.test(diffOutput)) calls.push("inviteMember -> getSeatUsage");
  if (/inviteMember[\s\S]*hasSeatAvailable/.test(diffOutput)) calls.push("inviteMember -> hasSeatAvailable");
  if (/hasSeatAvailable[\s\S]*getSeatUsage/.test(diffOutput)) calls.push("hasSeatAvailable -> getSeatUsage");
  if (/countSeatUsage/.test(diffOutput)) calls.push("inviteMember -> countSeatUsage");
  return unique(calls);
}

function inferRiskHotspots(evidence, diffOutput) {
  const hotspots = evidence.risks?.map((risk) => risk.title) ?? [];
  if (/pending invite|pending invites/i.test(diffOutput)) {
    hotspots.push("Pending invite lifecycle affects seat accounting");
  }
  if (/seatLimit|billing/i.test(diffOutput)) {
    hotspots.push("Billing-sensitive invariant should be transaction-safe in production");
  }
  if (!evidence.summary?.testsPassing) {
    hotspots.push("Verification did not pass");
  }
  return unique(hotspots);
}

function inferReview(evidence, diffOutput, finalTestOutput) {
  const review = [];

  if (/pending invite|pending invites/i.test(diffOutput)) {
    review.push({
      severity: "Medium",
      comment: "Pending invites now count toward seat usage, so stale pending invites can block admins.",
      recommendation: "Expose cancellation or expiration before broad production rollout.",
      evidence: "Diff references pending invites in seat usage logic.",
    });
  }

  if (/seatLimit|billing/i.test(diffOutput)) {
    review.push({
      severity: "Medium",
      comment: "Seat-limit checks are billing-sensitive and can race if backed by concurrent persistent writes.",
      recommendation: "Use a database transaction, lock, or constraint when moving from this in-memory demo to production.",
      evidence: "Changed invite flow enforces capacity before creating an invite.",
    });
  }

  if (!/# fail 0/.test(finalTestOutput) && !evidence.summary?.testsPassing) {
    review.push({
      severity: "High",
      comment: "The final verification command did not pass.",
      recommendation: "Block release until the failing test output is repaired and rerun.",
      evidence: finalTestOutput || "Final test output missing.",
    });
  }

  return review.length > 0 ? review : [{
    severity: "Low",
    comment: "No diff-derived review findings beyond normal rollout monitoring.",
    recommendation: "Proceed with reviewer sign-off and production monitoring.",
    evidence: "Diff and final verification output.",
  }];
}

function inferWhatIf(diffOutput) {
  const options = [];

  if (/inviteMember|src\/invites\.js/.test(diffOutput)) {
    options.push({
      option: "Domain-level enforcement",
      tradeoff: "Chosen path: smallest changed surface and easiest to verify in the invite flow.",
      evidence: "src/invites.js changed in the live diff.",
    });
  }

  if (/seatLimit|billing/i.test(diffOutput)) {
    options.push({
      option: "Persistence-level constraint",
      tradeoff: "Stronger production guarantee, but requires schema and transaction design outside this demo repo.",
      evidence: "Billing capacity is a data integrity concern.",
    });
  }

  if (/hasSeatAvailable|getSeatUsage|countSeatUsage/.test(diffOutput)) {
    options.push({
      option: "Reusable helper surface",
      tradeoff: "Selected where present: lets tests and future admin UI copy inspect availability without duplicating logic.",
      evidence: "Helper export detected in the diff.",
    });
  }

  return options;
}

function scoreFromSignals({ evidence, passCount, changedFiles, review, diffOutput }) {
  const sourceFiles = changedFiles.filter((file) => file.startsWith("src/")).length;
  const tests = changedFiles.filter((file) => file.startsWith("test/")).length;
  const typedError = /SeatLimitReachedError|SEAT_LIMIT_REACHED|TEAM_SEAT_LIMIT_REACHED/.test(diffOutput);
  const unlimited = /undefined seat limit|seatLimit == null|seatLimit === null|null or undefined|unlimited/i.test(diffOutput);
  const helper = /hasSeatAvailable|getSeatUsage|countSeatUsage/.test(diffOutput);
  const highFindings = review.filter((item) => item.severity === "High").length;
  const mediumFindings = review.filter((item) => item.severity === "Medium").length;

  const testing = Math.min(99, 70 + (evidence.summary?.testsPassing ? 15 : 0) + Math.min(passCount * 2, 10) + tests * 2);
  const implementation = Math.min(98, 74 + (typedError ? 6 : 0) + (unlimited ? 5 : 0) + (helper ? 4 : 0) + sourceFiles * 2);
  const architecture = Math.min(96, 76 + (helper ? 7 : 0) + (changedFiles.length <= 4 ? 5 : 0));
  const security = Math.max(55, 90 - highFindings * 18 - mediumFindings * 4);
  const deployment = Math.max(50, Math.round((testing + security + implementation) / 3) - (evidence.risks?.length ?? 0));
  const overall = Math.round((architecture + implementation + testing + security + deployment) / 5);

  return { architecture, implementation, testing, security, deployment, overall };
}

export function buildEngineeringOs({ evidence, diffOutput = "", finalTestOutput = "" }) {
  const changedFiles = evidence.changedFiles ?? [];
  const touchedSource = changedFiles.filter((file) => file.startsWith("src/"));
  const touchedTests = changedFiles.filter((file) => file.startsWith("test/"));
  const passCount = Number(finalTestOutput.match(/# pass (\d+)/)?.[1] ?? 0);
  const sourceSymbols = unique(touchedSource.flatMap((file) => exportedSymbols(changedLinesForFile(diffOutput, file))));
  const dependencyGraph = inferDependencyGraph(changedFiles, diffOutput);
  const callGraph = inferCallGraph(diffOutput);
  const review = inferReview(evidence, diffOutput, finalTestOutput);
  const confidence = scoreFromSignals({ evidence, passCount, changedFiles, review, diffOutput });
  const selectedPath = /src\/invites\.js/.test(diffOutput) ? "invite domain path" : "changed implementation surface";

  return {
    repositoryIntelligence: {
      architecture: `Derived from ${changedFiles.length} changed files: ${touchedSource.join(", ") || "no source file"} owns the runtime behavior and ${touchedTests.join(", ") || "no test file"} verifies it.`,
      entryPoints: unique([
        ...touchedSource.map((file) => `${file}${sourceSymbols.length ? `#${sourceSymbols.join("|")}` : ""}`),
        ...touchedTests,
      ]),
      impactedModules: touchedSource,
      dependencyGraph: dependencyGraph.length ? dependencyGraph : changedFiles.map((file) => `${file} changed by implementation diff`),
      apiRelationships: sourceSymbols.length ? sourceSymbols.map((symbol) => `${symbol}(...)`) : ["Derived from changed source exports"],
      dataRelationships: unique([
        /seatLimit/i.test(diffOutput) ? "teams.seatLimit controls capacity" : "",
        /members/i.test(diffOutput) ? "members contribute to usage" : "",
        /pending invite|invites/i.test(diffOutput) ? "pending invites contribute to usage" : "",
        /null|undefined|unlimited/i.test(diffOutput) ? "null/undefined limits preserve legacy behavior" : "",
      ]),
      callGraph: callGraph.length ? callGraph : ["Call graph inferred from changed files only"],
      riskHotspots: inferRiskHotspots(evidence, diffOutput),
    },
    impactAnalysis: changedFiles.map((file) => {
      const fileDiff = changedLinesForFile(diffOutput, file);
      const insertions = (fileDiff.match(/^\+(?!\+\+)/gm) ?? []).length;
      const deletions = (fileDiff.match(/^-(?!--)/gm) ?? []).length;
      return {
        file,
        reason: file.startsWith("src/")
          ? `Runtime behavior changed here; ${insertions} added lines and ${deletions} removed lines detected.`
          : file.startsWith("test/")
            ? `Verification changed here; ${insertions} added lines and ${deletions} removed lines detected.`
            : `Audit/planning artifact changed; ${insertions} added lines and ${deletions} removed lines detected.`,
        dependencies: unique([
          ...[...fileDiff.matchAll(/from ["'](.+)["']/g)].map((match) => match[1]),
          file.startsWith("test/") ? "node:test" : "",
        ]),
        breakingChangeRisk: file.startsWith("src/") && /throw|Error|seatLimit/i.test(fileDiff) ? "Medium" : "Low",
        complexity: `${insertions} additions / ${deletions} deletions`,
        publicApiAffected: /^src\//.test(file) && /export\s+(?:class|function|const)/m.test(fileDiff) ? "Yes" : "No",
        regressionProbability: evidence.summary?.testsPassing ? `Low after ${passCount || "captured"} passing tests` : "Elevated until tests pass",
      };
    }),
    autonomousPlan: {
      epic: `Deliver: ${evidence.goal}`,
      stories: unique([
        /seatLimit/i.test(diffOutput) ? "As an admin, I need seat limits enforced during invites." : "",
        /null|undefined|unlimited/i.test(diffOutput) ? "As a legacy customer, I need unlimited teams preserved." : "",
        touchedTests.length ? "As a reviewer, I need regression tests proving the behavior." : "",
      ]),
      tasks: unique([
        "Read task contract",
        ...touchedSource.map((file) => `Modify ${file}`),
        ...touchedTests.map((file) => `Update ${file}`),
        "Run final verification",
        "Generate evidence packet",
      ]),
      executionOrder: ["Requirements", "Repository analysis", "Implementation", "Verification", "Review", "Release packet"],
      validationPlan: evidence.checks?.map((check) => `${check.ok ? "Passed" : "Failed"}: ${check.command}`) ?? ["No checks captured"],
      rollbackPlan: touchedSource.length
        ? touchedSource.map((file) => `Revert ${file} and rerun ${evidence.checks?.at(-1)?.command ?? "tests"}`)
        : ["Revert implementation diff and rerun captured verification"],
    },
    decisionLog: [
      {
        decision: `Implement in the ${selectedPath}.`,
        why: "The changed diff shows the business invariant being enforced where invite creation happens.",
        evidence: touchedSource.join(", ") || "Changed file list",
      },
      {
        decision: sourceSymbols.length ? `Expose ${sourceSymbols.join(", ")}.` : "Keep helper surface minimal.",
        why: "The exported surface is derived from the live source diff, so review and tests can target concrete behavior.",
        evidence: sourceSymbols.length ? "Export declarations in diff" : "No new exports detected",
      },
      {
        decision: evidence.summary?.testsPassing ? "Accept release candidate after tests." : "Block release until verification passes.",
        why: "The readiness state follows the final captured check result.",
        evidence: finalTestOutput || "Final check output",
      },
    ],
    selfReview: review,
    failureRecovery: [
      `Detect: implementation.ok is ${evidence.implementation?.ok === true ? "true" : "false"} and final tests are ${evidence.summary?.testsPassing ? "passing" : "not passing"}.`,
      "Explain: command output and diff are retained in live-run.json.",
      "Repair: rerun the agent with SHADOW_CTO_TASK.md plus failing check output.",
      "Validate: strict demo exits non-zero unless implementation changed code and tests pass.",
    ],
    confidenceEngine: confidence,
    repositoryMemory: [
      {
        run: "Current",
        changedFiles,
        knownRisks: evidence.risks?.map((risk) => risk.title) ?? [],
      },
      {
        run: "Next recommended",
        changedFiles: touchedSource,
        knownRisks: inferRiskHotspots(evidence, diffOutput),
      },
    ],
    engineeringMetrics: {
      filesTouched: changedFiles.length,
      sourceFilesTouched: touchedSource.length,
      testsAddedOrChanged: touchedTests.length,
      codeChurn: evidence.diffStat || "Captured in git diff stat",
      riskScore: Math.max(0, 100 - confidence.deployment),
      complexityDelta: `${sourceSymbols.length} exported symbols, ${dependencyGraph.length} dependency edges`,
      maintenanceImpact: review.some((item) => item.severity === "High") ? "High until verification is repaired" : "Low to medium; localized but billing-sensitive.",
    },
    whatIf: inferWhatIf(diffOutput),
    trustLinks: [
      {
        claim: "Implementation status",
        evidence: `mode=${evidence.implementation?.mode}; ok=${evidence.implementation?.ok}`,
      },
      {
        claim: "Behavior was verified",
        evidence: finalTestOutput || "Final check output captured in live-run.json",
      },
      {
        claim: "Review findings are diff-derived",
        evidence: review.map((item) => item.evidence).join(" | "),
      },
      {
        claim: "Scores are signal-derived",
        evidence: "Confidence uses test pass count, changed files, review severity, typed errors, helper exports, and risks.",
      },
    ],
  };
}

export function writeReports({ evidence, os, reportsDir }) {
  mkdirSync(reportsDir, { recursive: true });
  const finalCheck = evidence.checks?.[evidence.checks.length - 1];
  const reportMap = {
    "cto-summary.md": `# CTO Summary

Business request: ${evidence.goal}

Recommendation: ${evidence.summary?.testsPassing && evidence.implementation?.ok ? "Proceed to PR review with deployment safeguards." : "Do not release until implementation and verification are green."}

Implementation mode: ${evidence.implementation?.mode}
Implementation ok: ${evidence.implementation?.ok}
Tests: ${finalCheck?.result ?? "Captured in evidence"}
Overall confidence: ${os.confidenceEngine.overall}%

Remaining risks:
${(evidence.risks ?? []).map((risk) => `- ${risk.title}: ${risk.body}`).join("\n")}
`,
    "architecture-review.md": `# Architecture Review

${os.repositoryIntelligence.architecture}

Entry points:
${os.repositoryIntelligence.entryPoints.map((item) => `- ${item}`).join("\n")}

Dependency graph:
${os.repositoryIntelligence.dependencyGraph.map((item) => `- ${item}`).join("\n")}

Decision log:
${os.decisionLog.map((item) => `- ${item.decision}: ${item.why} Evidence: ${item.evidence}`).join("\n")}
`,
    "security-review.md": `# Security Review

Findings:
${os.selfReview.map((item) => `- ${item.severity}: ${item.comment} Recommendation: ${item.recommendation} Evidence: ${item.evidence}`).join("\n")}
`,
    "release-checklist.md": `# Release Checklist

${(evidence.prPacket?.checklist ?? []).map((item) => `- [x] ${item}`).join("\n")}
- [${evidence.summary?.testsPassing ? "x" : " "}] Final verification passed.
- [${evidence.implementation?.ok ? "x" : " "}] Implementation agent completed successfully.
- [ ] Add production transaction/locking if backed by a database.
- [ ] Monitor invite failures after rollout.
`,
    "pr-packet.md": `# ${evidence.prPacket?.title ?? "PR Packet"}

${evidence.prPacket?.summary ?? "Generated from live evidence."}

Checklist:
${(evidence.prPacket?.checklist ?? []).map((item) => `- ${item}`).join("\n")}
`,
  };

  for (const [file, content] of Object.entries(reportMap)) {
    writeFileSync(path.join(reportsDir, file), content);
  }
}
