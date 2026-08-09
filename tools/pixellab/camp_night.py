#!/usr/bin/env python3
"""야영지 소품을 **밤새 채운다** — 병수님: "밤새 야영지 디테일하게 잘 만들어놔라".

준 D2 로그 야영지 화면에서 눈에 띄는 것들을 하나씩 세어 목록으로 만들었다.
지금 마을에 있는 것(통·궤짝·수레·우물·좌판·대장간)은 「장터」의 어휘고,
저 화면을 야영지로 만드는 것은 **머무는 흔적**이다:

  천막 · 낮은 돌담 · 장대 횃불 · 지붕만 있는 헛간 · 짐수레 · 통나무 더미 ·
  마른 나무 · 바위 · 말뚝 울 · 여물통 · 깃대 · 모닥불 자리

★ 생성기는 **pixflux**(REST). create_map_object 는 이 결의 물건을 죄다 「장면」으로
그린다(문 달린 벽·불 피운 실내). 확인된 스키마 함정 둘:
  · `detail` 은 'highly detailed' — 'high detail' 은 422 (도구마다 허용값이 다르다)
  · `no_background:true` 를 빼면 배경이 통째로 박혀 나온다

  python3 tools/pixellab/camp_night.py           # 아직 없는 것만
  python3 tools/pixellab/camp_night.py --force   # 전부 다시
"""
import base64, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "assets", "camp")
URL  = "https://api.pixellab.ai/v1/generate-image-pixflux"

TONE = ("Diablo 2 dark fantasy pixel art, desaturated grey stone and grey-brown wood, "
        "worn weathered makeshift, grim gothic, seen from above at an angle")
NEG  = ("building, house, doorway, arch, gate, roof over a room, interior, floor tiles, "
        "paving, ground, terrain, grass field, fire, flame, glow, light rays, "
        "character, person, people, text, frame, border, multiple copies, grid, tiling")

OBJ = {
  # ── 머무는 흔적 ──
  "tent_a":   ("a small tent of patched grey canvas stretched over a wooden frame, "
               "guy ropes pegged out, the flap tied open", 144, 128),
  "tent_b":   ("a lean-to shelter of canvas stretched from two poles, one side open, "
               "a bedroll underneath", 144, 112),
  "wagon":    ("a wooden supply wagon with iron-rimmed wheels and a canvas cover over "
               "hoops, one wheel leaning", 176, 128),
  "trough":   ("a long wooden water trough on stone blocks, planks warped, water inside", 128, 72),
  "hay":      ("a bale of dry straw tied with rope, loose straw falling from it", 96, 80),
  "banner":   ("a tall wooden pole with a tattered cloth banner hanging from a crossbar, "
               "the cloth frayed at the bottom", 80, 176),
  # ── 돌과 나무 ──
  "wall_c":   ("a long low wall of rough grey fieldstones stacked without mortar, "
               "knee high, uneven top, one end crumbled", 192, 80),
  "palisade": ("a short section of palisade fence made of sharpened logs lashed together, "
               "both ends cut off", 160, 112),
  "stump":    ("a wide tree stump with an axe buried in it, wood chips around", 96, 72),
  "tree":     ("a bare dead tree with twisted branches, no leaves, grey bark", 160, 200),
  "boulder":  ("two weathered grey boulders leaning together, cracked and lichen stained",
               128, 96),
  "firepit":  ("a ring of blackened stones with cold grey ash and charred wood inside, "
               "no flame", 104, 80),
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
        if os.path.exists(dst) and not force:
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
