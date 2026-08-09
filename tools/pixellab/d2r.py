#!/usr/bin/env python3
"""디아블로 2 Resurrected 의 하단 판 조각을 굽는다 — 병수님: "이거 픽셀랩으로 제대로 뽑아봐".

**이번엔 실패 원인을 알고 굽는다.** 앞서 UI 를 세 번 구워 세 번 물렸고, 이유가 셋이었다:

  1. `create_ui_asset` 은 **자꾸 「에셋 시트」를 준다** — 조각 수십 개가 흩어진 한 장.
     게다가 장당 20생성으로 비싸다. `create_map_object` 는 **1생성**이고 단일 오브젝트에
     강하다(스킬 아이콘 다섯 장이 이쪽으로 잘 나왔다).
  2. **색을 안 적으면 제 취향으로 칠한다** — 보라 벽돌, 파란 담이 그렇게 나왔다.
     빼야 할 색까지 적는다.
  3. **"frame" 이라고 하면 액자를 준다.** 원하는 물건의 이름을 정확히 부른다.

참고 화면(병수님이 주신 D2R 스크린샷)에서 읽은 것:
  · 구슬 곁에 **석상**이 붙는다 — 왼쪽은 날개 접은 여인, 오른쪽은 뿔 달린 악마
  · 가운데는 **평평한 검은 띠**, 위아래로 금색 얇은 선
  · 전부 **검정 + 어두운 금 + 무쇠**. 채도가 거의 없다

결과는 assets/ui/d2r/<id>.png.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
OUT  = os.path.join(ROOT, "assets", "ui", "d2r")

# 색을 못 박는다. **빼야 할 색까지** 적는다 — 안 적으면 보라·파랑이 나온다.
TONE = ("Diablo 2 Resurrected game interface art, carved dark stone and black wrought iron "
        "with thin tarnished gold trim, torchlit, almost no saturation, grim gothic, "
        "no purple, no violet, no blue, no bright colors")
ONE  = ("ONE single object only, centered, filling the image edge to edge, "
        "not a sheet, no grid of items, no duplicates, no text, no numbers, "
        "transparent background")

# id: (설명, 가로, 세로)
PARTS = {
  # ── 석상 둘 ── D2R 판의 얼굴이다. 좌우가 **다른 놈**이어야 한다.
  "statue_l": (f"{TONE}, {ONE}, a carved grey stone statue of a mourning winged woman "
               "kneeling in profile facing right, folded feathered wings, weathered granite, "
               "full body, vertical", 96, 128),
  "statue_r": (f"{TONE}, {ONE}, a carved grey stone statue of a horned demon gargoyle "
               "crouching in profile facing left, bat wings folded, weathered granite, "
               "full body, vertical", 96, 128),
  # ── 가운데 띠 ── **좌우로 이어 붙일 수 있어야 한다.** 끝을 자르라고 못박는다.
  "bar":      (f"{TONE}, {ONE}, a flat horizontal strip of black iron plate with a single "
               "thin gold line running along the top edge and another along the bottom edge, "
               "seamless repeating texture, the left and right ends are cut off mid-pattern "
               "so copies tile edge to edge, no corners, no end caps", 128, 48),
  # ── 구슬 테 ── 가운데가 뚫려 있어야 구슬이 비친다. "frame" 대신 "rim" 으로 부른다.
  # ★ 1차는 **구멍이 너무 작았다**(폭의 32.8%). 구슬 80px 을 그 구멍에 맞추려면 테가
  # 244px 이라 화면 폭을 넘는다. 「테는 얇고 구멍은 크다」를 숫자로 못박아 다시 굽는다.
  "orb_rim":  (f"{TONE}, {ONE}, a very thin circular ring of black iron with small rivets, "
               "the ring band is narrow like a hoop, the transparent hole in the middle takes "
               "up about 80 percent of the image width, front view, perfectly round, "
               "not a disc, not a plate, mostly empty space", 128, 128),
  # ── 스킬 칸 ── 붉은 바탕의 얕은 홈. 아이콘이 그 위에 앉는다.
  "slot":     (f"{TONE}, {ONE}, a small square recess in dark iron with a dried blood red "
               "interior, a hairline gold bevel at the rim, flat and shallow, "
               "no ornament, no icon", 64, 64),
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
def path_of(k): return os.path.join(OUT, k + ".png")


if __name__ == "__main__":
    force = "--force" in sys.argv
    todo = [k for k in PARTS if force or not os.path.exists(path_of(k))]
    if not todo:
        print("전부 이미 있음"); sys.exit(0)

    jobs = {}
    for k in todo:                                   # 먼저 전부 줄 세운다
        desc, w, h = PARTS[k]
        try:
            t = text_of(mcp("create_map_object", {"description": desc,
                                                  "width": w, "height": h, **COMMON}))
            m = re.search(r"id:\s*(\S+)", t)
            if not m: print(f"실패 {k} — {t[:150]}", flush=True); continue
            jobs[k] = m.group(1); print(f"줄 세움 {k}", flush=True)
        except Exception as e:
            print(f"실패 {k} — {e}", flush=True)
        time.sleep(1.2)

    for rnd in range(60):                            # 돌아가며 받는다
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
            except Exception as e:
                print(f"대기 {k} — {str(e)[:60]}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(path_of(k)) for k in jobs):
            time.sleep(15)

    got = [k for k in PARTS if os.path.exists(path_of(k))]
    print(f"══ {len(got)}/{len(PARTS)}장  " + " ".join(got), flush=True)
