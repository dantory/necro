#!/usr/bin/env python3
"""구워진 타일셋에서 **연속 바닥 한 칸**을 뽑아낸다.

`create_topdown_tileset` 은 Wang 16타일 시트를 준다 — 네 귀퉁이가 각각 lower/upper 인
조합이다. 우리에게 필요한 건 **네 귀퉁이가 전부 lower** 인 타일 하나, 그것만 이어 붙이면
끊김 없는 바닥이 된다(이어짐은 Wang 규칙이 보장한다).

  python3 tools/pixellab/floor_take.py <tileset_id> <출력이름>

★ 다운로드 URL 이 두 가지다. `download_png` 는 backblaze 로 가는데 **403 이 난다**
(서명 토큰이 안 붙는다). 같은 PNG 를 주는 `?inline=true` 를 쓸 것 — 응답에도 그렇게
적혀 있다("use it if your egress blocks backblaze").
"""
import json, os, sys, urllib.request
from PIL import Image
import io

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT  = os.path.join(ROOT, "assets", "floor")


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def get(url):
    req = urllib.request.Request(url, headers={"Authorization": auth()})
    return urllib.request.urlopen(req, timeout=180).read()


def take(tid, name):
    base = f"https://api.pixellab.ai/mcp/tilesets/{tid}"
    meta = json.loads(get(base + "/metadata"))
    sheet = Image.open(io.BytesIO(get(base + "/image?inline=true"))).convert("RGBA")
    tiles = meta["tileset_data"]["tiles"]

    full = [t for t in tiles if all(v == "lower" for v in t["corners"].values())]
    if not full:
        raise SystemExit(f"all-lower 타일이 없다 — 있는 조합: "
                         f"{[t['corners'] for t in tiles][:3]}")
    b = full[0]["bounding_box"]
    im = sheet.crop((b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))

    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, name + ".png")
    im.save(dst)
    sheet.save(os.path.join(OUT, name + "_sheet.png"))
    json.dump(meta["tileset_data"], open(os.path.join(OUT, name + ".json"), "w"))
    print(f"{name}: {im.size[0]}x{im.size[1]}  (all-lower {len(full)}장 중 첫 장) → {dst}")


if __name__ == "__main__":
    take(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "floor")
