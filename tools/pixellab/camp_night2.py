#!/usr/bin/env python3
"""야영지 소품 **2차** — 1차에서 버린 셋을 고쳐 다시 굽고, 「사람이 산다」를 더한다.

1차(camp_night.py) 열둘 중 셋을 버렸다. 로그는 셋 다 「받음」이었다 —
**합성 시트로 눈으로 봐야 걸린다.** 왜 틀렸는지를 적어 둔다:

  · hay     「a bale of dry straw」→ 돌벽 안에 통이 박혀 나왔다.
            bale(더미를 묶은 것)을 **용기**로 읽었다. 이제 모양을 직접 그린다:
            바닥에 쌓인 둔덕. 그리고 통·바구니·벽을 NEG 로 막는다
  · wall_c  192x80 은 **너무 납작해서** 담이 조각조각 흩어졌다. 폭을 줄이고
            「끊기지 않은 한 줄」을 못박는다
  · boulder 「lichen stained」가 화근이었다 — **주문에 이끼를 적어 놓고**
            초록이 왜 나왔냐고 했다. 야영지는 마른 땅이다. 이끼를 뺀다

★ NEG 는 1차보다 세다: 통·바구니·이끼·초록·폐허·문을 다 막는다.
  1차 NEG 에 doorway/arch 가 있었는데도 boulder 가 문을 만들었다 —
  **부정어보다 긍정어가 세다.** 그래서 본문에서도 「구멍 없는 통짜」라고 적는다.

  python3 tools/pixellab/camp_night2.py           # 아직 없는 것만
  python3 tools/pixellab/camp_night2.py --force   # 전부 다시
"""
import base64, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "assets", "camp")
URL  = "https://api.pixellab.ai/v1/generate-image-pixflux"

TONE = ("Diablo 2 dark fantasy pixel art, desaturated grey stone and grey-brown wood, "
        "worn weathered makeshift, grim gothic, seen from above at an angle")
# ★ 1차보다 세게 — 통(hay 를 망친 것)·이끼와 초록(boulder 를 망친 것)을 막는다
NEG  = ("building, house, doorway, arch, gate, entrance, window, roof over a room, "
        "interior, ruin, ruins, barrel, cask, basket, crate, container, "
        "moss, lichen, grass, plants, vegetation, leaves, green, "
        "floor tiles, paving, ground, terrain, fire, flame, glow, light rays, "
        "character, person, people, text, frame, border, multiple copies, grid, tiling")

OBJ = {
  # ── 1차에서 버린 셋, 고쳐서 ──
  "hay":      ("a loose mound of dry golden-brown straw heaped directly on the ground, "
               "a rounded pile, wisps sticking out of it, nothing holding it", 96, 88),
  "wall_c":   ("one continuous unbroken run of rough grey fieldstones stacked without "
               "mortar into a solid knee-high wall, a single piece from end to end, "
               "the top uneven", 160, 96),
  "boulder":  ("one single massive smooth rounded grey granite boulder resting on dry dirt, "
               "solid stone with no openings, dry and bare, a crack across it", 128, 104),
  # ── 「사람이 산다」를 더한다 — 잠자리·끼니·채비 ──
  "bedroll":  ("two rolled grey wool blankets laid side by side on the bare ground, "
               "one unrolled flat, a leather satchel beside them", 112, 80),
  "cookpot":  ("a black iron cooking pot hanging by a hook from a tripod of three lashed "
               "wooden poles, the pot empty and cold", 104, 112),
  "wrack":    ("a wooden weapon rack holding three spears upright and a battered round "
               "shield leaning against its foot", 112, 128),
  "dryrack":  ("a wooden drying frame of lashed poles with strips of cloth and hide "
               "hanging from the crossbar", 128, 120),
}


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def gen(desc, w, h):
    body = {"description": f"{TONE}, {desc}",
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
    for k, (desc, w, h) in OBJ.items():
        if only and k not in only:
            continue
        dst = os.path.join(OUT, k + ".png")
        # ★ 고쳐 굽는 셋은 파일이 **이미 있다**(1차 실패작). --force 없이도 덮어야 한다.
        if os.path.exists(dst) and not force and k not in ("hay", "wall_c", "boulder"):
            print(f"이미 있음 {k}", flush=True); continue
        for attempt in range(3):
            try:
                open(dst, "wb").write(gen(desc, w, h))
                print(f"받음 {k} ({w}x{h})", flush=True); break
            except urllib.error.HTTPError as e:
                print(f"실패 {k} — {e.code} {e.read().decode()[:160]}", flush=True)
                if e.code < 500: break
                time.sleep(20)
            except Exception as e:
                print(f"실패 {k} — {type(e).__name__} {str(e)[:120]}", flush=True)
                time.sleep(20)
    print("══ 끝", flush=True)
