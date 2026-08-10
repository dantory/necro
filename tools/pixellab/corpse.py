#!/usr/bin/env python3
"""바닥에 남는 **시체** 세 장을 굽는다 → assets/fx/corpse_<이름>.png

이 게임의 엔진은 시체다 — 적이 죽으면 시체가 남고, 그 시체로 소환하고, 내 소환수도
죽으면 시체가 된다. 그런데 **화면에는 시체가 한 구도 없었다.** 판 아래 「시체 7」 이라는
숫자만 있고, 자원이 어디에 얼마나 쌓였는지가 눈에 안 보인다.
그래서 시체를 판에 그린다. 그리려면 그림이 있어야 한다.

세 장으로 나눈 이유 — 죽은 놈의 덩치가 다르면 남는 것도 달라야 한다:
  small : 타락자·해골 같은 작은 것
  large : 브루트·골렘 같은 덩치
  bones : 오래돼 뼈만 남은 것(소환수가 죽으면 이쪽)

**위에서 비스듬히 내려다본 각도**로 못박는다(판이 그 시점이다). 서 있는 그림이 오면
시체로 안 읽힌다 — 「누워 있다」를 자세로 적는다.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
DST  = os.path.join(ROOT, "assets", "fx")

TONE = ("dark gothic Diablo 2 dungeon prop seen from a high top-down angle looking down at the "
        "floor, grim medieval horror, desaturated palette, heavy black shadows, "
        "transparent background, no floor tiles, no background, one object only, no text")

ICONS = {
  "corpse_small": f"{TONE}, a dead humanoid body lying flat face-down on the ground, arms sprawled "
                  "out to the sides, limp and motionless, small dark blood pool spreading under it",
  "corpse_large": f"{TONE}, a huge dead brute lying flat on its back on the ground, thick limbs "
                  "sprawled wide, broad chest, limp and motionless, wide dark blood pool under it",
  "corpse_bones": f"{TONE}, a collapsed heap of pale bones lying flat on the ground, a cracked "
                  "skull resting on its side among ribs and long bones, no flesh, dry and grey",
}
COMMON = {"outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:200]}")
    return json.loads(r.stdout)


def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text", "") for c in content(r) if c.get("type") == "text")
def path_of(k): return os.path.join(DST, k + ".png")


if __name__ == "__main__":
    force = "--force" in sys.argv
    os.makedirs(DST, exist_ok=True)
    todo = [k for k in ICONS if force or not os.path.exists(path_of(k))]
    print(f"굽을 것 {len(todo)}장", flush=True)
    jobs = {}
    for k in todo:
        try:
            t = text_of(mcp("create_map_object", {"description": ICONS[k],
                                                  "width": 64, "height": 64, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m:
                print(f"실패 {k} — {t[:150]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e:
            print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    for rnd in range(80):
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
    got = [k for k in ICONS if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(ICONS)}장  " + " ".join(got), flush=True)
    sys.exit(0 if len(got) == len(ICONS) else 1)
