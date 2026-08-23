#!/usr/bin/env python3
"""**웨이포인트 돌** — V-3(지나온 구역을 골라 다시 들어간다)의 «표».

마을 한복판에 세울 표석이다. 디아블로 2 의 웨이포인트는 **돌로 된 받침 위에
반원으로 둘러선 새김돌**이고, 그 한가운데가 **푸르게** 빛난다. 그 빛이
「여기서 다른 데로 간다」를 말한다 — 돌만 있으면 그냥 폐허다.

★ 야영지 소품(camp_night*.py)의 NEG 를 그대로 쓰면 안 된다 — 거기엔
  `arch, gate, entrance, glow, light rays` 가 들어 있는데, 표석은 **그 셋이
  바로 필요한 것**이다([[carry-fixes-forward]] 의 반대편 — 옮길 것과 옮기면
  안 되는 것을 가른다).
★ 대신 camp 3차의 교훈은 가져온다: **캔버스가 정사각에 가까우면 모델이 남는
  자리에 건물을 세운다.** 표석은 세로로 선 물건이니 세로로 길게 잡는다.

세 벌을 굽고 **눈으로 고른다**(로그만 보고 넣으면 셋 다 들어간다 — camp 2차).

  python3 tools/pixellab/waypoint.py           # tmp/wp/ 에 후보 셋
  python3 tools/pixellab/waypoint.py --force
"""
import base64, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "tmp", "wp")
URL  = "https://api.pixellab.ai/v1/generate-image-pixflux"

TONE = ("Diablo 2 dark fantasy pixel art, desaturated grey carved stone, "
        "worn weathered ancient, grim gothic, seen from above at an angle, "
        "one small isolated structure alone on empty transparent background")

# ★ arch·glow 를 **빼지 않은** NEG — 표석에는 그 둘이 필요하다
NEG = ("building, house, hut, cottage, roof, window, interior, room, "
       "stone floor, flagstones, cobblestones, paving, floor tiles, "
       "ground, terrain, grass, plants, vegetation, green, "
       "character, person, people, text, letters, numbers, "
       "frame, border, multiple copies, grid, tiling")

OBJ = {
  # ① D2 결 그대로 — 반원으로 둘러선 새김돌 + 한가운데 푸른 빛
  "wp_a": (TONE,
           "an ancient waypoint shrine: five tall narrow carved stone slabs standing "
           "in a half circle on a low round stone dais, glowing pale blue arcane light "
           "hovering between them, faint blue runes cut into the stone", 104, 128),
  # ② 하나로 선 오벨리스크 — 좁은 화면에서도 안 뭉갠다
  "wp_b": (TONE,
           "a single tall weathered stone obelisk on a small square stone base, "
           "a glowing pale blue rune carved into its face, thin blue light seeping "
           "from the carved lines", 80, 128),
  # ③ 문틀 결 — 「다른 데로 간다」가 제일 곧게 읽힌다
  "wp_c": (TONE,
           "a freestanding weathered stone doorway arch with no building behind it, "
           "carved pillars on both sides, a shimmering pale blue portal filling the "
           "opening", 112, 128),
}


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def gen(tone, desc, w, h):
    body = {"description": f"{tone}, {desc}",
            "negative_description": NEG,
            "image_size": {"width": w, "height": h},
            "no_background": True,
            "outline": "single color outline",
            "shading": "detailed shading",
            "detail": "highly detailed"}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                                 headers={"Authorization": auth(),
                                          "Content-Type": "application/json"})
    return base64.b64decode(json.load(urllib.request.urlopen(req, timeout=300))["image"]["base64"])


if __name__ == "__main__":
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    os.makedirs(OUT, exist_ok=True)
    for k, (tone, desc, w, h) in OBJ.items():
        if only and k not in only:
            continue
        dst = os.path.join(OUT, k + ".png")
        if os.path.exists(dst) and not force:
            print(f"이미 있음 {k}", flush=True); continue
        for attempt in range(3):
            try:
                open(dst, "wb").write(gen(tone, desc, w, h))
                print(f"받음 {k} ({w}x{h})", flush=True); break
            except urllib.error.HTTPError as e:
                print(f"실패 {k} — {e.code} {e.read().decode()[:160]}", flush=True)
                if e.code < 500: break
                time.sleep(20)
            except Exception as e:
                print(f"실패 {k} — {type(e).__name__} {str(e)[:120]}", flush=True)
                time.sleep(20)
    print("══ 끝", flush=True)
