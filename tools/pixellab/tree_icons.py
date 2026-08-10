#!/usr/bin/env python3
"""스킬 트리 열다섯 칸의 아이콘을 굽는다 → assets/ui/tree/<id>.png

병수님: "픽셀랩 에셋좀 활용해서 더 이쁘게 못만드니?"

**앞서 아이콘을 붙였다가 뺀 건 그림이 나빠서가 아니라 자리를 잘못 잡아서였다** —
넷에만 붙이니 그 칸만 키가 커져 줄이 어긋났고, 바탕에 깔았더니 글자 뒤에서 얼룩이
됐다. 그래서 **열다섯 칸 전부** 굽는다. 모두가 그림을 가지면 줄은 저절로 맞는다.

`create_map_object` 로 한 장씩(=1생성). 동시 20생성 한도 안에 들어간다.

교훈 두 개를 그대로 지킨다(icons.py 에서 얻은 것):
  ① 형태를 **직접** 말한다. "blocky fist" 는 정육면체로, "rune" 은 십자가로 나왔다.
  ② 원하지 않는 것을 **말로 막는다**(no frame / no text / one object only).
줄기마다 색을 나눠 판의 색 구분(군세 뼈 · 시체 녹 · 주술 보라)과 맞춘다.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
DST  = os.path.join(ROOT, "assets", "ui", "tree")

BASE = ("dark gothic Diablo 2 skill icon, single centered emblem on transparent background, "
        "bold readable silhouette that stays legible at 32 pixels, torchlit, "
        "no frame, no border, no text, no letters, one object only")
# 줄기 빛깔 — 판에서 쓰는 색과 맞춘다
ARMY   = BASE + ", bone white and pale gold palette"
CORPSE = BASE + ", sickly green and rotting brown palette"
HEX_   = BASE + ", dark violet and cold blue palette"

ICONS = {
  # ── 군세 ──
  "bone":    f"{ARMY}, a single thick femur bone crossed by a smaller bone, wrapped in glowing sinew",
  "armor":   f"{ARMY}, a ribcage worn as a chestplate, curved rib bones forming armor plates",
  "ghoul":   f"{ARMY}, a clawed rotting hand with four long fingers bursting upward out of the ground",
  "legion":  f"{ARMY}, three small skeleton warriors standing side by side in a row, seen from the front",
  "golem":   f"{ARMY}, a huge clenched stone fist seen from the side, four thick fingers and a thumb "
             "clearly visible, cracked clay with glowing orange fissures",
  # ── 시체 ──
  "rot":     f"{CORPSE}, a skull half dissolved by green rot, dripping ooze, flies around it",
  "harvest": f"{CORPSE}, a curved scythe blade over a small pile of bones",
  "cheap":   f"{CORPSE}, a small blue soul flame burning inside an open skull, thin and economical",
  # ★ 1판은 "three small explosions in a row" 를 **모닥불 하나**로 그렸다. 이 칸의 효과는
  #   「폭발 범위 +25%」이므로 **퍼지는 고리**로 말하는 편이 뜻에도 그림에도 맞다.
  "chain":   f"{CORPSE}, a wide expanding shockwave ring seen from above, green fire along the "
             "ring edge, bone shards blasting outward from the center",
  "feast":   f"{CORPSE}, an open fanged maw devouring a corpse, swelling with fed flesh",
  # ── 주술 ──
  "wand":    f"{HEX_}, a bone wand held upright, a sharpened femur with a small skull on top",
  "swift":   f"{HEX_}, a skeletal hand with motion streaks trailing behind it, fingers spread, "
             "clearly a hand with five fingers",
  "deep":    f"{HEX_}, a floating skull sigil wreathed in swirling violet curse energy with "
             "downward pointing arrows around it, not a cross",
  # ★ 1판은 그냥 **보라 해골**이라 옆 칸(깊은 저주)과 구분이 안 됐다. 빨려 들어가는
  #   움직임을 말해야 「흡수」로 읽힌다.
  "spirit":  f"{HEX_}, a glowing pale blue soul wisp with a faint face, stretched and being sucked "
             "into a swirling funnel below it, motion streaks trailing behind it",
  "dark":    f"{HEX_}, a crown of thorned bone floating above a bowed skull, "
             "chains of violet light running down from it",
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
    for k in todo:                                   # ① 먼저 전부 줄 세운다
        try:
            t = text_of(mcp("create_map_object", {"description": ICONS[k],
                                                  "width": 64, "height": 64, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            # ★ 응답 **본문**으로 판정한다. 동시 한도를 넘으면 거부되는데, 그걸 안 보고
            #   "줄 세웠다"고 적었다가 통째로 놓친 적이 있다.
            if not m:
                print(f"실패 {k} — {t[:150]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e:
            print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)

    for rnd in range(80):                            # ② 그다음 돌아가며 받는다
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
