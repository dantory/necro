#!/usr/bin/env python3
"""**구울과 골렘**을 다시 굽는다 — 병수님: "소환수 에셋 별로임 다시 만드셈".

확대해 보고서야 얼마나 어긋났는지 알았다:

  · **구울**이 구울이 아니었다 — 해골 머리에 **빨간 티셔츠와 청바지**를 입은 사람.
    현대 옷차림이 통째로 들어왔다.
  · **골렘**이 흙 골렘이 아니었다 — **주황 머리에 흰·보라 갑옷**을 입은 날씬한
    SF 캐릭터. 「흙」도 「덩치」도 없다.

해골(assets/minion/skel)은 멀쩡하다. 그러니 **해골을 만든 방법을 그대로 따른다** —
tools/pixellab/skel.py 의 파이프라인(v3 · 8방향 · 64px · zip 수령)을 옮기고,
바뀌는 것은 **설명 세 줄**(생김새 · 걷기 · 공격)뿐이다.

**설명에서 배운 것 둘을 그대로 지킨다:**
  ① 템플릿 애니를 쓰지 않는다 — 맨몸 기준이라 손에 든 것이 사라진다.
     걷기·공격 모두 v3 로 **직접 적는다.**
  ② 원하지 않는 것을 **말로 막는다.** 앞 판이 티셔츠·청바지·갑옷·머리카락을
     들고 온 것은 「입히지 말라」를 안 적었기 때문이다.

받는 곳은 **스테이징**(assets/minion_v2/<이름>)이다 — 눈으로 보고 나서 갈아 낀다.

    python3 tools/pixellab/minion.py ghoul     # 하나씩(중간에 죽어도 이어서 돈다)
    python3 tools/pixellab/minion.py golem
    python3 tools/pixellab/minion.py ghoul --show
"""
import base64, io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP   = os.path.join(HERE, "mcp_call.py")

SIZE = 64
# 셋이 **한 화면에 같이 선다.** 그러니 팔레트 한 줄은 공유한다 — 이게 없으면
# 소환수마다 다른 게임에서 온 것처럼 보인다(해골에서 쓴 줄 그대로).
TONE = ("dark gothic Diablo 2 dungeon character, grim medieval horror, "
        "desaturated palette, heavy black shadows, "
        "full body standing, no background")
# 안 원하는 것을 **적어서 막는다.** 앞 판이 실패한 지점이 전부 여기였다.
NOPE = ("no modern clothing, no t-shirt, no jeans, no trousers, no sneakers, no boots, "
        "no hair, no helmet, no armour plates, no sci-fi, no bright colors, no text")

