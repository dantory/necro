#!/usr/bin/env python3
"""바닥 **얼룩**(decal) — 병수님: "타일이 너무 단순 반복인거 같긴한데".

**타일을 아무리 잘 만들어도 같은 타일이면 격자가 보인다.** 지금은 한 장을 네 방향으로
뒤집어 쓰는데, 뒤집기는 주기를 늘릴 뿐 없애지 못한다. 눈은 32px 격자를 금방 찾아낸다.

디아블로 1 의 트리스트람 바닥이 그 반대다 — 같은 흙바닥인데도 격자가 안 보인다.
**타일 위에 격자와 무관한 것들이 얹혀 있기 때문이다:** 밟아서 닳은 길, 물웅덩이 자국,
흩어진 자갈, 이끼. 이것들은 타일 경계를 **가로질러** 놓이므로 격자를 끊는다.

그래서 타일을 늘리는 대신 **얼룩을 뿌린다.** 값싸고(몇 장이면 된다) 효과는 크다.

  python3 tools/pixellab/decal.py
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
# 받는 곳은 바꿔 낄 수 있게 둔다 — 새로 구운 것은 **스테이징에 받아 놓고**
# 눈으로 보고 나서 갈아 낀다(파이프라인: 생성 → 스테이징 → 선택 → 적용).
OUT  = os.path.join(ROOT, "assets", os.environ.get("DECAL_OUT", "decal"))

# ★★ 첫 판이 **입체로 구워졌다.** 확대해 보니 웅덩이가 검은 테를 두른 접시였고
# 가운데엔 정반사까지 박혀 있었다 — 풀밭에 프라이팬을 얹어 놓은 꼴이다.
# 얼룩은 물건이 아니라 **땅의 변색**이다. 그러니 테도, 두께도, 하이라이트도 없어야
# 한다. outline 을 lineless 로 두는 것이 핵심이다(흙길 타일에서 배운 것과 같다).
# ★★ V-164 (2026-08-30) — **소품만 데우고 얼룩은 안 데웠다.** `decor.py` 는 V-161 에서
# 「제 색을 맨 앞 대문자로」로 갈아탔는데(`--warm`), 여기 `BASE` 는 옛 회색 그대로였다.
# 화면에서 재면 바닥·소품이 R−B +22~+40 인데 얼룩만 회녹색이라, 따뜻한 바닥 위에
# **딴 데서 온 판**처럼 얹힌다 — 「둥둥 떠 있다」의 한 몫. ★ [[carry-fixes-forward]]
#
# ★★ 그리고 부정어를 **줄였다.** 옛 BASE 는 "zero depth · no rim · no bowl · no crater ·
# no highlight · no specular · no gloss · no cast shadow · no outline" 로 **아홉을 걸고도**
# `crack`·`pebble` 이 입체 바위로 왔다. [[pixellab-side-attack-failures]] — 부정어로는
# 못 막는다. 원하는 것(**바닥이 물든 자국**)을 짧게 · 맨 앞에 말한다.
BASE_COLD = ("grim gothic dark fantasy pixel art, top-down view straight down at the ground, "
        "desaturated earth palette, evenly lit, no vignette, "
        "absolutely no blue, no purple, no violet, no teal, no bright green, "
        "this is only a DISCOLOURATION OF THE GROUND, not an object: "
        "perfectly flat with zero depth, no rim, no lip, no bowl, no crater, "
        "no highlight, no specular, no gloss, no cast shadow, no outline at all, "
        "irregular organic blotch with soft ragged fading edges that dissolve into nothing, "
        "transparent background outside the patch, "
        "ONE patch only, no grid, no tiling, no border, no frame, no text")

# 제 색을 맨 앞 대문자로 — 상자·계단이 통한 그 꼴(decor.py TONE_WARM 과 같은 온도).
# ★ V-164 2차 — 1차 `BASE_WARM`(색을 맨 앞 대문자로)은 **넘어갔다.** 컷을 보니
#   dust 는 흰 크림 덩어리 · crack 은 «자갈 타일 정사각형» · pebble 은 밝은 황갈 넉장 ·
#   stain 은 청록(R−B −15)이 왔다. 까닭은 뚜렷하다 — 「WEATHERED BROWN GREY STONE」을
#   주어 자리에 세우니 굽는 쪽이 **돌 자체를 그렸다.** 얼룩은 돌이 아니라 «돌이 물든 것»이다.
#
#   계단이 넷 만에 통한 자리가 답을 준다: 「A BLACK PIT in warm brown stone floor」 —
#   **그 그림의 본질을 주어로 맨 앞에** 세웠다(어둠). 얼룩의 본질도 색이 아니라 **어두움**이다.
BASE_WARM = ("A DARK PATCH SOAKED INTO A BROWN STONE FLOOR, "
        "seen from straight above, lying flat in the stone, "
        "darker than the floor around it, dark brown, "
        "the edges blur and fade away into nothing, "
        "grim gothic dark fantasy pixel art, evenly lit, "
        "transparent background around the patch, "
        "absolutely no blue, no teal, no green, no white, "
        "ONE patch only, no text")

# ★★ V-172b — 3차(손잡이를 돌린 판)는 **꼴은 고쳤는데 색이 남색으로 갔다.**
#   자로 재면 뚜렷하다: 테 대비 +45.7 → **−10.6**(pebble), 명암폭 47.3 → **0.0** — 입체도
#   테도 사라졌다. 그런데 R−B 가 +11.6 → **−26.3**(crack) · **−21.9**(mud), 밝기는 mud 12 ·
#   pebble 1.3 — **잉크 얼룩**이 왔다. V-164 가 적어 둔 「어둠을 앞에 세우면 청록/남색」 그대로다.
#
#   까닭은 하나다 — **맨 앞의 주어가 그림의 주인공이 된다.**
#     · "A DARK PATCH …"        → 어둠을 그린다 → 남색·검정  (BASE_WARM, 3차)
#     · "WEATHERED BROWN GREY STONE …" → 돌 자체를 그린다 → 자갈 타일  (V-164 1차)
#   그러니 주어는 어둠도 돌도 아니라 **«따뜻한 색의 자국»** 이어야 한다.
#   ★ [[rule-carried-value-dropped]] — 「제 색을 맨 앞 대문자로」라는 틀은 맞았는데
#     그 자리에 채운 값(GREY·DARK)이 매번 찬 쪽이었다.
BASE_STAIN = ("A RUST BROWN STAIN, warm reddish brown, "
        "soaked into a pale warm brown stone floor, seen straight from above, "
        "lying completely flat in the stone with no thickness, "
        "one irregular organic blotch with ragged edges, "
        "grim gothic dark fantasy pixel art, evenly lit, "
        "warm brown and ochre only, absolutely no blue, no navy, no teal, no black, "
        "transparent background around the stain, no text")

# ★★ V-172c — 4차는 **반대쪽으로 넘어갔다.** "RUST BROWN · warm reddish" 를 주어에 세우니
#   R−B 가 +84~+90(바닥은 **+26**) — **핏자국**이 왔다. 축이 이제 양쪽으로 물렸다:
#     "DARK …"        → R−B −20~−26  (남색 잉크)      · 3차
#     "STONE …"       → 자갈 타일                      · V-164 1차
#     "RUST BROWN …"  → R−B +82~+90  (핏자국)          · 4차
#     ← 바닥은 그 사이 **+26** 이다.
#   그러니 주어에서 **어둠도 빼고 붉음도 뺀다** — 「바닥돌이 «변색된» 자리」로만 말한다.
BASE_DUSK = ("A DISCOLOURED PATCH OF PALE BROWN STONE FLOOR, "
        "the same warm pale brown as the floor but duller and a little darker, "
        "seen straight from above, lying completely flat with no thickness, "
        "one irregular organic blotch with ragged uneven edges, "
        "grim gothic dark fantasy pixel art, evenly lit, "
        "muted warm brown and dull ochre, "
        "absolutely no blue, no navy, no teal, no black, no red, no blood, "
        "transparent background around the patch, no text")

DUSK = "--dusk" in sys.argv
STAIN = "--stain" in sys.argv
WARM = "--warm" in sys.argv
BASE = BASE_DUSK if DUSK else (BASE_STAIN if STAIN else (BASE_WARM if WARM else BASE_COLD))

OBJ = {
  # ── 던전 ── 밟아 닳은 자리·물자국·부스러기
  "dust":   (f"{BASE}, a patch of pale grey dust and grit scattered on a stone floor", 96, 96),
  # ★ V-164 — 옛 글이 "chipped edges"·"shadow inside" 로 **두께를 불렀다**(돌덩어리가 왔다).
  #   금은 «파인 것»이 아니라 바닥에 그어진 **검은 선**이다.
  "crack":  (f"{BASE}, thin dark hairline cracks drawn across the flat stone floor, "
             "like ink lines on the surface", 128, 96),
  # ★ V-164 — 여태 쓰던 stain.png 는 **속이 빈 테**였다(굽기 실패장을 그대로 썼다).
  "stain":  (f"{BASE}, a large dark damp patch soaked deep into the stone, "
             "solid dark in the middle, fading out at the edges", 112, 112),
  # ★ V-164 — "pebbles lying on the floor" 가 **올려 놓은 돌**을 불렀다(둥근 회색 접시).
  #   흩어진 «가루 자국»으로 말한다.
  "pebble": (f"{BASE}, a faint scatter of fine grit and stone dust marking the flat floor, "
             "tiny specks, no volume", 96, 80),
  # ── 마을 ── 흙길과 풀
  "path":   (f"{BASE}, a stretch of bare dirt path worn smooth by footsteps, slightly lighter "
             "than the surrounding ground, with faint wheel ruts", 160, 112),
  "grass":  (f"{BASE}, a sparse tuft of dry dead brown grass and weeds growing from the dirt", 80, 72),
  "mud":    (f"{BASE}, a shallow muddy puddle in packed dirt with a darker wet rim", 112, 96),
}

# ★ outline **lineless** — 얼룩에 선이 그어지면 그 순간 「물건」이 된다.
# ★★ V-172 (2026-08-30) — **두 판을 다시 구웠는데 둘 다 «글»만 고쳤다.** 조리법에
#   "seen from straight above" · "perfectly flat with zero depth" · "no outline at all" 을
#   써 놓고, 정작 **굽는 쪽 손잡이 셋은 한 번도 안 돌렸다**:
#     · `view` 를 **아예 안 줬다** → 기본값 `low top-down`(비스듬한 3/4 시점)으로 구웠다.
#       비스듬히 보면 물건은 «두께»를 가진다 — 「입체 바위」의 진짜 까닭이 이것이다.
#     · `shading` 이 `medium shading` → 명암을 넣으라고 시켜 놓고 「평평하게」를 글로 빌었다.
#     · `detail` 이 `medium detail` → 자갈 하나하나를 그리게 했다.
#   ★ [[knob-that-does-nothing]] 의 반대쪽 — 손잡이는 멀쩡히 있는데 **안 돌리고 글로 빌었다.**
#   ★ [[cause-written-in-the-item-is-a-guess]] — 항목엔 「색이 차서」라고 적혀 있었다.
#   재 보니(V-172) 색은 셋째 원인이고, 첫째는 **테**(가장자리가 안쪽보다 20~46 어둡다),
#   둘째는 **하드 알파**(반투명 픽셀이 0.0% — 스며든 자국이 아니라 오려 붙인 판이다).
COMMON = {"view": "high top-down",        # 똑바로 위에서 — 두께가 안 생긴다
          "outline": "lineless",
          "shading": "flat shading",      # 명암 없음 — 얼룩은 물건이 아니다
          "detail": "low detail"}


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:250]}")
    return json.loads(r.stdout)

def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text", "") for c in content(r) if c.get("type") == "text")
def path_of(k): return os.path.join(OUT, k + ".png")


if __name__ == "__main__":
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    todo = [k for k in OBJ if (not only or k in only) and (force or not os.path.exists(path_of(k)))]
    if not todo:
        print("전부 이미 있음"); sys.exit(0)
    os.makedirs(OUT, exist_ok=True)

    jobs = {}
    for k in todo:
        desc, w, h = OBJ[k]
        try:
            t = text_of(mcp("create_map_object", {"description": desc,
                                                  "width": w, "height": h, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m:
                print(f"실패 {k} — {t[:200]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k} ({w}x{h})", flush=True)
        except Exception as e:
            print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)

    for rnd in range(100):
        left = {k: v for k, v in jobs.items() if not os.path.exists(path_of(k))}
        if not left:
            break
        for k, oid in left.items():
            try:
                r = mcp("get_map_object", {"object_id": oid})
                if "status: completed" not in text_of(r):
                    continue
                for c in content(r):
                    if c.get("type") == "image" and c.get("data"):
                        open(path_of(k), "wb").write(base64.b64decode(c["data"]))
                        print(f"받음 {k}", flush=True)
            except Exception as e:
                print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs):
            time.sleep(15)

    got = [k for k in OBJ if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(OBJ)}장  " + " ".join(got), flush=True)
