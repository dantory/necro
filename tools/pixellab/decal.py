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
BASE = ("grim gothic dark fantasy pixel art, top-down view straight down at the ground, "
        "desaturated earth palette, evenly lit, no vignette, "
        "absolutely no blue, no purple, no violet, no teal, no bright green, "
        "this is only a DISCOLOURATION OF THE GROUND, not an object: "
        "perfectly flat with zero depth, no rim, no lip, no bowl, no crater, "
        "no highlight, no specular, no gloss, no cast shadow, no outline at all, "
        "irregular organic blotch with soft ragged fading edges that dissolve into nothing, "
        "transparent background outside the patch, "
        "ONE patch only, no grid, no tiling, no border, no frame, no text")

OBJ = {
  # ── 던전 ── 밟아 닳은 자리·물자국·부스러기
  "dust":   (f"{BASE}, a patch of pale grey dust and grit scattered on a stone floor", 96, 96),
  "crack":  (f"{BASE}, a long jagged crack running across a stone floor with chipped edges "
             "and dark shadow inside the crack", 128, 96),
  "stain":  (f"{BASE}, a dark damp water stain soaked into a stone floor, darker at the "
             "centre and fading at the edges", 112, 112),
  "pebble": (f"{BASE}, a scatter of small broken stone chips and pebbles lying on the floor", 96, 80),
  # ── 마을 ── 흙길과 풀
  "path":   (f"{BASE}, a stretch of bare dirt path worn smooth by footsteps, slightly lighter "
             "than the surrounding ground, with faint wheel ruts", 160, 112),
  "grass":  (f"{BASE}, a sparse tuft of dry dead brown grass and weeds growing from the dirt", 80, 72),
  "mud":    (f"{BASE}, a shallow muddy puddle in packed dirt with a darker wet rim", 112, 96),
}

# ★ outline **lineless** — 얼룩에 선이 그어지면 그 순간 「물건」이 된다.
COMMON = {"outline": "lineless", "shading": "medium shading", "detail": "medium detail"}


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
