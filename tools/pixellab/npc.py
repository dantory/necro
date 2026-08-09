#!/usr/bin/env python3
"""마을 NPC — 병수님: "건물만 있는게 아니라 건물에 실제 상인이나 대장장이 NPC가 있어야
더 그럴듯하지 않을까?"

맞다. **가게에 사람이 없으면 폐허다.** 물건만 놓인 좌판은 「버려진 자리」로 읽힌다.

NPC 는 서서 기다리기만 하므로 8방향도 애니도 필요 없다 — **create_character standard
4방향**(1생성)으로 굽고 south 한 장만 쓴다. 캐릭터와 같은 도구로 구워야 톤이 맞는다
(map_object 로 사람을 구우면 소품처럼 납작하게 나온다).
"""
import io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "npc")
STATE = os.path.join(HERE, "npc_state.json")

TONE = ("dark gothic Diablo 2 village character, grim medieval, desaturated palette of "
        "worn brown leather, dull iron, dirty linen, heavy black shadows")
NPCS = {
  "merchant": f"{TONE}, a stout old merchant in a hooded travel cloak with a heavy belt "
              "pouch, arms folded, standing and waiting, full body",
  "smith":    f"{TONE}, a burly blacksmith in a soot-stained leather apron, bare muscular "
              "arms, holding a smith hammer at his side, standing, full body",
}
DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]

def mcp(tool, args, timeout=420):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: raise RuntimeError(f"{tool} 실패: {r.stderr[:250]}")
    return json.loads(r.stdout)
def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text","") for c in content(r) if c.get("type")=="text")
def load(): return json.load(open(STATE)) if os.path.exists(STATE) else {}
def save(s): json.dump(s, open(STATE,"w"), ensure_ascii=False, indent=1)
def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]

if __name__ == "__main__":
    s = load()
    for k, desc in NPCS.items():
        if os.path.exists(os.path.join(OUT, k + ".png")): print(f"이미 있음 {k}"); continue
        if not s.get(k):
            t = text_of(mcp("create_character", {"description": desc, "name": f"necro-npc-{k}",
                "body_type": "humanoid", "mode": "standard", "n_directions": 4,
                "view": "low top-down", "size": 64,
                "outline": "single color outline", "detail": "high detail"}))
            m = re.search(r"([0-9a-f-]{36})", t)
            if not m: print(f"실패 {k} — {t[:200]}", flush=True); continue
            s[k] = m.group(1); save(s); print(f"줄 세움 {k} {s[k]}", flush=True)
    # 익을 때까지 기다렸다 받는다 — **상태를 믿지 말고 산출물로 판단한다**
    for rnd in range(90):
        left = [k for k in NPCS if s.get(k) and not os.path.exists(os.path.join(OUT, k + ".png"))]
        if not left: break
        for k in left:
            try:
                url = f"https://api.pixellab.ai/mcp/characters/{s[k]}/download"
                req = urllib.request.Request(url, headers={"Authorization": auth()})
                raw = urllib.request.urlopen(req, timeout=180).read()
                zf = zipfile.ZipFile(io.BytesIO(raw))
                os.makedirs(OUT, exist_ok=True)
                for n in zf.namelist():
                    if n.lower().endswith(".png") and "/rotations/" in n.lower():
                        d = os.path.basename(n)[:-4]
                        if d in DIRS:
                            open(os.path.join(OUT, f"{k}_{d}.png"), "wb").write(zf.read(n))
                            if d == "south":
                                open(os.path.join(OUT, k + ".png"), "wb").write(zf.read(n))
                print(f"받음 {k}", flush=True)
            except urllib.error.HTTPError as e:
                if e.code not in (423, 404): raise
                if rnd % 4 == 0: print(f"  아직 {k} ({e.code})", flush=True)
            except Exception as e: print(f"대기 {k} — {str(e)[:60]}", flush=True)
        if any(not os.path.exists(os.path.join(OUT, k + ".png")) for k in NPCS): time.sleep(20)
    got=[k for k in NPCS if os.path.exists(os.path.join(OUT, k + ".png"))]
    print(f"══ NPC {len(got)}/{len(NPCS)}  " + " ".join(got), flush=True)
