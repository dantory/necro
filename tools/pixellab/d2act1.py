#!/usr/bin/env python3
"""마을을 **디아블로 2 액트1(로그 야영지)** 결로 다시 굽는다.
병수님: "마을 에셋 전체적으로 퀄리티가 낮다, 디아블로 2 액트1 스타일로 바꿔"
(참고로 보내 주신 D2R 화면을 기준으로 삼는다.)

**앞서 뭐가 부족했나** — 프롬프트가 「무엇을」만 적고 「어떻게 생겼는지」를 안 적었다.
"a merchant tent" 라고만 하면 모델은 제일 흔한 천막을 준다. 액트1 의 그 느낌은
재료와 상태에서 온다:

  · **거친 회색 야석(野石)과 낡은 목재** — 다듬은 벽돌이 아니라 손으로 쌓은 돌
  · **기운 천막, 새끼줄, 녹슨 쇠** — 새것이 하나도 없다. 야영지는 임시 거처다
  · **채도 낮은 흙빛에 불빛만 따뜻하게** — 색이 튀면 액트2 사막이나 액트3 정글이 된다
  · **위에서 비스듬히** 본 각도 — 게임의 시점(squash 0.78)과 맞아야 바닥에 붙는다

그래서 이번엔 **재료·상태·각도**를 문장마다 박는다. 크기도 올린다(176 → 208) —
디테일을 넣으려면 넣을 픽셀이 있어야 한다(구슬에서 배운 것과 같다).

  python3 tools/pixellab/d2act1.py            # 아직 없는 것만
  python3 tools/pixellab/d2act1.py --force    # 전부 다시
  python3 tools/pixellab/d2act1.py shop forge # 골라서

받은 것은 **assets/town_v2/** 에 둔다 — 눈으로 보고 나서 갈아 끼운다
(파이프라인: 생성 → 스테이징 → 선택 → 적용).
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", os.environ.get("D2_OUT", "town_v2"))

# ── 결 ── 액트1 을 액트1 로 만드는 것은 **재료와 상태**다. 매 프롬프트에 붙인다.
TONE = ("Diablo II Act 1 Rogue Encampment, grim gothic dark fantasy pixel art, "
        "rough grey fieldstone stacked by hand, weathered dark timber, patched canvas, "
        "rusted iron, frayed rope, nothing new or clean, everything worn and makeshift, "
        "desaturated earth palette of grey stone brown wood and dull ochre, "
        "only firelight is warm, evenly lit, no vignette, no baked shadows, not dark, "
        "absolutely no blue, no purple, no violet, no teal, no bright green")
# ★★ 첫 판에서 나온 것들이 **제 바닥을 달고** 왔다(돌판·풀밭·받침). 우리 바닥 타일
# 위에 얹으면 그 자리만 다른 바닥이 되어 **스티커**가 된다. 「바닥을 그리지 말라」를
# 문장으로 못박는다 — 접지는 place() 가 알파 경계로 맡는다(js/ground.js).
ONE  = ("ONE single object only, centered, transparent background, "
        "seen from above at a steep angle, "
        "NO GROUND UNDER IT: no floor tiles, no paving, no grass, no dirt patch, "
        "no base platform, no shadow on the ground, the object alone on empty transparency, "
        "not a sheet, no grid of items, no duplicates, no text, no numbers, no characters")

OBJ = {
  # ── 던전 입구 ── 마을의 목적. **아래로 내려간다**가 보여야 한다
  # ★ 첫 판의 입구는 **평평한 문**이었다 — 「내려간다」가 안 보이면 던전 입구가 아니다.
  "gate":  (f"{TONE}, {ONE}, a hole in the ground with stone steps going DOWN into total "
            "blackness, the steps recede downward away from the viewer and you can count "
            "them, a heavy carved stone arch of stacked fieldstone stands over the hole "
            "with an iron lantern hanging from it, moss in the joints", 176, 176),
  # ── 상인 ── 카샤/아크라의 그 좌판. 천막이 아니라 **장사하는 자리**
  "shop":  (f"{TONE}, {ONE}, a trader's stall in a war camp: a long plank counter on trestles "
            "under a patched canvas awning slung from crooked poles, shelves of clay pots "
            "bundles and rolled scrolls behind, sacks and crates stacked at the sides, "
            "a lantern hooked on a pole", 208, 168),
  # ── 대장간 ── 차시의 대장간. **불이 살아 있어야** 한다
  # ★ 첫 판의 대장간은 **너무 작고 헐거웠다.** 상인 좌판과 나란히 설 덩치가 필요하다.
  "forge": (f"{TONE}, {ONE}, a large blacksmith's workshop, big and imposing: a tall stone "
            "furnace with a chimney and a wide mouth full of glowing orange coals, a "
            "timber roof on posts over it, a heavy iron anvil on a stump in front, big "
            "bellows at the side, a rack of tongs and hammers, a water trough, "
            "the whole structure fills the frame", 208, 168),
  # ── 모닥불 ── 야영지의 심장
  "fire":  (f"{TONE}, {ONE}, a campfire of split logs inside a ring of blackened stones, "
            "tall warm orange flame, a blackened iron cooking pot on a tripod beside it, "
            "no light rays", 96, 96),
  # ── 우물 ── 사람이 사는 표시
  "well":  (f"{TONE}, {ONE}, a village well of stacked fieldstone with a wooden roof frame, "
            "a rope and bucket on a crank, worn stone rim", 112, 128),
  # ── 수레 ── 야영지에 늘 있는 것
  "cart":  (f"{TONE}, {ONE}, a wooden handcart with iron-rimmed wheels, tilted with one "
            "shaft resting on the ground, loaded with sacks and a barrel, "
            "planks worn and grey", 128, 96),
  "barrel": (f"{TONE}, {ONE}, a single wooden barrel with three rusted iron hoops, thick "
             "staves worn and water-stained, a wooden lid on top, strong side lighting "
             "so the curve of the barrel reads", 88, 96),
  "crate":  (f"{TONE}, {ONE}, a single wooden crate of rough planks, iron corner brackets, "
             "one plank cracked", 72, 72),
  "sacks":  (f"{TONE}, {ONE}, two burlap sacks tied with rope, one leaning on the other, "
             "coarse cloth, patched", 88, 72),
}

COMMON = {"outline": "single color outline", "shading": "detailed shading",
          "detail": "high detail"}


def mcp(tool, args, timeout=420):
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

    # **상태를 믿지 말고 산출물로 판단한다** — 파일이 생길 때까지 돈다
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
