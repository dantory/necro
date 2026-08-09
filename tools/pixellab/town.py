#!/usr/bin/env python3
"""**마을** 조각 — 병수님: "마을도 만들어줘, 마을에서 던전으로 진입하는거고,
마을에서 아이템 구매 / 강화 등을 진행할 수 있게".

**던전과 같은 파이프라인을 그대로 쓴다.** 바닥 타일 위에 조각을 얹고 조명을 곱한다
(js/ground.js). 마을만 따로 그리면 톤이 어긋나고 코드가 두 벌이 된다 — 디아블로 2 의
로그레 야영지도 던전과 같은 엔진으로 그린 **한 장면**일 뿐이다.

마을에 필요한 것은 넷:
  · **던전 입구** — 여기서 내려간다. 마을의 목적
  · **상인 천막** — 아이템을 산다
  · **대장간** — 강화한다
  · **모닥불** — 마을이 「사람이 있는 곳」으로 읽히게. 밤이라 불이 있어야 산다

★ 색은 맨 앞에 대문자로. ★ 어둡게 굽지 않는다(어둠은 조명이 만든다).
★ create_map_object 의 detail 허용값은 "high detail"(타일셋은 "highly detailed").
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "town")

TONE = ("MEDIUM WARM BROWN WOOD AND GREY STONE, desaturated, moderate contrast, evenly lit, "
        "no vignette, no shadows baked in, "
        "absolutely no blue, no purple, no violet, no teal, no bright green, "
        "Diablo 2 rogue encampment at night, grim gothic pixel art")
ONE  = ("ONE single object only, centered, transparent background, "
        "not a sheet, no grid of items, no duplicates, no text, no numbers")

PARTS = {
  # ── 던전 입구 ── 마을의 목적. **아래로 내려가는 것**이 보여야 한다.
  "gate":  (f"{TONE}, {ONE}, a stone stairway descending into a dark crypt entrance in the "
            "ground, carved arch of old stone above it, the steps disappear into blackness, "
            "seen from above at an angle", 96, 96),
  # ── 상인 천막 ── 물건을 파는 곳
  "shop":  (f"{TONE}, {ONE}, a merchant tent of patched brown canvas with a wooden counter "
            "in front, crates and barrels stacked beside it, seen from above at an angle", 112, 96),
  # ── 대장간 ── 강화하는 곳. 모루와 화덕
  "forge": (f"{TONE}, {ONE}, a blacksmith forge: a stone furnace with glowing orange coals "
            "and an iron anvil in front of it, hammer and tongs, seen from above at an angle",
            112, 96),
  # ── 모닥불 ── 밤의 마을은 불이 있어야 산다
  "fire":  (f"{TONE}, {ONE}, a campfire of burning logs inside a ring of stones, warm orange "
            "flame, seen from above at an angle, no light rays", 64, 64),
  # ── 나무 울타리 ── 마을의 경계. 좌우로 이어 붙인다
  "fence": (f"{TONE}, {ONE}, a straight horizontal section of rough wooden palisade fence, "
            "vertical logs lashed together, the left and right ends are cut off mid-log so "
            "copies tile edge to edge, no corners, no end caps, no gate", 128, 64),
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
    todo = [k for k in PARTS if (not only or k in only) and (force or not os.path.exists(path_of(k)))]
    if not todo:
        print("전부 이미 있음"); sys.exit(0)

    jobs = {}
    for k in todo:
        desc, w, h = PARTS[k]
        try:
            t = text_of(mcp("create_map_object", {"description": desc,
                                                  "width": w, "height": h, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m: print(f"실패 {k} — {t[:160]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e:
            print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)

    for rnd in range(80):
        left = {k: v for k, v in jobs.items() if not os.path.exists(path_of(k))}
        if not left: break
        for k, oid in left.items():
            try:
                r = mcp("get_map_object", {"object_id": oid})
                if "status: completed" not in text_of(r): continue
                for c in content(r):
                    if c.get("type") == "image" and c.get("data"):
                        os.makedirs(OUT, exist_ok=True)
                        open(path_of(k), "wb").write(base64.b64decode(c["data"]))
                        print(f"받음 {k}", flush=True)
            except Exception as e:
                print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs):
            time.sleep(15)

    got = [k for k in PARTS if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(PARTS)}장  " + " ".join(got), flush=True)
