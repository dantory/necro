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
# ★ **살아 있는 그림을 바로 덮지 않는다**(V-15b — rebuild.py 가 좋은 것을 갈아엎었다).
#   `--out=tmp/decorbake` 로 딴 곳에 받아 **보고 재고 나서** 옮긴다.
#   (V-36b 가 icons.py 에 낸 손잡이를 여기로 옮긴다 · [[carry-fixes-forward]])
for _a in sys.argv[1:]:
    if _a.startswith("--out="):
        OUT = os.path.abspath(os.path.join(ROOT, _a[6:]))

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
  # ── V-41 ── 다섯 장이 되풀이되는 것을 아홉으로 늘린다. **실루엣이 갈리는 것**만 고른다.
  #   ★ 낱말이 생김새를 정한다(V-36b·V-37): 「column」 은 세우는 낱말이라 눕히려면
  #     **누운 것의 생김새**를 말해야 한다 — 「쓰러진 나무처럼」.
  "column2": (f"{TONE}, {ONE}, a toppled stone column lying flat on the ground like a felled "
              "tree trunk, broken apart into three round drum segments that lie end to end "
              "with gaps between them, seen from above at an angle, long and low, horizontal",
              96, 48),
  #   ★ 「skeleton」 하나만 쓰면 서 있는 해골이 온다 — **누워 흩어진 것**임을 말한다.
  "bones2": (f"{TONE}, {ONE}, a single human skeleton sprawled flat on its back on the ground, "
             "ribcage open, arms flung out to the sides, skull turned aside, seen from above "
             "at an angle, spread wide and flat", 64, 48),
  #   ★ 항아리는 **불이 없다** — 화로와 갈리는 자리가 그것이다.
  "urn": (f"{TONE}, {ONE}, a cracked stone burial urn standing upright on the ground, "
          "round wide belly, narrow neck, heavy chipped lid tilted on top, "
          "dark empty crack down one side, cold and unlit", 48, 64),
  #   ★ V-155 — 소품 열 장 중 **상자만 빠져 있었다**(코드가 fillRect 로 그리고 있었다).
  #     1차 굽기(05:02)가 **파란 강철 테 + 발밑 잔디**로 왔다 — 「tarnished iron」이 청강철을
  #     부르고, 굽는 쪽은 늘 **제 바닥판을 달아 보낸다**([[sprite-brings-its-own-ground]]).
  #     그래서 이것만 **제 색을 맨 앞에 따로** 세우고(공용 TONE 의 회색을 덮는다),
  #     바닥에 붙는 것들을 낱말로 하나씩 끊는다.
  "chest": ("DARK BROWN WOOD AND WARM BRASS, desaturated, moderate contrast, evenly lit, "
            "no vignette, no shadows baked in, "
            "absolutely no blue, no steel blue, no purple, no violet, no teal, no green, "
            f"Diablo 2 crypt, grim gothic pixel art, {ONE}, "
            "a closed treasure chest of dark brown planks bound with warm brass bands "
            "and a heavy brass lock plate on the front, domed lid shut tight, "
            "seen from above at an angle, worn planks, dull brass fittings, "
            "floating alone on empty transparent background, "
            "no grass, no dirt, no soil, no plants, no moss, no stones, no rocks, "
            "no ground, no floor, no base under it, no coins spilling out, no open lid",
            64, 56),
  #   ★ V-156 — 상자를 고치다 **계단도 같은 네모**인 것을 봤다(drawStairs 가 strokeRect
  #     + 초록 줄). 층마다 **반드시 찾아야 하는 것**인데 상자보다도 싸구려다
  #     ([[carry-fixes-forward]] — 한 번 고친 규칙은 옆 것에도 옮긴다).
  #     내려가는 구멍이라 **위에서 내려다본** 결이어야 하고, 바닥판을 달고 오면 안 된다.
  "stairs": ("MEDIUM GREY STONE, desaturated, moderate contrast, evenly lit, "
             "no vignette, no shadows baked in, "
             "absolutely no blue, no steel blue, no purple, no violet, no teal, no green, "
             f"Diablo 2 crypt, grim gothic pixel art, {ONE}, "
             # 1차는 「directly above」로 **계단 없는 시커먼 문짝**, 2차는 「three quarter」로
             # **위로 올라가는 아이소메트릭 계단**을 줬다. 셋째는 「구멍」을 주어로 세우고
             # 계단을 그 안에 넣는다 — 우리에게 필요한 건 «내려가는 자리»다.
             "a dark rectangular pit opening in a stone floor, top down view, three worn stone "
             "steps leading down into the pit and receding away from the viewer, each step "
             "darker than the one above it, the deepest step swallowed by black shadow, "
             "heavy chipped stone lip framing all four sides of the opening, "
             "floating alone on empty transparent background, "
             "no grass, no dirt, no plants, no moss, no railing, no door, no arch, no text",
             72, 72),
  #   ★ 석상은 기둥과 키가 같아 **머리 없는 사람 모양**이라야 갈린다.
  "statue": (f"{TONE}, {ONE}, a weathered stone statue of a hooded mourning figure standing "
             "on a square plinth, the head broken off leaving a jagged stump at the neck, "
             "robes carved in deep folds, arms crossed over the chest, vertical, full body",
             64, 128),
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
