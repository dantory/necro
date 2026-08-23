#!/usr/bin/env python3
"""구역 바닥 **넉 장**을 굽는다 (ROADMAP V-5).

일곱 구역이 타일 셋(crypt·bone·camp)을 **색만 바꿔** 돌려 쓰고 있었다 — 08-21 에
「남은 흠」으로 적어 둔 그것이다. 색 곱하기(ZONES.tint)는 값싸게 「달라 보이게」
하지만 **무늬는 그대로**라, 4층에서 9층으로 내려가도 발밑의 돌 이음새가 한 톨도
안 바뀐다. 내려가는 맛은 색이 아니라 **재질**이 낸다.

넉 장 = 지금 남을 돌려 쓰는 네 구역:
  rot     4층  썩은 시체 굴   (crypt + 초록 tint 였다)
  sanctum 26층 어둠의 성소    (bone  + 보라 tint 였다)
  blood   40층 마른 피의 골   (camp  + 붉은 tint 였다)
  abyss   60층 심연           (crypt + 푸른 tint 였다)

★ floor.py 의 교훈을 그대로 지킨다 — **텍스처에 어둠을 주문하지 않는다.**
  "DARK/gloom" 을 넣으면 밝기 21~44 짜리 검은 판때기가 와서 무늬가 안 보인다.
  중간 밝기 · 또렷한 대비로 굽고, 어둠은 main.js 의 boost 로 만든다.
★ 색도 **약하게만** 주문한다. 구역 tint 를 그대로 둘지 뺄지는 구운 뒤에 정한다 —
  재질이 이미 다르면 tint 는 거들기만 하면 된다.
★ 굽고 나서 **평균 밝기**를 찍는다. main.js 의 boost 는 `44 / 평균` 이다
  (crypt 42×0.95 · bone 62×0.70 · camp 117×0.38 전부 화면에서 40~50).

  python3 tools/pixellab/zone_floors.py [이름…]     # 이름 생략 = 넉 장 전부
"""
import io, json, os, re, subprocess, sys, time, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "floor")

# 어느 굽기에나 붙는 꼬리 — 밝기는 지키고 채도만 낮춘다.
LIT = ("medium brightness, moderate contrast, evenly lit flat texture, "
       "no vignette, no shadows baked in, not dark, "
       "Diablo 2 dungeon floor texture, grim gothic, seen straight from above")

TILESETS = {
  # 4층 — 시체가 썩어 무너진 굴. 돌이 아니라 **젖은 흙과 곰팡이**.
  # ★★ 1차는 **덩어리 하나가 타일마다 되풀이**됐다(가운데 밝은 노란 곰팡이 뭉치).
  #   "patches of fungus" 처럼 **셀 수 있는 것**을 적으면 그림이 그 하나를 크게 그린다 —
  #   바닥은 셀 수 없는 것이어야 한다. 2차는 「고른 결·작은 알갱이·중심 없음」을 못박는다.
  "rot": dict(
    lower_description=("SICKLY OLIVE GREEN MOULD over wet dark brown earth, desaturated, "
                       f"{LIT}, fine even speckled grain covering the whole tile uniformly, "
                       "countless tiny mould specks and mildew flecks, all detail small, "
                       "no single large object, no focal point, no centre, nothing stands out, "
                       "no blue, no purple, no teal, no neon green"),
    upper_description=("DARK BROWN WET MUD, desaturated, churned soggy earth with shallow "
                       "puddles, no grass, flat ground with no height"),
    transition_description="the mould thins out into bare wet mud on flat level ground",
  ),
  # 26층 — 어둠의 성소. **닦인 검은 대리석**에 새겨진 문양. 사람 손이 닿은 바닥.
  "sanctum": dict(
    lower_description=("POLISHED DARK GREY MARBLE floor tiles, desaturated, "
                       f"{LIT}, large smooth slabs fitted tight with thin black seams, "
                       "faint carved geometric sigils and circles engraved into the stone, "
                       "subtle veining, a few hairline cracks, "
                       "no blue, no purple, no teal, no green"),
    upper_description=("BLACK ROUGH BASALT, desaturated, unworked broken stone, "
                       "flat ground with no height"),
    transition_description="the polished slabs break off into rough unworked stone, flat and level",
  ),
  # 40층 — 마른 피의 골. **갈라진 붉은 진흙**, 말라붙은 얼룩.
  # ★★ 두 번을 내리 놓쳤다. 1차는 **얼룩 하나가 되풀이**됐고(고쳤다), 2차는 무늬는
  #   고른데 **채도가 0.93** 이었다 — 화면에 깔고 보니 다른 여섯 구역이 최대채널 42~55
  #   인데 혼자 86 인 **새빨간 판**이었다. 평균밝기(35)만 보고 골라서 못 봤다:
  #   RGB(69, 5, 32) 은 평균이 낮아도 **빨강 하나만 서 있는** 색이다
  #   ([[floor-far-from-threshold]] — 자가 재는 것이 고르려는 것과 달랐다).
  #   3차는 **마른 피는 빨강이 아니라 갈색**이라는 데서 다시 쓴다 — 갈색을 먼저 적고
  #   붉은 기는 「기운」으로만 남긴다. 고를 때도 평균이 아니라 **최대채널과 채도**를 본다.
  "blood": dict(
    lower_description=("DARK GREY BROWN DIRT with a faint dull rust tinge, mostly BROWN not "
                       "red, heavily desaturated, muted and earthy, "
                       f"{LIT}, parched ground covered edge to edge in a fine even network of "
                       "many thin dry cracks, uniform grain, countless small clay flakes and "
                       "grit, all detail small, no single large object, no focal point, "
                       "no centre, nothing stands out, "
                       "no blue, no purple, no teal, no green, "
                       "no bright red, no crimson, no scarlet, no pink, not colourful"),
    upper_description=("DARK BROWN CAKED CRUST, heavily desaturated, a thick dried layer "
                       "flaking off the ground, flat with no height, not red"),
    transition_description="the cracked ground is covered over by the dark dried crust, flat and level",
  ),
  # 60층 — 심연. **깨진 흑요석**, 그 틈에 남은 희미한 결.
  "abyss": dict(
    lower_description=("FRACTURED CHARCOAL GREY OBSIDIAN, desaturated, "
                       f"{LIT}, glassy volcanic rock shattered into sharp angular shards, "
                       "pale cold grey light caught along the fracture lines, coarse ash "
                       "gathered in the gaps, no blue, no purple, no teal, no green"),
    upper_description=("FINE GREY ASH, desaturated, a smooth drift of powdery ash, "
                       "flat ground with no height"),
    transition_description="the shards are buried under drifting ash on flat level ground",
  ),
}

