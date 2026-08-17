#!/usr/bin/env python3
"""아래 판 **메뉴 띠**의 아이콘 다섯 장을 굽는다 (병수님 2026-08-17 21:23 「아이콘 형태로」).

`icons.py`(스킬 아이콘)와 **같은 길**이다 — `create_map_object` 로 한 장씩, 64×64.
로컬에서 대충 그리거나 유니코드 기호를 넣지 않는다: 주변이 전부 픽셀아트라
매끈한 글리프 하나가 통째로 튄다(그 교훈이 icons.py 머리말에 적혀 있다).

    python3 tools/pixellab/menu_icons.py            # 없는 것만
    python3 tools/pixellab/menu_icons.py --force    # 전부 다시

★ 다섯이 **46px 칸에서 서로 갈라져야** 한다. 그래서 형태를 하나씩 다르게 못 박았다:
  사람 / 자루 / 나무 / 검 둘 / 두루마리. 「메뉴 아이콘」처럼 뭉뚱그리면 다 비슷해진다.
★ 그림이 안 와도 화면은 안 깨진다 — `menuLayout` 이 `onerror` 로 그림만 숨기고
  **글자가 대신 선다**(빈 네모를 세우지 않는다).
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "ui", "menu")

# 칸이 어둡고 46px 이라 **밝고 단순한 실루엣**이어야 읽힌다(스킬 아이콘과 같은 결).
TONE = ("dark gothic Diablo 2 interface icon, single centered emblem on transparent background, "
        "bold readable silhouette, bone white and old gold, torchlit, "
        "no frame, no border, no text, one object only")
ICONS = {
  # 능력치 — D2 의 캐릭터 단추. 「몸」이 읽혀야 한다.
  "stat":     f"{TONE}, a hooded necromancer bust seen from the front, shoulders and cowl, "
              "pale skull face inside the hood",
  # 가방 — 인벤토리. 자루 하나로 못 박는다(가방이라 하면 배낭·상자로 갈린다).
  "bag":      f"{TONE}, a bulging leather drawstring pouch tied with a cord, "
              "seen from the front, worn and stitched",
  # 스킬 — 트리. 「나무」라고만 하면 풍경이 되므로 **뼈 가지**로 못 박는다.
  "tree":     f"{TONE}, a bare branching tree made of bones, three forking limbs, "
              "flat front view emblem",
  # 편성 — 어떤 군대를 세울지. 두 자루가 교차한 형태가 「짜는 것」으로 읽힌다.
  "doctrine": f"{TONE}, two crossed bone swords forming an X, hilts at the bottom",
  # 운용 — 주술을 언제 쓸지. 펼친 두루마리에 룬 하나.
  "tactic":   f"{TONE}, an unrolled parchment scroll with a single glowing violet rune on it, "
              "curled top and bottom edges",
}
COMMON = {"outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}

def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: raise RuntimeError(f"{tool} 실패: {r.stderr[:200]}")
    return json.loads(r.stdout)

def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text","") for c in content(r) if c.get("type")=="text")
def path_of(k): return os.path.join(OUT, k + ".png")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    force = "--force" in sys.argv
    todo = [k for k in ICONS if force or not os.path.exists(path_of(k))]
    jobs = {}
    for k in todo:                                   # 먼저 전부 줄 세운다(굽는 데 몇 분씩 걸린다)
        try:
            t = text_of(mcp("create_map_object", {"description": ICONS[k],
                                                  "width": 64, "height": 64, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m: print(f"실패 {k} — {t[:150]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e: print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    for rnd in range(50):                            # 그다음 돌아가며 받는다
        left = {k: v for k, v in jobs.items() if not os.path.exists(path_of(k))}
        if not left: break
        for k, oid in left.items():
            try:
                r = mcp("get_map_object", {"object_id": oid})
                if "status: completed" not in text_of(r): continue
                for c in content(r):
                    if c.get("type") == "image" and c.get("data"):
                        open(path_of(k), "wb").write(base64.b64decode(c["data"]))
                        print(f"받음 {k}", flush=True)
            except Exception as e: print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs): time.sleep(15)
    got = [k for k in ICONS if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(ICONS)}장  " + " ".join(got), flush=True)
