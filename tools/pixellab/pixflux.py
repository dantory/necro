#!/usr/bin/env python3
"""작은 소품은 **pixflux(REST)** 로 굽는다.

★★ `create_map_object` 는 야영지 소품에서 두 번 다 **장면**을 그렸다 — 「무릎 높이
돌담」이 문 달린 벽이 되고, 「통나무 더미」가 불 피운 실내가 됐다. 「건물 아님·불
아님」을 문장으로 못박은 2차는 오히려 캐릭터까지 넣어 왔다. 그 도구는 **맵 오브젝트
= 작은 건축물**로 이해한다.

pixflux 는 **한 장짜리 스프라이트** 생성기라 「그 물건 하나」에 가깝다. 대신
스키마가 다르다 — `detail`/`no_background` 같은 열쇠를 넣으면 **422** 다.
★ 422 의 범인은 `no_background` 가 아니라 **`detail` 값**이었다 — 이 도구는
`'low detail' | 'medium detail' | 'highly detailed'` 만 받는다(create_map_object 는
`high detail`). **열쇠 이름이 같아도 허용값은 도구마다 다르다** — 세 번째로 밟았다.
`no_background:true` 를 안 넣으면 **배경이 통째로 박혀 나온다**(1차가 그랬다).

  python3 tools/pixellab/pixflux.py            # 아직 없는 것만
"""
import base64, json, os, sys, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "assets", "camp")
URL  = "https://api.pixellab.ai/v1/generate-image-pixflux"

TONE = ("Diablo 2 dark fantasy pixel art, desaturated grey and brown, "
        "worn and weathered, grim gothic")
NEG  = ("building, house, door, doorway, arch, gate, roof, room, interior, floor tiles, "
        "fire, flame, torch light, glow, character, person, people, text, frame, border, "
        "ground, terrain, grass field, multiple objects, grid")

OBJ = {
  "wall_a": ("a short straight section of low dry-stone wall, rough grey fieldstones stacked "
             "without mortar, knee high, both ends broken off, seen from above at an angle",
             160, 80),
  "wall_b": ("a crumbling corner piece of a low dry-stone wall, half collapsed with fallen "
             "stones at its foot, seen from above at an angle", 128, 96),
  "logs":   ("a stack of cut logs piled crosswise with bark still on them, "
             "seen from above at an angle", 112, 80),
  "shrub":  ("a low dry thorny bush with bare twisted branches and a few brown leaves, "
             "muted olive brown, seen from above at an angle", 88, 80),
  "rock":   ("a single large weathered grey boulder half sunk into nothing, cracked surface, "
             "seen from above at an angle", 96, 80),
}


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def gen(desc, w, h):
    body = {"description": f"{TONE}, {desc}",
            "negative_description": NEG,
            "image_size": {"width": w, "height": h},
            "no_background": True,                 # ★ 이거 없으면 배경이 박힌다
            "outline": "single color outline",
            "shading": "detailed shading",
            "detail": "highly detailed"}           # ★ 'high detail' 은 422
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                                 headers={"Authorization": auth(),
                                          "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    return base64.b64decode(r["image"]["base64"])


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    for k, (desc, w, h) in OBJ.items():
        if only and k not in only:
            continue
        dst = os.path.join(OUT, k + ".png")
        if os.path.exists(dst) and not force:
            print(f"이미 있음 {k}", flush=True); continue
        try:
            open(dst, "wb").write(gen(desc, w, h))
            print(f"받음 {k} ({w}x{h})", flush=True)
        except urllib.error.HTTPError as e:
            print(f"실패 {k} — {e.code} {e.read().decode()[:200]}", flush=True)
        except Exception as e:
            print(f"실패 {k} — {type(e).__name__} {str(e)[:150]}", flush=True)
    print("══ 끝", flush=True)
