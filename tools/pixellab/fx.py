#!/usr/bin/env python3
"""**판에서 터지는 그림** 넷을 굽는다 (2026-08-15, 병수님: "또 스킬 이펙트 에셋 제대로 안만든거 있네").

아이콘(벨트 칸)은 여덟 개가 다 있는데, **판 위에서 터지는 그림**은 둘뿐이었다
(`nova.png`·`raise.png`). 나머지는 이랬다:

  · 약화의 저주(amp)  — **아무것도 안 뜬다.** 로그 한 줄이 전부
  · 백골 벽(wall)      — 그림이 없어 **회색 타원 + 테두리**로 그린다
  · 시체 태우기(burn) — **소환 그림**(raise.png)을 빌려 쓴다 (태우는데 소환)
  · 제물(offer)        — **폭발 그림**(nova.png)을 빌려 쓴다 (바치는데 폭발)

그리는 쪽이 모르는 kind 를 전부 `hit`/`nova` 로 떨어뜨리기 때문에 **404 가 안 난다** —
없는 것이 「비슷한 게 뜨는 것」으로 위장됐다. 그래서 눈으로 볼 때까지 안 걸렸다.

바닥에 눕혀 그리는 것(저주 고리·벽)과 위로 솟는 것(불길·제물)을 나눠 말한다.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "fx")

# 판은 어둡고 갈색이다. 이펙트는 **판보다 밝고 채도가 높아야** 눈에 든다 —
# 오늘 로드맵에서 「피해 숫자가 바닥돌과 같은 갈색」이 걸린 것과 같은 자리다.
TONE = ("dark gothic Diablo 2 spell effect sprite, on fully transparent background, "
        "glowing and readable over a dark brown stone floor, no frame, no border, no text, "
        "no character, no ground plate, effect only")

FX = {
  # 저주 — **땅에 눕는다.** 적 무리 위에 깔리는 고리라 위에서 내려다본 타원이어야 한다.
  "curse": f"{TONE}, top-down flat ring of swirling dark violet curse runes on the ground, "
           "elliptical seen from above, skull sigils around the rim, sickly purple glow, "
           "hollow center",
  # 백골 벽 — 길목을 막는 무더기. 세워서 정면으로 본다(바닥판이 딸려 오면 못 쓴다).
  # ★ 1차는 **돌 바닥판**을 깔고 그 위에 세웠다(체크리스트 「바닥판이 딸려 오면 못 쓴다」가
  #   바로 이것이다 — 판에 놓으면 돌판이 던전 바닥 위에 겹쳐 뜬다). 게다가 주황 불빛이
  #   섞여 이 판에서 제일 밝은 축이 됐다. 바닥·불을 낱말로 끊고 **뼈만** 남긴다.
  "bonewall": f"{TONE}, a cluster of jagged bones and skulls jutting upward, floating with "
              "nothing beneath them, dull bone white and grey, no fire, no glow, no orange, "
              "no stone platform, no pedestal, no base slab, no ground, no rocks",
  # 태우기 — 초록 불길 + 위로 오르는 마나. 아이콘(burn)과 같은 색 약속을 지킨다.
  "burnfx": f"{TONE}, a column of emerald green flame rising, thin cyan mana wisps curling "
            "upward out of it, embers, tall vertical flame",
  # 제물 — 주인에게 바치는 기운. 폭발과 헷갈리면 안 되므로 **위로 빨려 올라가는** 결로.
  # ★ 1차는 아래에 **받침**을 그렸다(bonewall 과 같은 함정). 기둥만 남긴다.
  "offerfx": f"{TONE}, a narrow vertical beam of dark violet energy rising, swirling motes "
             "spiralling up along it, tapering to nothing at the bottom, "
             "no stone platform, no pedestal, no base slab, no ground, no altar",
}
SIZE = {"curse": (96, 96), "bonewall": (80, 80), "burnfx": (64, 96), "offerfx": (64, 96)}
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
    force = "--force" in sys.argv
    todo = [k for k in FX if force or not os.path.exists(path_of(k))]
    jobs = {}
    for k in todo:
        w, h = SIZE[k]
        try:
            t = text_of(mcp("create_map_object", {"description": FX[k],
                                                  "width": w, "height": h, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            # ★ 응답 **본문**을 본다 — 동시잡 한도(20)에 걸리면 거부되는데 예외는 안 난다
            #   (2026-08-12 에 이걸 안 보고 「줄 세웠다」고 보고했다가 대부분 거부돼 있었다).
            if not m: print(f"실패 {k} — {t[:160]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e: print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    for rnd in range(60):
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
            except Exception as e: print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs): time.sleep(15)
    got = [k for k in FX if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(FX)}장  " + " ".join(got), flush=True)
