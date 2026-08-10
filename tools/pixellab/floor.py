#!/usr/bin/env python3
"""전장 **바닥**을 굽는다 — 병수님: "디아블로 같은 느낌이긴한데 뭔가 부족하긴한데".

부족했던 것은 **바닥**이었다. 판(HUD)을 열두 번 고치는 동안 정작 화면의 80% 를
차지하는 전장은 **검은 색 하나**였다 — 캐릭터가 허공에 떠 있었다. 디아블로 분위기의
절반은 바닥이 낸다: 돌 이음새, 갈라진 틈, 그 위에 얹힌 횃불빛.

**절차생성이나 자작 편법으로 seamless 타일을 만들지 않는다**(병수님 지시).
바닥/맵 타일은 `create_topdown_tileset` 이 정답이다 — Wang 16타일이라 이어 붙는 것이
보장되고, 우리는 그중 **all-lower 타일**(전부 아래 재질인 것) 하나만 뽑아 쓰면
연속 바닥이 된다.

결과는 assets/floor/<id>.png (+ <id>.json 메타).
"""
import base64, json, os, re, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "floor")

# 색을 **맨 앞에 대문자로** 못박는다. 중간에 적으면 묻혀서 청보라가 나온다(d2r.py 교훈).
#
# ★★ 1차에서 배운 것 — **텍스처에 어둠을 주문하면 안 된다.**
# "DARK ... torchlit gloom" 으로 구웠더니 밝기 범위가 **21~44**(255 중) 뿐인 검은
# 판때기가 나왔다. 화면에 깔아도 무늬가 안 보였다. 어둠은 **조명이 만든다**
# (js/ground.js 가 곱하기로 덮는다). 타일은 **중간 밝기 · 또렷한 대비**로 구워야
# 빛 안에서 살아나고 빛 밖에서 잠긴다. 채도만 낮추고 밝기는 낮추지 않는다.
TONE = ("MEDIUM GREY STONE, desaturated but clearly visible, moderate contrast, "
        "evenly lit flat texture, no vignette, no shadows baked in, not dark, "
        "absolutely no blue, no purple, no violet, no teal, no green, "
        "Diablo 2 dungeon floor texture, grim gothic")

TILESETS = {
  # 1층 — 낡은 돌바닥. 이음새와 갈라진 틈이 보여야 「바닥」으로 읽힌다.
  "crypt": dict(
    lower_description=f"{TONE}, worn cracked flagstone floor, large square slabs with deep "
                      "dark mortar seams between them, chipped corners, scattered grit",
    upper_description=f"{TONE}, dark damp earth and gravel",
    transition_description="crumbled broken edge of the stone slabs",
  ),
  # ── 마을(로그 야영지) ── 병수님이 준 D2R 화면: **풀밭에 다져진 흙길**이 섞인 바닥.
  # 지금 마을 바닥은 갈색 흙 한 가지라 「야영지」가 아니라 「공터」로 보인다.
  # ★ 여기서는 초록을 **막지 않는다** — 다른 굽기에서는 청록이 튀어서 금지했지만,
  #   야영지 바닥의 절반은 실제로 풀이다. 대신 **채도를 낮춘 마른 풀**로 못박는다.
  "camp": dict(
    lower_description=("MUTED DRY GRASS, olive and khaki, desaturated, moderate contrast, "
                       "evenly lit flat texture, no vignette, no shadows baked in, not dark, "
                       "no blue, no purple, no teal, no bright saturated green, "
                       "Diablo 2 Rogue Encampment ground, grim gothic, "
                       "patchy dry meadow grass, individual blades and tufts clearly drawn, clumpy uneven texture with small stones and bare soil showing through, NOT a flat single color, visible speckled detail everywhere"),
    upper_description=("MEDIUM BROWN PACKED EARTH, desaturated, worn dirt path trodden flat "
                       "by boots, small pebbles and wheel ruts, no grass"),
    transition_description="ragged edge where the grass has been worn away into bare dirt",
  ),
  # ── 마을 2차 ── 1차 camp 은 all-lower 가 **무늬 없는 단색**이었다(통짜 갈색).
  # 「풀」이라고만 적으면 평평한 색을 준다 — **무엇이 보이는지**를 세어서 적는다.
  "camp2": dict(
    lower_description=("MUTED OLIVE AND KHAKI DRY GRASS, desaturated, medium brightness, "
                       "strong visible texture: individual grass blades and clumps, "
                       "scattered small grey pebbles, patches of bare soil between tufts, "
                       "high contrast between blade and shadow, "
                       "no blue, no purple, no teal, no bright saturated green, "
                       "Diablo 2 Rogue Encampment meadow seen straight from above"),
    upper_description=("MEDIUM BROWN PACKED EARTH, desaturated, a footpath trodden bare, "
                       "small pebbles, faint wheel ruts, no grass at all"),
    transition_description="ragged edge where the grass thins out into bare trodden dirt",
  ),
  # ── 마을 3차 ── ★★ 참고 화면과 **숫자로** 비교해 보니 차이가 소품이 아니었다:
  #   D2R  RGB(62,59,45) 채도 0.29 밝기 0.25 **초록 29%**
  #   우리 RGB(94,79,57) 채도 0.40 밝기 0.37 **초록 0%**
  # 우리 마을은 밝은 주황빛 사막이고 저기는 어두운 **풀밭**이다. 1·2차에서 초록을
  # 「마른 풀·카키」로 눌러 적은 것이 원인 — 그래서 흙만 나왔다. 이번엔 **초록을
  # 정면으로 주문한다**(채도는 낮게, 밝기는 중간). 어둠은 바닥 밝기(boost)로 만든다.
  "meadow": dict(
    lower_description=("MOSSY GREEN MEADOW GRASS, olive green and grey-green, desaturated "
                       "but clearly GREEN, medium brightness, strong visible texture of "
                       "individual grass blades and clumps with dark shadow between them, "
                       "a few small grey pebbles, Diablo 2 Rogue Encampment ground at night, "
                       "no blue, no purple, no teal, no neon"),
    upper_description=("MEDIUM BROWN PACKED EARTH, desaturated, a footpath trodden bare by "
                       "boots, small pebbles and faint ruts, no grass"),
    transition_description="ragged edge where the green grass is worn away into bare dirt",
  ),
  # 깊은 층 — 뼛조각이 섞인 흙바닥. 네크로멘서의 소굴.
  "bone": dict(
    lower_description=f"{TONE}, packed brown earth floor littered with small pale bone "
                      "fragments and ash, sparse cracks",
    upper_description=f"{TONE}, black cracked stone",
    transition_description="ragged edge where earth meets stone",
  ),
}

