#!/usr/bin/env python3
"""스킬 아이콘 다섯 개를 굽는다.

**판에서 제일 겉돌던 것이 이것이었다.** 칸 안에 유니코드 기호(☠ ✦ ◆ ✹ ✜)를 넣어
뒀는데, 주변이 전부 픽셀아트라 시스템 폰트 글자 하나가 통째로 튄다. 매끈한 벡터
글리프와 계단 진 픽셀은 같은 화면에 못 선다.

`create_map_object` 로 굽는다 — 아이콘 한 장은 **1생성**이라 UI 패널(20생성)보다 훨씬 싸고,
단일 오브젝트라 결과도 안정적이다.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")

# 칸이 어두우므로 아이콘은 **밝고 실루엣이 단순**해야 42px 에서 읽힌다.
TONE = ("dark gothic Diablo 2 skill icon, single centered emblem on transparent background, "
        "bold readable silhouette, bone white and gold and blood red, torchlit, "
        "no frame, no border, no text, one object only")
ICONS = {
  "raise": f"{TONE}, a horned skull with a faint blue soul flame rising from it",
  "ghoul": f"{TONE}, a clawed rotting hand bursting upward out of the ground",
  # ★ 1차는 "blocky fist" 를 **정육면체 블록**으로 해석해 주먹이 안 나왔다.
  # 손가락을 세어 말해야 주먹으로 그린다.
  "golem": f"{TONE}, a huge clenched stone fist seen from the side, four thick fingers and a "
           "thumb clearly visible, cracked clay with glowing orange fissures in the cracks",
  "nova":  f"{TONE}, an exploding burst of crimson gore and bone shards radiating outward",
  # ★ 1차는 "rune" 을 **십자가**로 그렸다. 저주로 읽히려면 형태를 직접 말해야 한다 —
  # 디아블로 2 의 저주는 머리 위에 떠오르는 해골 문양이다.
  "amp":   f"{TONE}, a skull sigil wreathed in swirling dark violet curse energy, "
           "downward pointing arrows around it, arcane and menacing, not a cross",
  # ★ 2단계 ⑥ 의 시체 소비처 셋(burn/wall/offer)은 아이콘 없이 나갔다 — 벨트에서
  # 빈 칸으로 보였다(2026-08-13 자 icon_qa 가 「빠진 칸 3」). 같은 TONE 으로 채운다.
  # 셋의 성격이 42px 에서도 갈라져야 한다: 불 / 벽 / 잔.
  "burn":  f"{TONE}, a skull engulfed in emerald green flames, thin blue mana wisps "
           "curling upward out of the fire",
  # ★ 1차는 "barricade" 를 **아이소메트릭 사당 건물**로 그렸다(바닥판까지 딸려 왔다).
  # create_map_object 는 「구조물」 낱말을 들으면 판 위에 세운다 — 세우지 말고
  # **화면을 가득 채운 무더기**로 말해야 정면 문양으로 나온다.
  "wall":  f"{TONE}, a row of three skulls stacked shoulder to shoulder with long rib bones "
           "crossing over them like a fence, filling the whole frame, flat front view emblem",
  "offer": f"{TONE}, an ornate chalice made of bone overflowing with blood, "
           "dark red glow pooling around its base",
}
COMMON = {"outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}

def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: raise RuntimeError(f"{tool} 실패: {r.stderr[:200]}")
    return json.loads(r.stdout)

def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text","") for c in content(r) if c.get("type")=="text")

if __name__ == "__main__":
    force = "--force" in sys.argv
    todo = [k for k in ICONS
            if force or not os.path.exists(os.path.join(ROOT,"assets","ui","icon",k+".png"))]
    jobs = {}
    for k in todo:                                   # 먼저 전부 줄 세운다
        try:
            t = text_of(mcp("create_map_object", {"description": ICONS[k],
                                                  "width": 64, "height": 64, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m: print(f"실패 {k} — {t[:150]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e: print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    for rnd in range(50):                            # 그다음 돌아가며 받는다
        left = {k:v for k,v in jobs.items()
                if not os.path.exists(os.path.join(ROOT,"assets","ui","icon",k+".png"))}
        if not left: break
        for k, oid in left.items():
            try:
                r = mcp("get_map_object", {"object_id": oid})
                if "status: completed" not in text_of(r): continue
                for c in content(r):
                    if c.get("type")=="image" and c.get("data"):
                        p = os.path.join(ROOT,"assets","ui","icon",k+".png")
                        os.makedirs(os.path.dirname(p), exist_ok=True)
                        open(p,"wb").write(base64.b64decode(c["data"]))
                        print(f"받음 {k}", flush=True)
            except Exception as e: print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(os.path.join(ROOT,"assets","ui","icon",k+".png")) for k in jobs):
            time.sleep(15)
    got=[k for k in ICONS if os.path.exists(os.path.join(ROOT,"assets","ui","icon",k+".png"))]
    print(f"══ {len(got)}/{len(ICONS)}장  " + " ".join(got), flush=True)
