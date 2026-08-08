#!/usr/bin/env python3
"""걷기·공격 프레임을 PixelLab 로 굽는다.

    python3 tools/pixellab/anim.py skel           # 한 종류
    python3 tools/pixellab/anim.py --all          # 전부

**한 장을 흔드는 것은 대역이다.** 지금 화면의 걸음은 코드로 낸 흉내(바운스·기울임·반전)고,
진짜 걷기는 프레임이 있어야 한다. create_character → animate_character(template) →
get_character 의 download 링크 → zip 순서로 굽고 `assets/mob/<id>/walk/<n>.png` 로 푼다.

**여기서 두 번 데였다. 둘 다 "조용히 잘못된 채로 진행"이었다:**
  1. `size` 를 dict 로 보냈더니 MCP 가 검증 오류를 돌려줬는데, 헬퍼가 `isError` 를 안 봐서
     그대로 통과했다 — character_id 가 None 이 되어 다운로드 URL 이 `/characters/None/`,
     결국 404 였다. **오류 응답을 반드시 예외로 올린다.**
  2. 다운로드 URL 을 손으로 조립하고 있었다. `get_character` 가 `download:` 줄로 알려 주므로
     **응답에서 읽는다** — 주소 규칙이 바뀌어도 안 깨진다.
응답은 JSON 이 아니라 **사람이 읽는 텍스트**다(`status: completed`, `download: https://…`).
"""
import base64, io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")

# rtd 에서 이 길이 막혔던 이유는 그쪽 적이 **탑다운**이었기 때문이다 — PixelLab 의
# 캐릭터 애니는 서 있는 몸을 전제해서, 위에서 본 그림을 넣으면 스프라이트가 일어서 버렸다.
# necro 는 처음부터 **옆모습**으로 구웠으므로 시점이 맞는다.
TONE = ("side view profile, dark gothic Diablo 2 dungeon art, grim medieval horror, "
        "desaturated bone white, dried blood red, rusted iron, heavy black shadows")
DESC = {
    # 소환수 — assets/minion/<id>.png 를 참조로 쓴다
    "minion/skel":  "skeleton warrior of bare yellowed bone with a short rusted sword and round shield",
    "minion/ghoul": "hunched ghoul with grey rotting flesh and long claws, mouth open",
    "minion/golem": "massive clay golem of cracked earth and stone with glowing orange fissures",
    # 적 — assets/mob/<id>.png
    "mob/fallen":   "small hunched imp-like fallen demon with a crude curved dagger, red skin",
    "mob/zombie":   "shambling rotted zombie with torn flesh and dangling arms, grey green skin",
    "mob/skelarch": "armoured skeleton archer with a short bow and tattered cloak",
    "mob/brute":    "hulking horned demon brute with thick shoulder armour and a heavy axe",
}
SIZE = {"minion/golem": 96, "mob/brute": 64}
# **걷기는 템플릿, 공격은 v3.** 템플릿은 방향당 1회 생성이라 싸고 결과가 안정적이다.
# 공격은 종류마다 동작이 달라야 하므로(칼을 휘두르는 것과 주먹을 내리찍는 것) 설명으로 간다.
TEMPLATE = "walking-4-frames"
ATTACK = {
    "minion/skel":  "swinging a short sword forward in a quick horizontal slash",
    "minion/ghoul": "lunging forward and raking with both claws",
    "minion/golem": "raising both massive arms and slamming them down",
    "mob/fallen":   "stabbing forward with a curved dagger",
    "mob/zombie":   "swiping forward with a heavy dangling arm",
    "mob/skelarch": "drawing a bow and loosing an arrow forward",
    "mob/brute":    "raising a heavy axe overhead and chopping down",
}


def mcp(tool, args, timeout=300):
    """MCP 를 한 번 부른다. **오류는 예외로 올린다** — 조용히 통과하면 뒤에서 404 가 난다."""
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 프로세스 실패: {r.stderr[:300]}")
    d = json.loads(r.stdout)
    res = d.get("result", d)
    if res.get("isError"):
        raise RuntimeError(f"{tool} 에러: {res['content'][0]['text'][:400]}")
    c = res.get("content") or []
    return c[0]["text"] if c and c[0].get("type") == "text" else json.dumps(res)


def wait_body(cid, tries=80, gap=12):
    """몸이 다 구워질 때까지."""
    for _ in range(tries):
        t = mcp("get_character", {"character_id": cid})
        if (re.search(r"status:\s*(\S+)", t) or [None, "?"])[1] == "completed":
            return t
        time.sleep(gap)
    raise RuntimeError("몸 굽기가 안 끝남")


def wait_anim(cid, tries=80, gap=12):
    """**애니메이션은 몸과 별개 잡이다.** `status: completed` 인데도 `pending jobs` 가 돌고
       있고, 그 사이 zip 을 받으면 423 Locked 가 난다(실제로 그렇게 실패했다).
       `pending jobs` 가 사라지고 `animations:` 에 무언가 실릴 때까지 기다린다."""
    for _ in range(tries):
        t = mcp("get_character", {"character_id": cid})
        if "pending jobs" not in t and "animations: none" not in t:
            return t
        time.sleep(gap)
    raise RuntimeError("애니메이션 잡이 안 끝남")


