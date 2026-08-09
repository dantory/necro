#!/usr/bin/env python3
"""야영지 소품 **3차** — 두 번 틀린 것은 값이 아니라 **주문**이 문제다.

2차에서 일곱 중 셋이 또 틀렸다(hay·wall_c·bedroll). hay 는 두 번 연속이다.
2차 주문은 이미 충분히 구체적이었는데("바닥에 쌓인 둔덕, 아무것도 담지 않은")
그런데도 **초가집**이 나왔다. 주문을 더 자세히 쓰는 길은 이미 막혔다.

★★ 진짜 원인은 주문 본문이 아니라 **모두가 공유하는 TONE** 이었다.

    TONE = "... desaturated grey stone and grey-brown wood ..."

  이 한 줄이 그림마다 **회색 돌과 나무를 내놓으라고 요구한다.** 짚 더미에는
  돌도 나무도 없다. 그래서 모델은 요구를 만족시키려고 **짚 옆에 돌집을 세운다.**
  잠자리(bedroll)도 같다 — 땅에 깔린 천에는 돌이 없으니 **돌바닥을 깔고**
  이어서 벽과 문까지 세웠다. 두 실패가 같은 뿌리다.

  1차에서 「부정어보다 긍정어가 세다」를 배웠는데, **TONE 도 긍정어다.**
  NEG 에 building 을 아무리 넣어도 TONE 이 돌을 부르면 돌이 이긴다.

  → 돌도 나무도 없는 물건은 **재질 구절을 뺀 TONE** 을 쓴다(TONE_SOFT).

★ 두 번째 원인은 **캔버스 모양**이다. 96x88·112x80 처럼 정사각에 가까우면
  위쪽에 빈자리가 남고, 모델은 그 자리를 **지붕과 벽으로 채운다.**
  바닥에 깔리는 물건은 **납작하고 넓게**(120x72, 120x64) 잡아 세울 자리를 없앤다.

★ wall_c 는 **접는다.** 두 번 구웠고 두 번 다 담이 아니었다(1차 조각조각,
  2차 벽돌 띠 한 줄). wall_a 가 이미 그 일을 제대로 한다 — 없는 자리를 메우려고
  같은 것을 세 번 굽는 건 낭비다. 대신 야영지에 **없는 것**을 채운다:
  숫돌(연장을 간다)과 덮개 씌운 짐더미(쟁여 둔 살림).

  python3 tools/pixellab/camp_night3.py           # 아직 없는 것만
  python3 tools/pixellab/camp_night3.py --force   # 전부 다시
"""
import base64, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "assets", "camp")
URL  = "https://api.pixellab.ai/v1/generate-image-pixflux"

# 돌·나무가 실제로 있는 물건용 — 2차와 같다
TONE = ("Diablo 2 dark fantasy pixel art, desaturated grey stone and grey-brown wood, "
        "worn weathered makeshift, grim gothic, seen from above at an angle")
# ★ 돌도 나무도 없는 물건용 — **재질 구절을 뺐다.** 이게 이번 3차의 핵심이다.
TONE_SOFT = ("Diablo 2 dark fantasy pixel art, desaturated muted earth colours, "
             "worn weathered makeshift, grim gothic, seen from above at an angle, "
             "one small isolated object alone on empty transparent background")

# ★ 2차 NEG 에 **돌바닥·초가지붕·오두막**을 더한다 — bedroll 이 깔고 앉은 것들이다
NEG  = ("building, house, hut, cottage, shed, doorway, arch, gate, entrance, window, "
        "thatched roof, roof, wall behind, walls, interior, room, ruin, ruins, "
        "stone floor, flagstones, cobblestones, paving, floor tiles, platform, base, "
        "barrel, cask, basket, crate, chest, container, "
        "moss, lichen, grass, plants, vegetation, leaves, green, "
        "ground, terrain, fire, flame, glow, light rays, "
        "character, person, people, text, frame, border, multiple copies, grid, tiling")

OBJ = {
  # ── 두 번 틀린 둘, 재질 구절을 빼고 납작하게 ──
  # ★ 96x88(거의 정사각) → 120x72(납작) : 지붕을 세울 자리를 없앤다
  "hay":       (TONE_SOFT,
                "a low wide heap of loose dry golden straw dumped on bare dirt, "
                "a flattened rounded mound wider than it is tall, loose wisps poking "
                "out of the sides, completely bare straw and nothing else", 120, 72),
  # ★ 112x80 → 120x64 : 땅에 깔린 것이니 높이를 아예 준다
  "bedroll":   (TONE_SOFT,
                "two rolled up wool blankets tied with cord lying flat on bare dirt, "
                "one of them unrolled into a flat sleeping mat beside them, "
                "seen from above, flat on the ground, nothing standing up", 120, 64),
  # ── wall_c 를 접고 그 자리에 야영지에 없던 둘 ──
  "grindstone": (TONE,
                "a round grey sandstone sharpening wheel mounted in a wooden frame "
                "with a crank handle, a bucket of water at its foot", 96, 104),
  "tarp":      (TONE,
                "a stack of supplies covered by a sagging grey canvas sheet roped down "
                "at the corners, the shape of crates showing under the cloth", 128, 88),
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
    # ★ 고쳐 굽는 둘은 파일이 **이미 있다**(2차 실패작). --force 없이도 덮어야 한다.
    REBAKE = ("hay", "bedroll")
    for k, (tone, desc, w, h) in OBJ.items():
        if only and k not in only:
            continue
        dst = os.path.join(OUT, k + ".png")
        if os.path.exists(dst) and not force and k not in REBAKE:
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
