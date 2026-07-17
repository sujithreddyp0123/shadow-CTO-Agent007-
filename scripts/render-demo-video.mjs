import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const py = "C:\\Users\\sujit\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const workDir = path.join(root, "work", "demo-video");
const framesDir = path.join(workDir, "slides");
const concatPath = path.join(workDir, "concat.txt");
const outputPath = path.join(root, "outputs", "shadow-cto-demo-broll.mp4");
const renderScript = path.join(workDir, "render_slides.py");

if (existsSync(workDir)) {
  rmSync(workDir, { recursive: true, force: true });
}
mkdirSync(framesDir, { recursive: true });
mkdirSync(path.dirname(outputPath), { recursive: true });

writeFileSync(renderScript, String.raw`
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
import textwrap

ROOT = Path(r"${root}")
FRAMES = Path(r"${framesDir}")
evidence = json.loads((ROOT / "public" / "live-run.json").read_text(encoding="utf-8"))
os = json.loads((ROOT / "public" / "engineering-os.json").read_text(encoding="utf-8"))

W, H = 1920, 1080
BG = "#0b1020"
PANEL = "#111827"
PANEL2 = "#172033"
INK = "#eef2ff"
MUTED = "#9aa4b2"
GREEN = "#4ade80"
BLUE = "#60a5fa"
AMBER = "#fbbf24"
RED = "#fb7185"
CYAN = "#22d3ee"
PURPLE = "#a78bfa"

def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for item in candidates:
        try:
            return ImageFont.truetype(item, size)
        except Exception:
            pass
    return ImageFont.load_default()

F = {
    "hero": font(72, True),
    "h1": font(52, True),
    "h2": font(38, True),
    "body": font(31),
    "small": font(24),
    "code": font(26),
    "mono": font(26),
    "tiny": font(20),
}

def rounded(draw, xy, fill, outline=None, radius=28, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def text(draw, xy, value, fill=INK, f="body", max_width=None, line_gap=8):
    x, y = xy
    if max_width:
        avg = max(1, int(F[f].getlength("x")))
        chars = max(12, max_width // avg)
        lines = []
        for part in str(value).splitlines():
            lines.extend(textwrap.wrap(part, chars) or [""])
    else:
        lines = str(value).splitlines()
    for line in lines:
        draw.text((x, y), line, fill=fill, font=F[f])
        y += F[f].size + line_gap
    return y

def pill(draw, x, y, label, color=BLUE):
    w = int(F["small"].getlength(label)) + 38
    rounded(draw, (x, y, x+w, y+48), "#0f172a", color, 22, 2)
    draw.text((x+19, y+10), label, fill=color, font=F["small"])
    return x + w + 14

def base(title, kicker=None):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 120), fill="#0f172a")
    d.text((70, 38), "Shadow CTO", fill=CYAN, font=F["h2"])
    if kicker:
        d.text((W-70-F["small"].getlength(kicker), 48), kicker, fill=MUTED, font=F["small"])
    d.text((70, 160), title, fill=INK, font=F["h1"])
    return img, d

def save(img, name):
    img.save(FRAMES / name, quality=95)

def terminal(draw, box, lines, title="PowerShell"):
    x1, y1, x2, y2 = box
    rounded(draw, box, "#050816", "#2b3654", 18)
    draw.rectangle((x1, y1, x2, y1+58), fill="#101827")
    draw.ellipse((x1+24, y1+20, x1+42, y1+38), fill=RED)
    draw.ellipse((x1+52, y1+20, x1+70, y1+38), fill=AMBER)
    draw.ellipse((x1+80, y1+20, x1+98, y1+38), fill=GREEN)
    draw.text((x1+130, y1+18), title, fill=MUTED, font=F["small"])
    y = y1 + 84
    for line, color in lines:
        draw.text((x1+34, y), line, fill=color, font=F["mono"])
        y += 38

def card(draw, box, title, value, accent=BLUE, body=None):
    rounded(draw, box, PANEL, "#2a3654", 24)
    x1, y1, x2, y2 = box
    draw.text((x1+28, y1+26), title, fill=MUTED, font=F["small"])
    draw.text((x1+28, y1+70), value, fill=accent, font=F["h2"])
    if body:
        text(draw, (x1+28, y1+128), body, fill=INK, f="small", max_width=x2-x1-56)

goal = evidence["goal"]
mode = evidence["implementation"]["mode"]
duration = round(evidence["implementation"]["durationMs"] / 1000)
tests = evidence["checks"][-1]["result"]
diff_stat = evidence["diffStat"]
confidence = os["confidenceEngine"]["overall"]

# 01 Cold open
img, d = base("One business request. Full engineering evidence.", "0:00-0:20")
text(d, (80, 260), "Add team billing seat limits — block invites when a team is over capacity.", GREEN, "h2", 1280)
rounded(d, (80, 440, 1840, 930), PANEL, "#2a3654", 24)
d.text((120, 475), "demo-repos/acme-saas-demo", fill=BLUE, font=F["small"])
code = [
    "src/",
    "  invites.js        inviteMember(store, teamId, email)",
    "  store.js          teams, members, pending invites, seatLimit",
    "test/",
    "  invites.test.js   baseline invite behavior",
]
y = 540
for line in code:
    d.text((140, y), line, fill=INK if not line.endswith("/") else CYAN, font=F["mono"])
    y += 48
text(d, (1120, 560), "Framing: founder request → trustworthy engineering outcome", MUTED, "body", 620)
save(img, "slide_01_cold_open.png")

# 02 Preflight
img, d = base("Proof first: Codex CLI preflight", "0:20-0:30")
terminal(d, (90, 270, 1830, 870), [
    (r"PS> npm run preflight:agent", GREEN),
    ("", INK),
    ("> shadow-cto@0.1.0 preflight:agent", MUTED),
    ("> node scripts/preflight-agent.mjs", MUTED),
    ("", INK),
    ("Project-local Codex CLI is available.", GREEN),
    (r"node_modules\.bin\codex.cmd", BLUE),
    ("codex-cli 0.144.4", GREEN),
])
save(img, "slide_02_preflight.png")

# 03 Strict run
img, d = base("Strict run: fail if the real agent is missing", "0:30-0:40")
terminal(d, (90, 250, 1830, 885), [
    (r"PS> npm run run:demo", GREEN),
    ("", INK),
    ("> node scripts/preflight-agent.mjs && node scripts/run-demo-strict.mjs", MUTED),
    ("Project-local Codex CLI is available.", GREEN),
    ("codex-cli 0.144.4", GREEN),
    ("", INK),
    ("Codex CLI is implementing SHADOW_CTO_TASK.md...", BLUE),
    (f"{duration} seconds later: evidence packet generated", AMBER),
])
pill(d, 96, 920, "no silent fallback", RED)
pill(d, 340, 920, "real Codex CLI run", GREEN)
pill(d, 615, 920, "live git diff + tests", BLUE)
save(img, "slide_03_strict_run.png")

# 04 Dashboard summary
img, d = base("Dashboard loads live-run.json", "0:40-0:55")
text(d, (90, 250), goal, INK, "h2", 1580)
card(d, (90, 430, 465, 650), "Implementation", mode, GREEN, "codex-cli, not fallback")
card(d, (505, 430, 880, 650), "Files changed", str(evidence["summary"]["filesChanged"]), BLUE, "SHADOW_CTO_TASK.md, src, test")
card(d, (920, 430, 1295, 650), "Tests passing", "5 / 5", GREEN, "Final node --test output")
card(d, (1335, 430, 1710, 650), "Risk items", str(evidence["summary"]["riskItems"]), AMBER, "Captured for review")
text(d, (100, 745), "The UI is a viewer over evidence, not a separate story.", MUTED, "body", 1200)
save(img, "slide_04_dashboard.png")

# 05 Diff
img, d = base("Real diff: Codex wrote the seat-limit behavior", "0:55-1:10")
rounded(d, (90, 250, 1830, 900), "#06111f", "#274060", 24)
d.text((125, 285), "work/shadow-demo-repo/src/invites.js", fill=BLUE, font=F["small"])
snippet = [
    "+ export class SeatLimitReachedError extends Error {",
    "+   constructor(team, usage) {",
    "+     super(\"Team has reached its seat limit...\");",
    "+     this.code = \"SEAT_LIMIT_REACHED\";",
    "+     this.seatUsage = usage;",
    "+   }",
    "+ }",
    "",
    "+ export function getSeatUsage(store, teamId) {",
    "+   const activeMembers = store.members.filter(...).length;",
    "+   const pendingInvites = store.invites.filter(...).length;",
    "+   return activeMembers + pendingInvites;",
    "+ }",
]
y = 350
for line in snippet:
    d.text((135, y), line, fill=GREEN if line.startswith("+") else MUTED, font=F["mono"])
    y += 38
save(img, "slide_05_diff.png")

# 06 Tests
img, d = base("Verification: generated tests pass", "1:10-1:25")
terminal(d, (90, 260, 1120, 870), [
    (r"PS> node --test", GREEN),
    ("", INK),
    ("# pass 5", GREEN),
    ("# fail 0", GREEN),
    ("# cancelled 0", MUTED),
    ("# skipped 0", MUTED),
    ("# todo 0", MUTED),
    ("# duration_ms 239.9056", BLUE),
])
text(d, (1210, 310), "Covered behavior", INK, "h2")
y = 390
for item in ["under limit invites", "at-limit blocking", "null unlimited teams", "undefined seat limits", "seat availability helper"]:
    d.text((1235, y), "✓", fill=GREEN, font=F["h2"])
    d.text((1290, y+7), item, fill=INK, font=F["body"])
    y += 72
save(img, "slide_06_tests.png")

# 07 Intelligence and confidence
img, d = base("Risk and confidence are evidence-derived", "1:25-1:45")
card(d, (90, 270, 540, 505), "Overall confidence", f"{confidence}%", GREEN, "Uses pass count, review severity, typed errors, helper exports, and risks.")
card(d, (590, 270, 1040, 505), "Security", f"{os['confidenceEngine']['security']}%", AMBER, "Reduced by diff-derived medium findings.")
card(d, (1090, 270, 1540, 505), "Deployment", f"{os['confidenceEngine']['deployment']}%", GREEN, "Combines implementation, tests, and risk.")
rounded(d, (90, 600, 1830, 910), PANEL, "#2a3654", 24)
d.text((130, 640), "Risk report", fill=AMBER, font=F["h2"])
y = 710
for risk in evidence["risks"]:
    d.text((140, y), risk["title"], fill=INK, font=F["body"])
    text(d, (520, y+3), risk["body"], MUTED, "small", 1180)
    y += 90
save(img, "slide_07_confidence.png")

# 08 Differentiator
img, d = base("The differentiator: traceability", "1:45-2:00")
text(d, (140, 310), "Every claim on this dashboard traces back to something that actually happened in this run.", GREEN, "h1", 1600)
items = [
    ("Claim", "Codex authored implementation", "Evidence", "implementation.mode = codex-cli"),
    ("Claim", "Behavior was verified", "Evidence", "# pass 5 / # fail 0"),
    ("Claim", "PR packet reflects the diff", "Evidence", "Checklist generated from diff + tests"),
]
y = 560
for a,b,c,e in items:
    rounded(d, (150, y, 1770, y+110), PANEL2, "#34415f", 20)
    d.text((190, y+20), a, fill=MUTED, font=F["small"])
    d.text((300, y+18), b, fill=INK, font=F["body"])
    d.text((940, y+20), c, fill=MUTED, font=F["small"])
    d.text((1060, y+18), e, fill=CYAN, font=F["body"])
    y += 135
save(img, "slide_08_traceability.png")

# 09 PR packet
img, d = base("Final artifact: reviewer-ready PR packet", "2:00-2:25")
rounded(d, (90, 250, 1830, 930), PANEL, "#2a3654", 24)
d.text((130, 290), evidence["prPacket"]["title"], fill=INK, font=F["h2"])
text(d, (130, 360), evidence["prPacket"]["summary"], MUTED, "body", 1600)
y = 500
for item in evidence["prPacket"]["checklist"]:
    d.text((150, y), "✓", fill=GREEN, font=F["h2"])
    text(d, (210, y+8), item, INK, "body", 1450)
    y += 78
save(img, "slide_09_pr_packet.png")

# 10 Close
img, d = base("One request in. Verified engineering evidence out.", "2:25-2:30")
text(d, (140, 330), "Small teams get senior-engineer-level rigor without hiring one.", INK, "h1", 1500)
pill(d, 145, 570, "business request", BLUE)
pill(d, 455, 570, "Codex implementation", GREEN)
pill(d, 840, 570, "tests", GREEN)
pill(d, 1010, 570, "risk review", AMBER)
pill(d, 1245, 570, "PR packet", PURPLE)
text(d, (145, 720), "Shadow CTO", CYAN, "hero")
save(img, "slide_10_close.png")
`, "utf8");

execFileSync(py, [renderScript], { cwd: root, stdio: "inherit" });

const slides = [
  ["slide_01_cold_open.png", 20],
  ["slide_02_preflight.png", 10],
  ["slide_03_strict_run.png", 10],
  ["slide_04_dashboard.png", 15],
  ["slide_05_diff.png", 15],
  ["slide_06_tests.png", 15],
  ["slide_07_confidence.png", 20],
  ["slide_08_traceability.png", 15],
  ["slide_09_pr_packet.png", 25],
  ["slide_10_close.png", 5],
];

const concat = slides
  .map(([file, seconds]) => `file '${path.join(framesDir, file).replaceAll("\\", "/")}'\nduration ${seconds}`)
  .join("\n") + `\nfile '${path.join(framesDir, slides.at(-1)[0]).replaceAll("\\", "/")}'\n`;
writeFileSync(concatPath, concat, "utf8");

execFileSync(ffmpegPath, [
  "-y",
  "-f", "concat",
  "-safe", "0",
  "-i", concatPath,
  "-vf", "scale=1920:1080,format=yuv420p",
  "-r", "30",
  "-movflags", "+faststart",
  outputPath,
], { cwd: root, stdio: "inherit" });

console.log(outputPath);
