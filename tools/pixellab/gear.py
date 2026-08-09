#!/usr/bin/env python3
"""장비 아이콘 — 병수님: "대장간과 상인 눌렀을때 메뉴가 너무 단조로운느낌".

**글자만 있는 줄은 표지, 그림이 붙으면 물건이다.** 상점이 「목록」이 아니라 「가게」로
읽히려면 살 것이 눈에 보여야 한다. 등급마다 다른 그림을 굽는 것이 이상적이지만
15장은 과하므로 **종류당 한 장**을 굽고 등급은 점으로 나타낸다.

★ create_map_object(1생성) · detail 은 "high detail" · 색은 맨 앞에 대문자로.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "ui", "gear")

TONE = ("MEDIUM BONE WHITE AND DARK IRON AND DULL GOLD, desaturated, moderate contrast, "
        "evenly lit, no vignette, absolutely no blue, no purple, no violet, no teal, "
        "Diablo 2 inventory item icon, grim gothic pixel art")
ONE  = ("ONE single item only, centered, filling the image, transparent background, "
        "not a sheet, no grid, no duplicates, no text, no numbers, no frame, no border")

PARTS = {
  "wand":  (f"{TONE}, {ONE}, a necromancer wand made of a carved bone shaft with a small "
            "skull at the top, wrapped in dark leather, standing upright diagonally", 64, 64),
  "robe":  (f"{TONE}, {ONE}, a dark hooded robe laid flat, tattered hem, bone clasps "
            "at the collar, front view", 64, 64),
  "charm": (f"{TONE}, {ONE}, an amulet: a small carved bone talisman hanging from a "
            "dark cord, faint amber glow in its center, front view", 64, 64),
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
def text_of(r): return "\n".join(c.get("text","") for c in content(r) if c.get("type")=="text")
def path_of(k): return os.path.join(OUT, k + ".png")

if __name__ == "__main__":
    todo = [k for k in PARTS if not os.path.exists(path_of(k))]
    if not todo: print("전부 이미 있음"); sys.exit(0)
    jobs = {}
    for k in todo:
        desc, w, h = PARTS[k]
        t = text_of(mcp("create_map_object", {"description": desc, "width": w, "height": h, **COMMON}))
        m = re.search(r"id:\s*(\S+)", t)
        if not m: print(f"실패 {k} — {t[:160]}", flush=True); continue
        jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True); time.sleep(1.2)
    for rnd in range(80):
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
    got=[k for k in PARTS if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(PARTS)}장  " + " ".join(got), flush=True)
