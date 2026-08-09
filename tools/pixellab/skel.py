#!/usr/bin/env python3
"""해골 **하나만** 제대로 굽는다 — 병수님: "해골만 제대로 만들고, 해골소환만 가능하도록.
한번에 여러개 다 만족스럽게 만들기 어려우니 하나만 제대로 만들고, 나머지도 잘만든 케이스를 참고하게".

**지금 해골이 왜 별로인가** (assets/minion/skel 을 8방향·6프레임으로 펼쳐 보고 찾은 것):

  1. **north(뒤통수)가 깨졌다** — 얼굴 없는 계란에 몸통만. 다른 일곱과 딴 놈이다.
  2. **attack 이 방향을 안 지킨다** — idle south 는 정면인데 attack/south 는 **옆모습**이다.
     게다가 **칼과 방패가 사라진다**. `cross-punch` 템플릿을 썼기 때문이다 —
     그건 맨주먹 동작이라 무기를 든 놈에게 씌우면 무기가 지워진다.
  3. **몸이 빈약하고 머리만 크다** — standard 모드(1생성)의 한계.

**그래서 이번엔 셋을 바꾼다:**

  · `mode="v3"` — 2~9생성, 8방향 고정, **품질이 제일 높다**(standard 는 1생성).
    "하나만 제대로" 라는 주문에 이게 맞는 답이다.
  · 공격은 **무기를 휘두르는** 동작을 v3 로 직접 적는다. 캔버스가 64px 이라
    방향당 1생성으로 감당된다(비용은 ceil(w·h·frames/65536)/방향).
  · 크기를 48 → 64 로. 작으면 갈비뼈도 칼도 뭉개진다.

    python3 tools/pixellab/skel.py           # 처음부터 끝까지(중간에 죽어도 이어서 돈다)
    python3 tools/pixellab/skel.py --show    # 상태만
"""
import base64, io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP   = os.path.join(HERE, "mcp_call.py")
STATE = os.path.join(HERE, "skel_state.json")
OUT   = os.path.join(ROOT, "assets", "minion", "skel")

SIZE = 64
DESC = ("dark gothic Diablo 2 dungeon character, grim medieval horror, "
        "desaturated palette of bone white, dried blood red, rusted iron and torch amber, "
        "heavy black shadows, "
        "a skeleton warrior raised by a necromancer: bare yellowed bone, visible ribcage, "
        "empty eye sockets glowing faint amber, gripping a short rusted sword in the right "
        "hand and a small round wooden shield on the left arm, lean and quick, "
        "full body standing, no background")

# 공격은 **무기를 든 채** 휘둘러야 한다. 그걸 말로 못박는다 —
# "keeps holding the sword and shield" 를 빼면 무기가 사라진 채 주먹질이 온다.
ATTACK = ("swings the rusted sword down and forward in a single overhead chop, "
          "shield arm braced in front, keeps holding the sword and the shield the whole time, "
          "body leans into the blow")

DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]


def mcp(tool, args, timeout=420):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)

def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text", "") for c in content(r) if c.get("type") == "text")
def load():  return json.load(open(STATE)) if os.path.exists(STATE) else {}
def save(s): json.dump(s, open(STATE, "w"), ensure_ascii=False, indent=1)

def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def create():
    s = load()
    if s.get("id"):
        print(f"이미 줄 세움 {s['id']}", flush=True); return s["id"]
    t = text_of(mcp("create_character", {
        "description": DESC, "name": "necro-skel-v3",
        "body_type": "humanoid", "mode": "v3", "n_directions": 8,
        "view": "low top-down", "size": SIZE,
        "outline": "single color outline", "detail": "high detail",
    }))
    m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", t)
    if not m:
        raise SystemExit(f"id 를 못 받음 — {t[:400]}")
    s["id"] = m.group(1); save(s)
    print(f"줄 세움 {s['id']}", flush=True)
    return s["id"]


def info(cid):
    return text_of(mcp("get_character", {"character_id": cid}))


def wait(cid, need=(), rounds=140):
    """익을 때까지 물어본다.

    ★ 판정을 `"completed" in t` 로 했다가 **아직 굽는 중인데 통과**시켰다(응답 어딘가에
    그 낱말이 있었다). 상태는 **줄 맨 앞의 `status:`** 로만 본다 — 본문 어디에 같은
    낱말이 있는지는 상태와 무관하다."""
    for i in range(rounds):
        t = info(cid)
        st = re.search(r"^status:\s*(\S+)", t, re.M)
        ok = bool(st) and st.group(1) == "completed" and all(n in t for n in need)
        if ok:
            return t
        if i % 4 == 0:
            print(f"  대기… {t.splitlines()[0][:70]}", flush=True)
        time.sleep(15)
    raise SystemExit("기다리다 지쳤다 — 나중에 다시 실행하면 이어서 돈다")


