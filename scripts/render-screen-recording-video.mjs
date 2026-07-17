import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const py = "C:\\Users\\sujit\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const workDir = path.join(root, "work", "screen-recording-video");
const renderScript = path.join(workDir, "render_screen_recording.py");
const outputPath = path.join(root, "outputs", "shadow-cto-screen-recording-style.mp4");

mkdirSync(workDir, { recursive: true });
mkdirSync(path.dirname(outputPath), { recursive: true });

const pyCode = String.raw`
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import json
import math
import subprocess
import textwrap

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "outputs" / "shadow-cto-screen-recording-style.mp4"
FFMPEG = r"__FFMPEG__"
evidence = json.loads((ROOT / "public" / "live-run.json").read_text(encoding="utf-8"))
os = json.loads((ROOT / "public" / "engineering-os.json").read_text(encoding="utf-8"))

W, H = 1920, 1080
FPS = 6
DURATION = 150

BG = (8, 13, 30)
WINDOW = (17, 24, 39)
PANEL = (23, 32, 51)
PANEL2 = (31, 42, 65)
INK = (238, 242, 255)
MUTED = (148, 163, 184)
GREEN = (74, 222, 128)
BLUE = (96, 165, 250)
CYAN = (34, 211, 238)
AMBER = (251, 191, 36)
RED = (251, 113, 133)
PURPLE = (167, 139, 250)
LINE = (50, 65, 95)

def font(size, bold=False):
    paths = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

F_HERO = font(58, True)
F_H1 = font(42, True)
F_H2 = font(31, True)
F_BODY = font(25)
F_SMALL = font(20)
F_MONO = font(22)
F_MONO_B = font(22, True)
F_TINY = font(17)

def ease(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)

def lerp(a, b, x):
    return a + (b - a) * ease(x)

def draw_text(d, xy, s, fill=INK, font=F_BODY, max_width=None, gap=6):
    x, y = xy
    if max_width:
        avg = max(1, int(font.getlength("x")))
        chars = max(10, max_width // avg)
        lines = []
        for part in str(s).splitlines():
            lines.extend(textwrap.wrap(part, chars) or [""])
    else:
        lines = str(s).splitlines()
    for line in lines:
        d.text((x, y), line, fill=fill, font=font)
        y += font.size + gap
    return y

def rounded(d, box, fill, outline=None, radius=18, width=2):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def shadow_box(img, box, fill, outline=None, radius=18):
    x1, y1, x2, y2 = box
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle((x1+10,y1+12,x2+10,y2+12), radius=radius, fill=(0,0,0,80))
    layer = layer.filter(ImageFilter.GaussianBlur(12))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img)
    rounded(d, box, fill, outline, radius)

def flat_box(d, box, fill, outline=None, radius=18):
    rounded(d, box, fill, outline, radius)

def cursor(d, x, y):
    pts = [(x,y),(x,y+34),(x+10,y+25),(x+18,y+46),(x+27,y+42),(x+19,y+22),(x+35,y+22)]
    d.polygon(pts, fill=(255,255,255), outline=(0,0,0))

def top_bar(d, title="Shadow CTO demo"):
    d.rectangle((0,0,W,54), fill=(12,18,32))
    d.ellipse((24,18,40,34), fill=RED)
    d.ellipse((50,18,66,34), fill=AMBER)
    d.ellipse((76,18,92,34), fill=GREEN)
    d.text((120,16), title, fill=MUTED, font=F_SMALL)

def editor_base():
    img = Image.new("RGBA", (W,H), BG+(255,))
    d = ImageDraw.Draw(img)
    top_bar(d, "Visual Studio Code - acme-saas-demo")
    d.rectangle((0,54,270,H), fill=(15,23,42))
    d.text((28,88), "EXPLORER", fill=MUTED, font=F_SMALL)
    tree = [
        ("acme-saas-demo", CYAN, 132),
        ("src", INK, 178),
        ("  invites.js", GREEN, 220),
        ("  store.js", MUTED, 262),
        ("test", INK, 320),
        ("  invites.test.js", BLUE, 362),
        ("package.json", MUTED, 420),
    ]
    for label, color, y in tree:
        d.text((34, y), label, fill=color, font=F_MONO)
    d.rectangle((270,54,W,H), fill=(10,16,30))
    d.rectangle((270,54,W,94), fill=(21,30,48))
    d.text((300,64), "src/invites.js", fill=GREEN, font=F_SMALL)
    d.text((520,64), "test/invites.test.js", fill=MUTED, font=F_SMALL)
    code = [
        'import { findTeam } from "./store.js";',
        "",
        "export function inviteMember(store, teamId, email) {",
        "  findTeam(store, teamId);",
        "",
        "  const invite = {",
        "    id: makeInviteId(store.invites.length + 1),",
        "    teamId,",
        "    email,",
        '    status: "pending",',
        "  };",
        "",
        "  store.invites.push(invite);",
        "  return invite;",
        "}",
    ]
    y = 135
    for i, line in enumerate(code, 1):
        d.text((305, y), str(i).rjust(2), fill=(75,85,105), font=F_MONO)
        d.text((360, y), line, fill=INK if line else MUTED, font=F_MONO)
        y += 39
    shadow_box(img, (1040, 710, 1810, 940), PANEL, LINE, 22)
    draw_text(d, (1080, 750), "Business request", CYAN, F_H2)
    draw_text(d, (1080, 800), "Add team billing seat limits. Block invites when a team is over capacity.", INK, F_BODY, 650)
    return img

EDITOR_BASE = editor_base()

def editor_frame(t):
    img = EDITOR_BASE.copy()
    d = ImageDraw.Draw(img)
    x = lerp(1220, 470, min(1, t/8))
    ycur = lerp(820, 220, min(1, t/8))
    cursor(d, x, ycur)
    return img

def terminal_lines(t):
    lines = []
    def add(line, color=INK, at=0):
        if t >= at:
            lines.append((line, color))
    preflight = "PS> npm run preflight:agent"
    run = "PS> npm run run:demo"
    typed_len = int(min(len(preflight), max(0, (t-1)*18)))
    add(preflight[:typed_len] + ("_" if typed_len < len(preflight) else ""), GREEN, 1)
    add("> shadow-cto@0.1.0 preflight:agent", MUTED, 4)
    add("> node scripts/preflight-agent.mjs", MUTED, 5)
    add("Project-local Codex CLI is available.", GREEN, 6)
    add("node_modules\\.bin\\codex.cmd", BLUE, 7)
    add("codex-cli 0.144.4", GREEN, 8)
    if t >= 10:
        typed2 = int(min(len(run), max(0, (t-10)*16)))
        add(run[:typed2] + ("_" if typed2 < len(run) else ""), GREEN)
    add("> node scripts/preflight-agent.mjs && node scripts/run-demo-strict.mjs", MUTED, 13)
    add("Project-local Codex CLI is available.", GREEN, 14)
    add("codex-cli 0.144.4", GREEN, 15)
    add("Codex is reading SHADOW_CTO_TASK.md and editing the repo...", BLUE, 17)
    if t >= 20 and t < 32:
        dots = "." * (1 + int(t*2) % 8)
        add("running codex-cli " + dots, AMBER)
    add("76 seconds later: implementation completed", AMBER, 32)
    add("Changed: src/invites.js, test/invites.test.js", BLUE, 34)
    add("Verification: node --test passes: 5 tests, 5 passed", GREEN, 36)
    return lines[-16:]

def terminal_frame(t):
    img = Image.new("RGBA", (W,H), BG+(255,))
    d = ImageDraw.Draw(img)
    top_bar(d, "PowerShell - Shadow CTO")
    shadow_box(img, (90,120,1830,940), (5,8,22), LINE, 22)
    d.rectangle((90,120,1830,176), fill=(16,24,39))
    d.text((130,136), "Terminal proof: real command, real Codex CLI", fill=INK, font=F_H2)
    y = 215
    for line, color in terminal_lines(t):
        d.text((130,y), line, fill=color, font=F_MONO)
        y += 40
    if t >= 32:
        rounded(d, (1260,805,1755,890), (28,45,34), GREEN, 16)
        d.text((1290,830), "strict mode accepted evidence", fill=GREEN, font=F_BODY)
    cursor(d, lerp(1480, 1720, (math.sin(t)+1)/2), lerp(760, 840, (math.cos(t/2)+1)/2))
    return img

def dashboard_canvas():
    page_h = 3150
    img = Image.new("RGBA", (W,page_h), BG+(255,))
    d = ImageDraw.Draw(img)
    d.rectangle((0,0,W,96), fill=(12,18,32))
    d.text((70,28), "Shadow CTO", fill=CYAN, font=F_H2)
    d.text((70,140), "Shadow CTO runs an autonomous engineering org for one business request.", fill=INK, font=F_H1)
    draw_text(d, (70,205), evidence["goal"], MUTED, F_BODY, 1140)
    shadow_box(img, (1290,130,1830,340), PANEL, LINE, 22)
    d.text((1325,170), "Live runner evidence", fill=MUTED, font=F_SMALL)
    draw_text(d, (1325,215), "Actual git diff + tests", GREEN, F_H2, 430)
    cards = [
        ("Files changed", "3", BLUE),
        ("Tests passing", "5 / 5", GREEN),
        ("Risk items", "2", AMBER),
        ("Implementation", "codex-cli", GREEN),
    ]
    x = 70
    for label, value, color in cards:
        shadow_box(img, (x,410,x+410,600), PANEL, LINE, 22)
        d.text((x+28,438), label, fill=MUTED, font=F_SMALL)
        d.text((x+28,490), value, fill=color, font=F_H1)
        x += 455
    d.text((70,720), "Repository Intelligence", fill=INK, font=F_H2)
    shadow_box(img, (70,780,1180,1060), PANEL, LINE, 22)
    draw_text(d, (105,820), os["repositoryIntelligence"]["architecture"], INK, F_BODY, 1020)
    draw_text(d, (105,910), "Entry points: src/invites.js#SeatLimitReachedError|getSeatUsage|hasSeatAvailable", CYAN, F_SMALL, 980)
    d.text((1240,720), "Confidence Engine", fill=INK, font=F_H2)
    shadow_box(img, (1240,780,1830,1060), PANEL, LINE, 22)
    d.text((1285,825), str(os["confidenceEngine"]["overall"]) + "%", fill=GREEN, font=F_HERO)
    yy = 915
    for key in ["architecture","implementation","testing","security","deployment"]:
        d.text((1288,yy), key, fill=MUTED, font=F_SMALL)
        d.rectangle((1480, yy+8, 1760, yy+22), fill=(40,50,70))
        d.rectangle((1480, yy+8, 1480+int(os["confidenceEngine"][key]*2.8), yy+22), fill=GREEN if key!="security" else AMBER)
        yy += 36
    d.text((70,1190), "Multi-Agent Engineering Org", fill=INK, font=F_H2)
    agents = ["Planner","Architect","Backend","QA","Security","Reviewer"]
    x = 70
    for a in agents:
        shadow_box(img, (x,1250,x+280,1420), PANEL, LINE, 18)
        d.text((x+25,1280), a, fill=CYAN, font=F_BODY)
        d.text((x+25,1330), "handoff complete", fill=GREEN, font=F_SMALL)
        x += 300
    d.text((70,1540), "Autonomous SDLC Timeline", fill=INK, font=F_H2)
    x = 70
    for stage in ["Requirements","Design","Development","Testing","Security","Review","Release"]:
        rounded(d, (x,1600,x+240,1680), (18,30,50), GREEN if stage!="Release" else AMBER, 18)
        d.text((x+20,1623), stage, fill=INK, font=F_SMALL)
        x += 255
    d.text((70,1810), "Verification", fill=INK, font=F_H2)
    shadow_box(img, (70,1870,870,2135), (5,8,22), LINE, 22)
    for i,line in enumerate(["PS> node --test", "# pass 5", "# fail 0", "# duration_ms 239.9056"]):
        d.text((105,1910+i*45), line, fill=GREEN if "pass" in line or "fail 0" in line else BLUE if "duration" in line else INK, font=F_MONO)
    d.text((960,1810), "Code Impact Analysis", fill=INK, font=F_H2)
    shadow_box(img, (960,1870,1830,2135), PANEL, LINE, 22)
    draw_text(d, (995,1910), "src/invites.js - runtime behavior changed; 30 added lines / 1 deleted line", GREEN, F_BODY, 780)
    draw_text(d, (995,2005), "test/invites.test.js - verification changed; 49 added lines / 2 deleted lines", BLUE, F_BODY, 780)
    d.text((70,2265), "Risk Report", fill=INK, font=F_H2)
    shadow_box(img, (70,2325,880,2595), PANEL, LINE, 22)
    y = 2370
    for risk in evidence["risks"]:
        d.text((105,y), risk["title"], fill=AMBER, font=F_BODY)
        draw_text(d, (105,y+42), risk["body"], MUTED, F_SMALL, 700)
        y += 112
    d.text((960,2265), "PR Packet", fill=INK, font=F_H2)
    shadow_box(img, (960,2325,1830,2925), PANEL, LINE, 22)
    draw_text(d, (995,2370), evidence["prPacket"]["title"], GREEN, F_H2, 780)
    y = 2465
    for item in evidence["prPacket"]["checklist"]:
        d.text((1000,y), "+", fill=GREEN, font=F_H2)
        draw_text(d, (1040,y+2), item, INK, F_SMALL, 710)
        y += 74
    return img

DASH = dashboard_canvas()

def dashboard_frame(t):
    # t runs 0..70
    if t < 8:
        scroll = 0
    elif t < 42:
        scroll = lerp(0, 1710, (t-8)/34)
    else:
        scroll = lerp(1710, 2050, (t-42)/28)
    viewport = DASH.crop((0, int(scroll), W, int(scroll)+H))
    img = Image.new("RGBA", (W,H), BG+(255,))
    img.alpha_composite(viewport, (0,0))
    d = ImageDraw.Draw(img)
    # Browser chrome
    d.rectangle((0,0,W,64), fill=(12,18,32))
    d.text((120,18), "http://127.0.0.1:5173/", fill=MUTED, font=F_SMALL)
    d.ellipse((28,22,42,36), fill=RED)
    d.ellipse((54,22,68,36), fill=AMBER)
    d.ellipse((80,22,94,36), fill=GREEN)
    # Cursor targets
    if t < 18:
        x, y = lerp(1650, 1510, t/18), lerp(930, 520, t/18)
    elif t < 38:
        x, y = lerp(1510, 340, (t-18)/20), lerp(520, 900, (t-18)/20)
    else:
        x, y = lerp(340, 1180, (t-38)/32), lerp(900, 760, (t-38)/32)
    cursor(d, x, y)
    if 12 < t < 22:
        rounded(d, (1180,610,1810,705), (7,16,30), GREEN, 18)
        d.text((1210,638), "Implementation mode: codex-cli, not fallback", fill=GREEN, font=F_BODY)
    if 35 < t < 48:
        rounded(d, (90,785,700,875), (7,16,30), GREEN, 18)
        d.text((120,812), "5/5 tests are from this run", fill=GREEN, font=F_BODY)
    return img

def diff_base():
    img = Image.new("RGBA", (W,H), BG+(255,))
    d = ImageDraw.Draw(img)
    top_bar(d, "Visual Studio Code - work/shadow-demo-repo/src/invites.js")
    d.rectangle((0,54,270,H), fill=(15,23,42))
    for label,y,color in [("CHANGES",94,MUTED),("M SHADOW_CTO_TASK.md",145,MUTED),("M src/invites.js",190,GREEN),("M test/invites.test.js",235,BLUE)]:
        d.text((32,y), label, fill=color, font=F_MONO)
    d.rectangle((270,54,W,H), fill=(8,13,25))
    d.text((310,86), "src/invites.js", fill=GREEN, font=F_SMALL)
    code = [
        "+ export class SeatLimitReachedError extends Error {",
        "+   constructor(team, usage) {",
        "+     super(\"Team has reached its seat limit...\");",
        "+     this.name = \"SeatLimitReachedError\";",
        "+     this.code = \"SEAT_LIMIT_REACHED\";",
        "+     this.teamId = team.id;",
        "+     this.seatLimit = team.seatLimit;",
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
    y = 140
    for i,line in enumerate(code,1):
        d.text((315,y), str(i).rjust(2), fill=(75,85,105), font=F_MONO)
        d.text((370,y), line, fill=GREEN if line.startswith("+") else MUTED, font=F_MONO)
        y += 42
    hi_y = 140 + 3*42
    d.rounded_rectangle((360, hi_y-6, 1280, hi_y+36), radius=8, outline=AMBER, width=4)
    rounded(d, (1160, 205, 1810, 335), (7,16,30), AMBER, 18)
    draw_text(d, (1190,230), "Codex wrote this typed error class", INK, F_BODY, 560)
    return img

DIFF_BASE = diff_base()

def diff_frame(t):
    img = DIFF_BASE.copy()
    d = ImageDraw.Draw(img)
    hi_y = 140 + 3*42
    cursor(d, lerp(1500, 980, min(1,t/10)), lerp(540, hi_y+5, min(1,t/10)))
    return img

def final_base():
    img = Image.new("RGBA", (W,H), BG+(255,))
    d = ImageDraw.Draw(img)
    top_bar(d, "Shadow CTO - final artifact")
    flat_box(d, (130,145,1790,900), PANEL, LINE, 26)
    d.text((180,195), "Reviewer-ready PR packet", fill=CYAN, font=F_H1)
    draw_text(d, (180,275), evidence["prPacket"]["title"], GREEN, F_H2, 1420)
    draw_text(d, (180,345), evidence["prPacket"]["summary"], MUTED, F_BODY, 1420)
    y = 465
    for item in evidence["prPacket"]["checklist"]:
        d.text((205,y), "+", fill=GREEN, font=F_H2)
        draw_text(d, (250,y+5), item, INK, F_BODY, 1320)
        y += 76
    rounded(d, (180,810,1020,870), (7,16,30), GREEN, 18)
    d.text((210,826), "One request in. Verified engineering evidence out.", fill=GREEN, font=F_BODY)
    return img

FINAL_BASE = final_base()

def final_frame(t):
    img = FINAL_BASE.copy()
    d = ImageDraw.Draw(img)
    cursor(d, lerp(1450, 850, min(1,t/12)), lerp(780, 840, min(1,t/12)))
    return img

def frame_at(sec):
    if sec < 15:
        return editor_frame(sec)
    if sec < 50:
        return terminal_frame(sec - 15)
    if sec < 108:
        return dashboard_frame(sec - 50)
    if sec < 130:
        return diff_frame(sec - 108)
    return final_frame(sec - 130)

cmd = [
    FFMPEG, "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", f"{W}x{H}",
    "-r", str(FPS),
    "-i", "-",
    "-vf", "format=yuv420p",
    "-r", "12",
    "-preset", "ultrafast",
    "-crf", "24",
    "-an",
    "-movflags", "+faststart",
    str(OUT),
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
total = DURATION * FPS
for n in range(total):
    sec = n / FPS
    img = frame_at(sec)
    proc.stdin.write(img.tobytes())
proc.stdin.close()
code = proc.wait()
if code != 0:
    raise SystemExit(code)
print(str(OUT))
`;

writeFileSync(renderScript, pyCode.replace("__FFMPEG__", ffmpegPath.replaceAll("\\", "\\\\")), "utf8");
execFileSync(py, [renderScript], { cwd: root, stdio: "inherit" });