# ★ 값은 **스키마가 정한 문자열만** 받는다. `detail:"high detail"` 로 넣었다가 두 번 다
# 튕겼다(허용값은 low detail / medium detail / **highly detailed**). 다른 굽기 스크립트와
# 열쇠 이름이 같아도 **허용값은 도구마다 다르다** — 튕기면 tools/list 로 enum 을 본다.
# ★ `transition_size` 는 픽셀 수가 아니라 **0~1 비율**이다(8 을 넣었다가 튕겼다).
COMMON = dict(tile_size={"width": 32, "height": 32}, transition_size=0.5,
              view="high top-down", outline="selective outline",
              shading="detailed shading", detail="highly detailed",
              shape_style="square")


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)

def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text", "") for c in content(r) if c.get("type") == "text")


def auth():
    """MCP 헤더의 토큰을 그대로 쓴다 — 다운로드 URL 도 같은 인증을 요구한다."""
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def grab(url, dst):
    """★ `/image` 는 backblaze 로 **리다이렉트**되는데 거기에 우리 Authorization 헤더가
    같이 따라가서 403 이 난다(camp 타일셋에서 열 번 넘게 재시도만 했다).
    `?inline=true` 는 서버가 직접 바이트를 주므로 헤더가 그대로 통한다."""
    if "?" not in url:
        url += "?inline=true"
    req = urllib.request.Request(url, headers={"Authorization": auth()})
    with urllib.request.urlopen(req, timeout=120) as f:
        data = f.read()
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(data)
    return len(data)


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    todo = [k for k in TILESETS if not only or k in only]

    jobs = {}
    for k in todo:
        if os.path.exists(os.path.join(OUT, k + ".png")):
            print(f"이미 있음 {k}", flush=True); continue
        args = dict(TILESETS[k]); args.update(COMMON)
        t = text_of(mcp("create_topdown_tileset", args))
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", t)
        if not m:
            print(f"실패 {k} — {t[:250]}", flush=True); continue
        jobs[k] = m.group(1); print(f"줄 세움 {k}  {jobs[k]}", flush=True)
        time.sleep(2)

    # 익을 때까지 돌아가며 물어본다. 타일셋은 몇 분 걸린다.
    for rnd in range(90):
        left = {k: v for k, v in jobs.items() if not os.path.exists(os.path.join(OUT, k + ".png"))}
        if not left: break
        for k, tid in left.items():
            try:
                r = mcp("get_topdown_tileset", {"tileset_id": tid})
                t = text_of(r)
                if not re.search(r"status:\s*completed", t, re.I):
                    continue
                png = re.search(r"(https?://\S*?download_png\S*)", t) or \
                      re.search(r"download_png[\"':\s]+(\S+)", t)
                meta = re.search(r"(https?://\S*?download_metadata\S*)", t) or \
                       re.search(r"download_metadata[\"':\s]+(\S+)", t)
                if png:
                    n = grab(png.group(1).rstrip('",'), os.path.join(OUT, k + ".png"))
                    print(f"받음 {k}  {n}바이트", flush=True)
                if meta:
                    grab(meta.group(1).rstrip('",'), os.path.join(OUT, k + ".json"))
                if not png:
                    # 이미지 블록으로 오는 경우도 받는다
                    for c in content(r):
                        if c.get("type") == "image" and c.get("data"):
                            os.makedirs(OUT, exist_ok=True)
                            open(os.path.join(OUT, k + ".png"), "wb").write(base64.b64decode(c["data"]))
                            print(f"받음(inline) {k}", flush=True)
                    else:
                        open(os.path.join(OUT, k + ".txt"), "w").write(t)
                        print(f"URL 을 못 찾음 {k} — 응답을 {k}.txt 로 남김", flush=True)
            except Exception as e:
                print(f"대기 {k} — {str(e)[:80]}", flush=True)
            time.sleep(2)
        if any(not os.path.exists(os.path.join(OUT, k + ".png")) for k in jobs):
            time.sleep(20)

    got = [k for k in TILESETS if os.path.exists(os.path.join(OUT, k + ".png"))]
    print(f"══ {len(got)}/{len(TILESETS)}장  " + " ".join(got), flush=True)