M = {
  # ── 구울 ── **물면 제 피가 찬다.** 그러니 「무는 것」이 생김새에 보여야 한다.
  "ghoul": dict(
    size=SIZE,
    desc=(f"{TONE}, bone white and rotting grey-green flesh, dried blood, "
          "a GHOUL: a hunched emaciated undead flesh-eater, naked grey-green rotting skin "
          "stretched over ribs, long bony arms hanging low, huge hooked claws on both hands, "
          "gaping lipless jaw crowded with teeth, sunken glowing eyes, "
          "only a few filthy rags around the waist, barefoot with clawed toes, "
          f"crouched forward ready to pounce, {NOPE}"),
    walk=("lopes forward hunched over on long arms, claws swinging low near the ground, "
          "head thrust forward, jerky hungry gait, stays hunched the whole time"),
    atk=("lunges forward and bites, jaw wide open, both clawed hands rake forward at the same "
         "time, body thrown into the lunge, stays hunched and clawed the whole time"),
  ),
  # ── 흙 골렘 ── **느리지만 앞을 막는다.** 그러니 덩치와 무게가 전부다.
  "golem": dict(
    size=SIZE,
    desc=(f"{TONE}, wet clay brown and grey river stone, damp earth, "
          "a CLAY GOLEM: a massive hulking figure crudely sculpted out of packed wet clay "
          "and embedded stones, enormously broad shoulders and huge heavy fists that reach "
          "the ground, tiny thick legs, no neck, a blunt faceless head with two dim glowing "
          "cracks for eyes, deep cracks and fingerprints all over the surface, "
          "clumps of earth and roots stuck to it, twice as wide as a man, "
          f"lumbering and slow, {NOPE}, no face, no weapon, not slim, not human"),
    walk=("lumbers forward very slowly, huge shoulders rolling side to side, "
          "heavy fists swinging low, feet pounding the ground, stays hulking the whole time"),
    # ★ 두 번 같은 자리에서 무너졌다 — **말로는 못 막는다**(2026-08-10).
    #   1판 "slams them straight down onto the ground, whole body drops with the blow"
    #   2판 위 문구에 "never bends over, never lies down, never falls" 를 덧대었다.
    #   결과가 **똑같았다**: 8방향 전부 f5~f6 에서 납작(bbox 종횡비 1.6~4.0).
    #   부정어가 안 먹는다 — 오히려 「눕는다」를 불러온 것으로 보인다. 그래서 방법을 바꾼다:
    #     ① 아래로 향하는 낱말을 **한 개도 안 쓴다**(down·overhead·slam·ground·drop 전부 제거).
    #        내려칠 데가 없으면 뒤 프레임이 몸통을 눕힐 벡터도 없다.
    #     ② 부정문을 **안 쓴다** — 눕는 그림을 말로 불러오지 않는다.
    #     ③ 타격을 **수평**으로 바꾼다(가슴 높이 양주먹 지르기). 골렘의 「막는 덩치」와도 맞는다.
    #     ④ frame_count 를 줄여 **무너질 꼬리 자체를 없앤다**(아래 ATK_FRAMES).
    atk=("thrusts both huge clay fists straight forward at chest height in a heavy double punch, "
         "arms extending horizontally in front of the massive body, shoulders squared forward, "
         "legs wide and straight, standing at full height in every frame, "
         "stays hulking and faceless the whole time"),
  ),
}

NAME = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
if NAME not in M:
    raise SystemExit(f"이름을 골라야 한다: {' '.join(M)}")
CFG   = M[NAME]
# 공격은 **뒤 프레임이 무너진다**(골렘 f5~f6, 그리고 예전 측면 공격 f6~f8). 살아남는
# 구간만 굽는다 — 실측으로 f0~f4 는 8방향 전부 멀쩡했다. 꼬리를 안 만들면 썩을 데도 없다.
# ★ frame_count 는 **4~16 사이 짝수**여야 한다(5 로 넣었다가 즉시 거절당했다).
#   6 을 넣으면 7 장(0~6)이 나왔으니, 4 는 5 장(0~4) — 살아남던 구간과 정확히 겹친다.
ATK_FRAMES = 4
SIZE  = CFG["size"]
DESC  = CFG["desc"]
WALK  = CFG["walk"]
ATTACK = CFG["atk"]
STATE = os.path.join(HERE, f"{NAME}_state.json")
# **스테이징에 받는다** — 보고 나서 갈아 낀다(파이프라인: 생성 → 스테이징 → 선택 → 적용)
OUT   = os.path.join(ROOT, "assets", "minion_v2", NAME)

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
        "description": DESC, "name": f"necro-{NAME}-v3",
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
        # 같은 이름의 그룹이 남아 있으면 zip 에 폴더가 겹치므로 먼저 지운다
        try:
            mcp("delete_animation", {"character_id": cid, "animation_group_id": "walk",
                                     "confirm": True})
        except Exception:
            pass
        t = text_of(mcp("animate_character", {
            "character_id": cid, "action_description": WALK,
            "animation_name": "walk", "mode": "v3",
            "frame_count": 6, "directions": DIRS}))
        ok = queued(t)
        print(("walk 걸었다 → " if ok else "walk 실패 → ") + t[:220].replace("\n", " "), flush=True)
        if ok: done["walk"] = True; s["anim"] = done; save(s)
        time.sleep(3)
    if not done.get("attack"):
        # walk 과 같은 이유 — 남은 그룹이 있으면 zip 안에서 폴더가 겹친다
        try:
            mcp("delete_animation", {"character_id": cid, "animation_group_id": "attack",
                                     "confirm": True})
        except Exception:
            pass
        t = text_of(mcp("animate_character", {
            "character_id": cid, "action_description": ATTACK,
            "animation_name": "attack", "mode": "v3",
            "frame_count": ATK_FRAMES, "directions": DIRS}))
        ok = queued(t)
        print(("attack 걸었다 → " if ok else "attack 실패 → ") + t[:220].replace("\n", " "), flush=True)
        if ok: done["attack"] = True; s["anim"] = done; save(s)
    s = load()
    if not (s.get("anim", {}).get("walk") and s.get("anim", {}).get("attack")):
        raise SystemExit("애니를 다 못 걸었다 — 위 실패 사유를 보고 다시 실행할 것")