def queue_body(kind):
    """몸을 줄 세운다. **기존 그림을 참조로 넣어 회전만 시킨다** — 설명만 주면
       PixelLab 이 제 마음대로 다른 놈을 그려서 지금 얼굴이 통째로 바뀐다."""
    n = SIZE.get(kind, 64)
    ref = os.path.join(ROOT, "assets", f"{kind}.png")
    b64 = base64.b64encode(open(ref, "rb").read()).decode() if os.path.exists(ref) else None
    args = {"description": f"{TONE}, {DESC[kind]}", "view": "side",
            "outline": "single color outline", "detail": "high detail"}
    if b64:
        args.update({"reference_image_base64": b64, "mode": "v3"})
    else:
        args.update({"size": n, "shading": "medium shading", "n_directions": 4})
    t = mcp("create_character", args)
    m = re.search(r"id:\s*([0-9a-f-]{36})", t)
    if not m:
        raise RuntimeError(f"character_id 를 못 읽음: {t[:200]}")
    return m.group(1)


def pull(kind, cid, anim, out_name):
    """다 구워진 캐릭터에서 그 애니메이션 프레임을 꺼내 `assets/<kind>/<out_name>/N.png` 로 푼다."""
    t = mcp("get_character", {"character_id": cid})
    dl = re.search(r"download:\s*(\S+)", t)
    if not dl:
        raise RuntimeError(f"download 링크가 없음: {t[:300]}")
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    auth = cfg["mcp"]["pixellab"]["headers"]["Authorization"]
    blob = urllib.request.urlopen(
        urllib.request.Request(dl.group(1), headers={"Authorization": auth}), timeout=300).read()
    out = os.path.join(ROOT, "assets", kind, out_name)
    os.makedirs(out, exist_ok=True)
    saved = 0
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        # zip 안 경로는 `<이름>/animations/<그룹>/<방향>/frame_000.png` 다.
        # 방향은 south 하나만 쓴다 — 화면에서 좌우 반전으로 방향을 내고 있다.
        names = sorted(x for x in z.namelist()
                       if x.endswith(".png") and "/animations/" in x and "/south/" in x
                       and f"/{anim}/" in x)
        if not names:      # 그룹 이름이 다르면(템플릿은 'animating') 남은 것으로 간다
            names = sorted(x for x in z.namelist()
                           if x.endswith(".png") and "/animations/" in x and "/south/" in x)
        for i, nm in enumerate(names):
            open(os.path.join(out, f"{i}.png"), "wb").write(z.read(nm)); saved += 1
    return saved


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    kinds = [k for k in DESC if not args or any(a in k for a in args)]

    # ══ 1. 몸을 **전부 한꺼번에** 줄 세운다 ══
    #    하나씩 굽고 기다리면 일곱 종이 일곱 배 걸린다(35분). 줄 세우고 나서 기다리면 한 번이다.
    ids = {}
    for k in kinds:
        try:
            ids[k] = queue_body(k); print(f"몸 줄 세움 {k} {ids[k][:8]}", flush=True)
        except Exception as e:
            print(f"몸 실패 {k} — {e}", flush=True)
        time.sleep(1.5)

    # ══ 2. 몸이 다 익으면 걷기·공격을 붙인다 ══
    for k, cid in list(ids.items()):
        try:
            wait_body(cid)
            mcp("animate_character", {"character_id": cid, "template_animation_id": TEMPLATE})
            print(f"걷기 붙임 {k}", flush=True)
        except Exception as e:
            print(f"걷기 실패 {k} — {e}", flush=True); ids.pop(k, None)
        time.sleep(1.2)

    for k, cid in list(ids.items()):
        try:
            wait_anim(cid)
            n = pull(k, cid, "animating", "walk")
            print(f"걷기 {n}프레임 {k}", flush=True)
        except Exception as e:
            print(f"걷기 받기 실패 {k} — {e}", flush=True)

    # 공격 — 걷기를 다 받은 뒤에 붙인다(zip 이 통째로 오므로 섞이면 못 가른다)
    for k, cid in list(ids.items()):
        try:
            mcp("animate_character", {"character_id": cid, "mode": "v3",
                                      "action_description": ATTACK[k],
                                      "animation_name": "attack", "frame_count": 4})
            print(f"공격 붙임 {k}", flush=True)
        except Exception as e:
            print(f"공격 실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    time.sleep(90)
    for k, cid in list(ids.items()):
        try:
            n = pull(k, cid, "attack", "attack")
            print(f"공격 {n}프레임 {k}", flush=True)
        except Exception as e:
            print(f"공격 받기 실패 {k} — {e}", flush=True)
    print("— 끝")
