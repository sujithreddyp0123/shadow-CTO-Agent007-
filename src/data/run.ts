import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  FileSearch,
  GitPullRequest,
  PlayCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type TimelineStatus = "done" | "active" | "queued";

export type TimelineEvent = {
  title: string;
  detail: string;
  status: TimelineStatus;
  time: string;
  icon: LucideIcon;
};

export type EvidenceItem = {
  label: string;
  value: string;
  tone: "success" | "neutral" | "warning";
};

export const request = {
  repo: "acme-saas-demo",
  goal: "Add team billing seats so admins can set a seat limit and block invites when the team is over limit.",
  owner: "Founder request",
  risk: "Revenue launch blocker",
};

export const repoBrief = [
  {
    label: "Backend surface",
    value: "FastAPI invite endpoint, team model, billing settings",
  },
  {
    label: "Frontend surface",
    value: "Team settings page and invite member form",
  },
  {
    label: "Verification",
    value: "Unit tests for seat capacity, invite behavior, admin path",
  },
];

export const implementationPlan = [
  "Add a seat_limit field to team billing settings.",
  "Block new invites when active members plus pending invites meet the limit.",
  "Return a clear API error that the UI can explain to admins.",
  "Expose seat usage in team settings so admins see capacity before inviting.",
  "Add tests for under-limit, at-limit, and unlimited teams.",
];

export const timeline: TimelineEvent[] = [
  {
    title: "Repo understood",
    detail: "Mapped teams, members, invites, and billing settings before touching code.",
    status: "done",
    time: "00:18",
    icon: FileSearch,
  },
  {
    title: "Plan approved",
    detail: "Scoped the change to seat accounting, invite enforcement, and visible admin feedback.",
    status: "done",
    time: "00:42",
    icon: ClipboardCheck,
  },
  {
    title: "Codex implementation",
    detail: "Updated backend rules, UI state, and targeted tests in one controlled run.",
    status: "done",
    time: "03:11",
    icon: Code2,
  },
  {
    title: "Verification run",
    detail: "Executed targeted tests and captured output for the evidence packet.",
    status: "active",
    time: "04:03",
    icon: PlayCircle,
  },
  {
    title: "PR packet",
    detail: "Generated reviewer summary, rollout risks, and demo notes.",
    status: "queued",
    time: "04:30",
    icon: GitPullRequest,
  },
];

export const evidence: EvidenceItem[] = [
  { label: "Files changed", value: "7", tone: "neutral" },
  { label: "Tests passing", value: "18 / 18", tone: "success" },
  { label: "Risk items", value: "2", tone: "warning" },
  { label: "Reviewer time saved", value: "35 min", tone: "success" },
];

export const changedFiles = [
  "backend/app/models/team.py",
  "backend/app/routes/invites.py",
  "backend/app/services/seat_usage.py",
  "backend/tests/test_invites.py",
  "frontend/src/pages/TeamSettings.tsx",
  "frontend/src/components/InviteMemberForm.tsx",
  "docs/billing-seat-limits.md",
];

export const checks = [
  {
    command: "pytest backend/tests/test_invites.py",
    result: "12 passed in 1.84s",
    icon: CheckCircle2,
  },
  {
    command: "npm run test -- InviteMemberForm",
    result: "6 passed in 2.17s",
    icon: CheckCircle2,
  },
  {
    command: "npm run build",
    result: "Production build completed",
    icon: ShieldCheck,
  },
];

export const risks = [
  {
    title: "Billing source of truth",
    body: "Seat limit is read from local billing settings. Production rollout should confirm sync timing with the payment provider.",
    icon: AlertTriangle,
  },
  {
    title: "Legacy teams",
    body: "Teams without a seat limit are treated as unlimited to avoid blocking existing customers.",
    icon: AlertTriangle,
  },
];

export const prPacket = {
  title: "Enforce team billing seat limits on member invites",
  summary:
    "Adds seat-limit accounting for teams, blocks invite creation at capacity, and surfaces usage in the admin invite flow.",
  checklist: [
    "Seat usage counts active members and pending invites.",
    "Unlimited legacy teams remain unaffected.",
    "Admins see capacity before sending invites.",
    "API returns actionable copy for at-limit teams.",
  ],
};
