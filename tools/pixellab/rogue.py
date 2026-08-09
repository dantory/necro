#!/usr/bin/env python3
"""마을을 **디아블로 2 로그 야영지**의 결로 — 병수님: "마을 스타일 이런느낌 가능?"
(D2R 로그 야영지 화면을 참고로 주심)

**그 화면이 야영지로 보이는 이유**를 뜯어보면 건물이 아니라 **둘레의 것들**이다:

  · 무릎 높이의 **야석 돌담** — 다듬지 않은 돌을 그냥 쌓아 올린 것. 야영지를 두르고
    있지만 벽이 아니라 **잔해**처럼 끊겨 있다
  · **장대 횃불** — 땅에 박은 나무 장대에 불그릇. 화면 곳곳에 서서 빛웅덩이를 만든다
  · **지붕만 있는 목조 헛간** — 기둥과 서까래뿐, 벽이 없어 안이 들여다보인다
  · 통나무 더미, 짐수레 — 「임시로 머무는 곳」의 표시

우리 마을에는 통·궤짝·우물뿐이라 「공터」로 보인다. 위 넷을 넣으면 야영지가 된다.

  python3 tools/pixellab/rogue.py            # 아직 없는 것만
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", os.environ.get("CAMP_OUT", "camp"))

TONE = ("Diablo II Act 1 Rogue Encampment at night, grim gothic dark fantasy pixel art, "
        "rough undressed fieldstone, weathered grey timber, rusted iron, frayed rope, "
        "nothing new or clean, everything worn and makeshift, "
        "desaturated palette of grey stone and grey-brown wood, only firelight is warm, "
        "evenly lit, no vignette, no baked shadows, not dark, "
        "absolutely no blue, no purple, no violet, no teal, no bright green")
# ★★ 1차에서 여섯 중 **넷이 건물로 나왔다** — 돌담은 문 달린 벽이 됐고, 통나무 더미와
# 덤불은 아예 불 피운 실내가 됐다. 모델이 "Diablo Rogue Encampment" 를 보면 습관적으로
# **구조물과 불**을 그린다. 그래서 「아니다」를 문장으로 못박는다 — 무엇을 그릴지보다
# **무엇이 아닌지**가 이 도구에서는 더 세게 먹는다.
NOBUILD = ("NOT a building, NOT a doorway, NOT an arch, NOT a gate, no roof, no walls of a "
           "house, no room, no interior, no floor tiles, no fire, no flame, no torch, "
           "no glowing light, just the one small object lying on nothing")
ONE  = ("ONE single object only, centered, transparent background, "
        "seen from above at a steep angle, "
        "NO GROUND UNDER IT: no floor tiles, no paving, no grass, no dirt patch, "
        "no base platform, no shadow on the ground, the object alone on empty transparency, "
        "not a sheet, no grid, no duplicates, no text, no numbers, no characters")

OBJ = {
  # ── 야석 돌담 ── 야영지를 두르는 것. **벽이 아니라 잔해**라 끊겨 있어야 한다
  "wall_a": (f"{TONE}, {ONE}, {NOBUILD}, a short straight section of knee-high dry-stone wall built of "
             "rough undressed grey fieldstones stacked without mortar, the top course uneven, "
             "both ends broken off and crumbling, moss in the gaps", 176, 88),
  "wall_b": (f"{TONE}, {ONE}, {NOBUILD}, a crumbling corner of a knee-high dry-stone wall, rough grey "
             "fieldstones, half collapsed with fallen stones lying at its foot", 144, 96),
  # ── 장대 횃불 ── 빛웅덩이의 근원. 게임에서 addGlow 를 붙인다
  "torch": (f"{TONE}, {ONE}, a tall wooden stake driven into the ground with an iron fire "
            "basket at the top holding burning logs, bright warm orange flame, the stake "
            "weathered and split, no light rays, no ground", 72, 160),
  # ── 목조 헛간 ── 벽 없이 기둥과 지붕만. 안이 들여다보인다
  "shed":  (f"{TONE}, {ONE}, an open-sided timber shelter: four rough log posts holding up a "
            "sloped roof of weathered planks and thatch, no walls so you can see through it, "
            "a workbench and barrels underneath, seen from above at an angle", 224, 168),
  # ── 통나무 더미 ── 임시로 머무는 곳의 표시
  "logs":  (f"{TONE}, {ONE}, {NOBUILD}, a stack of cut logs piled crosswise, bark still on them, "
            "a few loose logs fallen beside the pile", 128, 88),
  # ── 마른 덤불 ── 풀밭에 흩어져 바닥의 반복을 끊는다
  "shrub": (f"{TONE}, {ONE}, {NOBUILD}, a low dry thorny shrub with bare twisted branches and a few "
            "brown leaves, muted olive and grey-brown, not bright green", 96, 88),
}

COMMON = {"outline": "single color outline", "shading": "detailed shading",
          "detail": "high detail"}


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
