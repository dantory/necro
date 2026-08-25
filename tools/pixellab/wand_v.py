#!/usr/bin/env python3
"""V-52b — 지팡이 하나만 «제 칸 모양»을 안 따른다. 세로로 선 지팡이를 다시 굽는다.

지팡이 칸은 `sz:[1,3]` — 1 넓이 × 3 높이다. 그런데 그림은 64×64 정사각에
**비스듬히 누워** 있어서, `background:contain` 이 가로에 맞추는 순간 위아래가
통째로 빈다(인물도 9% · 가방 5%). V-53 의 여백 자르기로는 못 고친다 —
여백이 아니라 **그려진 모양 자체가 가로로 퍼져 있어서**다.

그래서 **칸 비율대로(48×144) 세로로 선 지팡이**를 한 장 굽는다.
옛 그림은 `assets/ui/gear/_src/wand.png` 와 `_rejected/wand_diag.png` 에 남는다.

    python3 tools/pixellab/wand_v.py
"""
import base64, json, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "ui", "gear")
DST  = os.path.join(OUT, "wand.png")

# gear.py 와 같은 결(뼈·검은 쇠·바랜 금). 다른 것은 **자세뿐**이다 —
# 옛 글월의 "standing upright diagonally" 가 「비스듬히」를 데려왔다.
# 부정어로 막지 말고([[pixellab-side-attack-failures]]) **세로를 가리키는 낱말만** 쓴다.
TONE = ("MEDIUM BONE WHITE AND DARK IRON AND DULL GOLD, desaturated, moderate contrast, "
        "evenly lit, no vignette, absolutely no blue, no purple, no violet, no teal, "
        "Diablo 2 inventory item icon, grim gothic pixel art")
ONE  = ("ONE single item only, centered, filling the image, transparent background, "
        "not a sheet, no grid, no duplicates, no text, no numbers, no frame, no border")
DESC = (f"{TONE}, {ONE}, a thick heavy necromancer staff standing perfectly vertical, "
        "a wide gnarled bone shaft running from the very bottom of the image to the very "
        "top, a large horned skull crowning its top end with curved ram horns spreading "
        "wide to both sides, rib bones and iron rings bound along the shaft, dark leather "
        "grip wrapped around the middle, a broad splayed bone claw at its foot, "
        "chunky and massive, full length, side view")
W, H = 48, 144
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

if __name__ == "__main__":
    t = text_of(mcp("create_map_object", {"description": DESC, "width": W, "height": H, **COMMON}))
    m = re.search(r"id:\s*(\S+)", t)
    if not m:
        print(f"실패 — {t[:300]}", flush=True); sys.exit(1)
    oid = m.group(1); print(f"줄 세움 {oid}", flush=True)
    tmp = os.path.join(ROOT, "tmp", "wand_v.png")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    for rnd in range(80):
        try:
            r = mcp("get_map_object", {"object_id": oid})
            if "status: completed" in text_of(r):
                for c in content(r):
                    if c.get("type") == "image" and c.get("data"):
                        open(tmp, "wb").write(base64.b64decode(c["data"]))
                        print(f"받음 → {tmp}", flush=True)
                        sys.exit(0)
                print(f"완료인데 그림이 없다 — {text_of(r)[:200]}", flush=True); sys.exit(1)
        except Exception as e:
            print(f"대기 — {str(e)[:80]}", flush=True)
        time.sleep(15)
    print("시간 초과", flush=True); sys.exit(1)