def collect(cid, tries=40):
    """zip 으로 받는다. **개별 프레임 URL 에는 서명 토큰이 안 붙어 403 이 난다** —
    /download 엔드포인트에 Authorization 헤더로 받아야 한다.

    ★ 상태가 completed 여도 **아직 굽는 중이면 423 Locked** 가 온다. get_character 의
    본문에 "walk"·"attack" 이 보이는 것만으로는 다 익었다는 뜻이 아니다(그 낱말은
    쓸 수 있는 템플릿 목록에도 있다). **상태를 믿지 말고 산출물로 판단한다** —
    받아질 때까지 기다렸다 다시 받는다."""
    url = f"https://api.pixellab.ai/mcp/characters/{cid}/download"
    raw = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"Authorization": auth()})
            raw = urllib.request.urlopen(req, timeout=300).read()
            break
        except urllib.error.HTTPError as e:
            if e.code != 423:
                raise
            if i % 4 == 0:
                print(f"  아직 굽는 중(423) — {i * 20}초째", flush=True)
            time.sleep(20)
    if raw is None:
        raise SystemExit("계속 잠겨 있다 — 나중에 다시 실행할 것")
    zf = zipfile.ZipFile(io.BytesIO(raw))
    names = zf.namelist()
    os.makedirs(OUT, exist_ok=True)

    # ★ zip 은 **지금까지 건 애니를 전부** 담고 온다(2026-08-10 골렘 3판: attack 그룹이
    #   3 개, 방향당 7+7+5=19 장). 앞서 delete_animation 이 놓친 그룹이 남으면 그렇다.
    #   ① 그룹별로 먼저 갈라 담고, ② **이번에 주문한 장수와 맞는 그룹**만 고른다.
    #   ③ 쓰기 전에 폴더를 비운다 — 안 비우면 지난 판의 뒤 프레임이 살아남아
    #      「고쳤는데 그대로」로 보인다(3판이 실제로 그렇게 오판정됐다).
    want = {"walk": 7, "attack": ATK_FRAMES + 1}
    buckets = {}          # (g, group) -> [(dir, idx, name)]
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
            buckets.setdefault((g, group), []).append((d, int(m.group(1)), n))

    for g in ("walk", "attack"):
        cand = {grp: items for (gg, grp), items in buckets.items() if gg == g}
        if not cand:
            continue
        def per_dir(items):
            c = {}
            for d, _, _ in items:
                c[d] = c.get(d, 0) + 1
            return max(c.values()) if c else 0
        if len(cand) > 1:
            print(f"  ⚠ {g} 그룹이 {len(cand)}개 왔다: "
                  + ", ".join(f"{k}({per_dir(v)}장/방향)" for k, v in cand.items()), flush=True)
        pick = next((k for k, v in cand.items() if per_dir(v) == want[g]), None)
        if pick is None:
            pick = max(cand, key=lambda k: per_dir(cand[k]))
            print(f"  ⚠ {g}: 주문한 {want[g]}장짜리 그룹이 없다 — {pick} 로 간다", flush=True)
        for d in DIRS:                      # 지난 판 찌꺼기를 남기지 않는다
            dst = os.path.join(OUT, g, d)
            if os.path.isdir(dst):
                for f in os.listdir(dst):
                    if f.endswith(".png"):
                        os.remove(os.path.join(dst, f))
        for d, i, n in cand[pick]:
            dst = os.path.join(OUT, g, d)
            os.makedirs(dst, exist_ok=True)
            open(os.path.join(dst, f"{i}.png"), "wb").write(zf.read(n))
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
