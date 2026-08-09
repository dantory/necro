#!/usr/bin/env python3
"""마을을 **제대로** 다시 — 병수님: "마을에 쓸데 없는 무덤 같은거 없애라,, 그냥 바닥을
제대로 만들어, 그리고 던전입구/상인/대장간 같은거또 둥둥 떠잇네,, 그리고 건물이 너무
작고 건물만 있는게 아니라 건물에 실제 상인이나 대장장이 NPC가 있어야 더 그럴듯하지 않을까?"

**던전 소품을 마을에 뿌린 것이 잘못이었다.** 관과 뼈무더기가 굴러다니는 곳은 마을이
아니라 공동묘지다. 마을에는 마을 것이 있어야 한다 — 통·궤짝·수레·우물.

바닥도 마찬가지. 던전 돌바닥을 그대로 깔면 실내에 서 있는 그림이 된다.
마을은 **흙길**이다.

건물은 **키워서** 다시 굽는다(112 → 176). 사람이 드나드는 곳인데 사람만 했다.

  python3 tools/pixellab/town2.py           # 아직 없는 것만
"""
import base64, json, os, re, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "town")

TONE = ("MEDIUM WARM BROWN WOOD AND GREY STONE, desaturated, moderate contrast, evenly lit, "
        "no vignette, no shadows baked in, not dark, "
        "absolutely no blue, no purple, no violet, no teal, no bright green, "
        "Diablo 2 rogue encampment, grim gothic pixel art")
ONE  = ("ONE single object only, centered, transparent background, "
        "not a sheet, no grid of items, no duplicates, no text, no numbers")

# ── 건물 ── **크게.** 사람이 드나드는 곳인데 사람만 했다.
OBJ = {
  "shop":  (f"{TONE}, {ONE}, a merchant's market stall: a wooden counter under a patched "
            "canvas awning, shelves of pots and bundles behind it, crates and barrels "
            "stacked at the side, seen from above at an angle, wide", 176, 144),
  "forge": (f"{TONE}, {ONE}, a blacksmith workshop: a stone forge with glowing orange coals "
            "and a chimney, an iron anvil in front, a rack of tools and a water trough, "
            "seen from above at an angle, wide", 176, 144),
  "gate":  (f"{TONE}, {ONE}, a stone stairway descending into a dark crypt entrance set in "
            "the ground, a carved arch of old stone over it with a hanging lantern, "
            "the steps disappear into blackness, seen from above at an angle", 144, 144),
  # ── 마을 소품 ── 관·뼈무더기 대신 **사람이 쓰는 것**
  "barrel": (f"{TONE}, {ONE}, a wooden barrel with iron hoops standing upright, "
             "seen from above at an angle", 48, 56),
  "crate":  (f"{TONE}, {ONE}, a wooden crate with plank seams, seen from above at an angle",
             48, 48),
  "cart":   (f"{TONE}, {ONE}, a small wooden hand cart with two spoked wheels, empty bed, "
             "seen from above at an angle", 96, 64),
  "well":   (f"{TONE}, {ONE}, a round stone well with a wooden roof and a bucket on a rope, "
             "seen from above at an angle", 80, 96),
  "sacks":  (f"{TONE}, {ONE}, two burlap sacks of grain leaning together on the ground, "
             "seen from above at an angle", 56, 48),
}

# ── 마을 바닥 ── 던전 돌바닥이 아니라 **흙길**
TILESET = {
  "town": dict(
    lower_description=f"{TONE}, packed dirt road with scattered small pebbles and wagon ruts, "
                      "sparse dry grass tufts, evenly lit flat texture",
    upper_description=f"{TONE}, worn cobblestone paving",
    transition_description="edge where dirt meets cobblestone"),
}

COMMON  = {"outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}
TSCOMMON = dict(tile_size={"width": 32, "height": 32}, transition_size=0.5,
                view="high top-down", outline="selective outline",
                shading="detailed shading", detail="highly detailed", shape_style="square")

def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: raise RuntimeError(f"{tool} 실패: {r.stderr[:250]}")
    return json.loads(r.stdout)
def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text","") for c in content(r) if c.get("type")=="text")
def path_of(k): return os.path.join(OUT, k + ".png")

if __name__ == "__main__":
    force = "--force" in sys.argv
    # 타일셋 먼저 줄 세운다(제일 오래 걸린다)
    ts = {}
    if force or not os.path.exists(os.path.join(ROOT, "assets", "floor", "town_tile.png")):
        for k, a in TILESET.items():
            args = dict(a); args.update(TSCOMMON)
            t = text_of(mcp("create_topdown_tileset", args))
            m = re.search(r"([0-9a-f-]{36})", t)
            if m: ts[k] = m.group(1); print(f"타일셋 줄 세움 {k} {ts[k]}", flush=True)
            else: print(f"타일셋 실패 — {t[:200]}", flush=True)
    json.dump(ts, open(os.path.join(HERE, "town_ts.json"), "w"))

    todo = [k for k in OBJ if force or not os.path.exists(path_of(k))]
    jobs = {}
    for k in todo:
        desc, w, h = OBJ[k]
        try:
            t = text_of(mcp("create_map_object", {"description": desc, "width": w, "height": h, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m: print(f"실패 {k} — {t[:160]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e: print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    for rnd in range(90):
        left = {k:v for k,v in jobs.items() if not os.path.exists(path_of(k))}
        if not left: break
        for k, oid in left.items():
            try:
                r = mcp("get_map_object", {"object_id": oid})
                if "status: completed" not in text_of(r): continue
                for c in content(r):
                    if c.get("type")=="image" and c.get("data"):
                        os.makedirs(OUT, exist_ok=True)
                        open(path_of(k),"wb").write(base64.b64decode(c["data"]))
                        print(f"받음 {k}", flush=True)
            except Exception as e: print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs): time.sleep(15)
    got=[k for k in OBJ if os.path.exists(path_of(k))]
    print(f"══ 물건 {len(got)}/{len(OBJ)}  " + " ".join(got), flush=True)