def queued(t):
    """**응답 본문을 읽고 성공을 확인한다.** 예전에 안 읽어서 애니 일곱이 조용히 안
    걸렸고, 이번에도 오류 응답을 받아 놓고 「걸었다」고 적어 뒀다.
    (v3 애니는 몸이 다 익기 전에는 못 건다 — 그 오류가 그대로 왔다.)"""
    if re.search(r"\berror\b|still being created|need \d+ job slots", t, re.I):
        return False
    return bool(re.search(r"\bjob|group|queued|already complete", t, re.I))


def animate(cid):
    s = load(); done = s.get("anim", {})
    if not done.get("walk"):
        t = text_of(mcp("animate_character", {
            "character_id": cid, "template_animation_id": "walking-6-frames",
            "animation_name": "walk"}))
        ok = queued(t)
        print(("walk 걸었다 → " if ok else "walk 실패 → ") + t[:220].replace("\n", " "), flush=True)
        if ok: done["walk"] = True; s["anim"] = done; save(s)
        time.sleep(3)
    if not done.get("attack"):
        t = text_of(mcp("animate_character", {
            "character_id": cid, "action_description": ATTACK,
            "animation_name": "attack", "mode": "v3",
            "frame_count": 6, "directions": DIRS}))
        ok = queued(t)
        print(("attack 걸었다 → " if ok else "attack 실패 → ") + t[:220].replace("\n", " "), flush=True)
        if ok: done["attack"] = True; s["anim"] = done; save(s)
    s = load()
    if not (s.get("anim", {}).get("walk") and s.get("anim", {}).get("attack")):
        raise SystemExit("애니를 다 못 걸었다 — 위 실패 사유를 보고 다시 실행할 것")


def collect(cid):
    """zip 으로 받는다. **개별 프레임 URL 에는 서명 토큰이 안 붙어 403 이 난다** —
    /download 엔드포인트에 Authorization 헤더로 받아야 한다."""
    url = f"https://api.pixellab.ai/mcp/characters/{cid}/download"
    req = urllib.request.Request(url, headers={"Authorization": auth()})
    raw = urllib.request.urlopen(req, timeout=300).read()
    zf = zipfile.ZipFile(io.BytesIO(raw))
    names = zf.namelist()
    os.makedirs(OUT, exist_ok=True)

    got = {"idle": 0, "walk": 0, "attack": 0}
    for n in names:
        low = n.lower()
        if low.endswith(".png") and "/rotations/" in low:
            d = os.path.basename(n)[:-4]
            if d in DIRS:
                open(os.path.join(OUT, d + ".png"), "wb").write(zf.read(n)); got["idle"] += 1
        elif low.endswith(".png") and "/animations/" in low:
            parts = n.split("/")
            try:
                gi = parts.index("animations")
                group, d, fn = parts[gi + 1], parts[gi + 2], parts[-1]
            except (ValueError, IndexError):
                continue
            g = "walk" if "walk" in group.lower() else "attack" if "attack" in group.lower() else None
            if not g or d not in DIRS:
                continue
            m = re.search(r"(\d+)", fn)
            if not m:
                continue
            dst = os.path.join(OUT, g, d)
            os.makedirs(dst, exist_ok=True)
            open(os.path.join(dst, str(int(m.group(1))) + ".png"), "wb").write(zf.read(n))
            got[g] += 1
    print(f"받음 — 정지 {got['idle']}장 · 걷기 {got['walk']}장 · 공격 {got['attack']}장", flush=True)
    return got


if __name__ == "__main__":
    if "--show" in sys.argv:
        s = load()
        print(json.dumps(s, ensure_ascii=False))
        if s.get("id"):
            print(info(s["id"])[:1200])
        sys.exit(0)

    cid = create()
    # ★ v3 애니는 **몸이 다 익은 뒤에만** 걸 수 있다(template 애니는 굽는 중에도 된다).
    #   그래서 반드시 먼저 기다린다.
    print("── 몸이 익기를 기다린다(v3 는 몇 분 걸린다)", flush=True)
    t = wait(cid)
    print("── 몸 완성. 애니를 건다", flush=True)
    animate(cid)
    print("── 애니가 익기를 기다린다", flush=True)
    wait(cid, need=("walk", "attack"))
    print("── 받는다", flush=True)
    got = collect(cid)
    print(f"══ 끝. {OUT}", flush=True)
