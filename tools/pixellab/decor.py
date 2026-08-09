#!/usr/bin/env python3
"""던전을 **방**으로 만드는 조각들 — 병수님: "배경도 던전처럼 잘 다시 만들어봐".

바닥만 깔면 **끝없는 벌판**이다. 던전으로 읽히려면 셋이 더 있어야 한다:

  · **벽** — 여기가 끝이라는 것. 벽이 없으면 방이 아니다
  · **기둥** — 세로로 선 것이 있어야 공간에 높이가 생긴다
  · **소품** — 관·뼈무더기·화로. 사람이 살았던 자리라는 표시

`create_map_object` 를 쓴다(1생성, 단일 오브젝트에 강하다). `create_ui_asset` 은
자꾸 「에셋 시트」를 준다(d2r.py 교훈).

★ 색은 **맨 앞에 대문자로**. 중간에 적으면 묻혀서 청보라가 나온다.
★ 소품은 **어둡게 굽지 않는다** — 어둠은 조명이 만든다(floor.py 에서 배운 것).
  다만 벽은 바닥보다 **한 단계 어두워야** 뒤로 물러나 보인다.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "decor")

TONE = ("MEDIUM GREY STONE AND BONE, desaturated, moderate contrast, evenly lit, "
        "no vignette, no shadows baked in, "
        "absolutely no blue, no purple, no violet, no teal, no green, "
        "Diablo 2 crypt, grim gothic pixel art")
ONE  = ("ONE single object only, centered, transparent background, "
        "not a sheet, no grid of items, no duplicates, no text, no numbers")

PARTS = {
  # ── 벽 ── 좌우로 이어 붙인다. 끝을 잘라 달라고 못박아야 이어진다.
  "wall": (f"{TONE}, {ONE}, a straight horizontal section of ancient stone dungeon wall "
           "seen from slightly above, big rough blocks with deep mortar joints, "
           "flat top edge, the left and right ends are cut off mid-block so copies tile "
           "edge to edge, no corners, no end caps, no doorway", 128, 64),
  # ── 기둥 ── 세로로 선 것. 공간에 높이를 준다.
  "pillar": (f"{TONE}, {ONE}, a tall broken stone column standing upright, cracked shaft, "
             "chipped capital, crumbling base, vertical, full body", 64, 128),
  # ── 소품 넷 ── 사람이 살았던(죽었던) 자리라는 표시
  "coffin": (f"{TONE}, {ONE}, a heavy stone sarcophagus lying on the ground seen from above "
             "at an angle, cracked lid slightly pushed aside, carved edge", 96, 64),
  "bones":  (f"{TONE}, {ONE}, a small pile of pale skulls and bones heaped on the ground, "
             "seen from above at an angle, low and wide", 64, 48),
  "brazier": (f"{TONE}, {ONE}, an iron brazier bowl on three legs with dim orange embers "
              "glowing inside, upright, no big flame, no light rays", 48, 64),
  "rubble": (f"{TONE}, {ONE}, a low heap of broken stone rubble and dust on the ground, "
             "seen from above at an angle, flat and scattered", 64, 40),
}

# ★★ **허용값은 도구마다 다르다.** create_topdown_tileset 은 "highly detailed" 를
# 받는데 create_map_object 는 "high detail" 을 받는다 — 같은 열쇠 이름에 다른 낱말이다.
# floor.py 에 그렇게 적어 놓고도 여기서 거꾸로 넣어 여섯 장을 다 튕겼다.
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
    for k in todo:                                   # 먼저 전부 줄 세운다
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