# floor.py 와 같은 값 — 열쇠 이름이 같아도 허용값은 도구마다 다르니 손대지 말 것.
# ★ transition_size 는 픽셀이 아니라 0~1 비율이고, 크면 **지형 계단**이 된다(meadow2 교훈).
COMMON = dict(tile_size={"width": 32, "height": 32}, transition_size=0.12,
              view="high top-down", outline="lineless",
              shading="detailed shading", detail="highly detailed",
              shape_style="square")


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)


def text_of(r):
    return "\n".join(c.get("text", "") for c in r.get("result", {}).get("content", [])
                     if c.get("type") == "text")


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def get(url):
    """★ backblaze 리다이렉트에 Authorization 이 따라가 403 이 난다 — inline 을 쓴다."""
    req = urllib.request.Request(url, headers={"Authorization": auth()})
    return urllib.request.urlopen(req, timeout=180).read()


def take(tid, name):
    """Wang 16장 중 **네 귀퉁이가 전부 lower** 인 칸 하나를 뽑는다(연속 바닥)."""
    base = f"https://api.pixellab.ai/mcp/tilesets/{tid}"
    meta = json.loads(get(base + "/metadata"))
    sheet = Image.open(io.BytesIO(get(base + "/image?inline=true"))).convert("RGBA")
    tiles = meta["tileset_data"]["tiles"]
    full = [t for t in tiles if all(v == "lower" for v in t["corners"].values())]
    if not full:
        raise RuntimeError(f"all-lower 타일이 없다 — {[t['corners'] for t in tiles][:2]}")
    b = full[0]["bounding_box"]
    im = sheet.crop((b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, name + "_tile.png")
    im.save(dst)
    sheet.save(os.path.join(OUT, name + "_tile_sheet.png"))
    json.dump(meta["tileset_data"], open(os.path.join(OUT, name + "_tile.json"), "w"))
    px = list(im.convert("RGB").getdata())
    mean = sum(sum(p) / 3 for p in px) / len(px)
    print(f"받음 {name}: {im.size[0]}x{im.size[1]} · 평균밝기 {mean:.0f} "
          f"· boost 는 {44 / max(mean, 1):.2f} → {dst}", flush=True)
    return mean


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    todo = [k for k in TILESETS if not only or k in only]

    jobs = {}
    for k in todo:
        if os.path.exists(os.path.join(OUT, k + "_tile.png")):
            print(f"이미 있음 {k}", flush=True); continue
        args = dict(COMMON); args.update(TILESETS[k])
        t = text_of(mcp("create_topdown_tileset", args))
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", t)
        if not m:
            print(f"실패 {k} — {t[:250]}", flush=True); continue
        jobs[k] = m.group(1); print(f"줄 세움 {k}  {jobs[k]}", flush=True)
        time.sleep(2)

    # 익을 때까지 돌아가며 물어본다. 타일셋은 한 장에 몇 분 걸린다.
    for _ in range(90):
        left = {k: v for k, v in jobs.items()
                if not os.path.exists(os.path.join(OUT, k + "_tile.png"))}
        if not left:
            break
        for k, tid in left.items():
            try:
                t = text_of(mcp("get_topdown_tileset", {"tileset_id": tid}))
                if not re.search(r"status:\s*completed", t, re.I):
                    continue
                take(tid, k)
            except Exception as e:
                print(f"대기 {k} — {str(e)[:90]}", flush=True)
            time.sleep(2)
        if any(not os.path.exists(os.path.join(OUT, k + "_tile.png")) for k in jobs):
            time.sleep(20)

    got = [k for k in todo if os.path.exists(os.path.join(OUT, k + "_tile.png"))]
    print(f"══ {len(got)}/{len(todo)}장  " + " ".join(got), flush=True)
