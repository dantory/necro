#!/usr/bin/env python3
"""necro 의 **판(UI)** 을 PixelLab 으로 굽는다 — 병수님: "UI도 전체적으로 다듬어서 다시 만들어".

    python3 tools/pixellab/ui.py            # 아직 없는 것만
    python3 tools/pixellab/ui.py --force    # 전부 다시

지금 판은 CSS 로 흉내 낸 것이다(그라디언트 + 테두리 두 겹). 규칙은 지켰지만 **결국 그림이
아니라 도형**이라, 캐릭터가 진짜 픽셀아트로 바뀌고 나니 판만 매끈해서 따로 논다.
그래서 판도 굽는다.

**조각으로 굽는다.** 판 전체를 한 장으로 구우면 화면 폭이 바뀔 때마다 늘어나 뭉개진다.
띠(가로로 반복) · 구슬테 · 칸 · 글상자를 따로 굽고 CSS 로 조립한다 — 그래야 어느 폭에서도
안 무너진다.

크기는 **가로세로비로 상한이 걸린다**(정사각 ≤512, 16:9 ≤688×384). 넘기면 검증 오류다.

결과는 assets/ui/<id>.png.
"""
import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")

# 디아블로 2 의 그 판 — 돌과 무쇠, 금장, 횃불빛. 채도는 낮게.
# ★ 1차 결과가 **보라·자주빛 벽돌**로 나왔다. 디아블로 2 의 판은 그 색이 아니다 —
# 축축한 회갈색 돌에 어두운 금장이다. 색을 안 적으면 모델이 제 취향으로 칠하므로
# **빼야 할 색까지 적는다**(no purple, no violet). 장식도 「절제」를 명시한다:
# 1차는 금장 스크롤이 사방에 붙어 시끄러웠다(병수님: "UI스타일이 별로").
TONE = ("dark gothic Diablo 2 game interface, carved cold grey-brown stone and black iron, "
        "restrained thin dark gold trim only, torchlit, heavily desaturated, grim medieval, "
        "no purple, no violet, no magenta, no bright colors, minimal ornament")
PAL = "cold grey stone, warm brown, black iron, dark antique gold"

# id: (설명, 가로, 세로, 배경제거)
UI = {
  # 아래 컨트롤 패널의 **가운데 띠** — 좌우로 반복해 어느 폭에도 맞춘다.
  # 1차 시도는 `no_background=False` 로 굽는 바람에 **투명 체커보드가 그림으로 구워졌고**
  # (알파가 통째로 255), 게다가 "bar" 라고만 했더니 네 변이 닫힌 액자가 나왔다.
  # 이어붙일 수 있으려면 좌우 끝이 잘려 있어야 한다 — 그래서 모서리 장식을 명시적으로 뺀다.
  "panel_band": (f"{TONE}, a wide horizontal wall of carved stone blocks forming a seamless "
                 "tileable band, a row of gold beads running along the top edge only, "
                 "the left and right edges are cut off mid-block so copies tile edge to edge, "
                 "no frame, no corners, no border on the sides, no icons, no text",
                 688, 384, True),
  # 구슬을 앉히는 **금장 테** — 가운데는 비어 있어야 구슬이 비쳐 보인다
  "orb_frame":  (f"{TONE}, an ornate circular gold and iron frame ring for a health orb, "
                 "empty transparent center, thick beveled rim with skull ornaments, "
                 "front view, centered", 512, 512, True),
  # 스킬 칸 — 빈 것과 켜진 것
  # 1차 시도는 조각 수십 개가 늘어선 **UI 킷 시트**가 나왔다("slot" 이 곧 시트라는 학습).
  # 한 칸만 나오게 하려면 "칸 하나가 화면을 꽉 채운다"고 못박아야 한다.
  # ★ 1차·2차 모두 **액자**가 나왔다 — 두꺼운 금장 테에 속이 텅 빈 네모. D2 의 칸은
  # 그냥 벽에 파인 어두운 홈이다. "frame" 이라는 말을 빼고 "socket / recess" 로 못박는다.
  "slot":       (f"{TONE}, ONE plain square recess carved into stone, filling the whole image "
                 "edge to edge, flat very dark interior, only a 1px bevel at the rim, "
                 "no decorative frame, no filigree, no corner ornament, no icon, no text, "
                 "not a sheet, only one object", 256, 256, True),
  "slot_on":    (f"{TONE}, ONE plain square recess carved into stone with a faint warm amber "
                 "glow inside, filling the whole image edge to edge, thin bright rim, "
                 "no decorative frame, no filigree, no icon, no text, only one object",
                 256, 256, True),
  # 글줄이 앉는 상자
  # ★ 1차는 금장 스크롤이 네 모서리에 크게 붙어 시끄러웠다. 글을 읽는 상자이므로
  # 테는 얇을수록 좋다 — 장식을 명시적으로 뺀다.
  "logbox":     (f"{TONE}, a plain sunken rectangular panel of dark stone with a thin simple "
                 "border, flat empty interior, no scrollwork, no corner ornament, "
                 "no filigree, no text", 688, 384, True),
  # 창(인벤토리·능력치)의 틀
  # 600x450 은 검증에서 튕겼다 — 그 가로세로비의 상한은 600x448 이다(1차 실패 원인).
  "window":     (f"{TONE}, an ornate rectangular panel frame with gold corner scrollwork "
                 "and an empty dark stone interior, no text", 600, 448, True),
}


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)

def content(resp):
    return resp.get("result", {}).get("content", [])

def text_of(resp):
    return "\n".join(c.get("text", "") for c in content(resp) if c.get("type") == "text")


def queue(key):
    desc, w, h, nobg = UI[key]
    r = mcp("create_ui_asset", {"description": desc, "width": w, "height": h,
                                "color_palette": PAL, "no_background": nobg, "name": key})
    t = text_of(r)
    m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", t)
    if not m:
        raise RuntimeError(f"id 를 못 받았다 — {t[:200]}")
    return m.group(1)


def fetch(key, aid):
    """익을 때까지 물어보고 받는다. **한 종이 늦어도 통째로 안 버린다** — 부르는 쪽이 돌린다."""
    r = mcp("get_ui_asset", {"ui_asset_id": aid})
    t = text_of(r)
    if not re.search(r"status:\s*completed", t, re.I):
        return 0
    for c in content(r):
        if c.get("type") == "image" and c.get("data"):
            out = os.path.join(ROOT, "assets", "ui", key + ".png")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            raw = base64.b64decode(c["data"])
            open(out, "wb").write(raw)
            return len(raw)
    return 0


if __name__ == "__main__":
    force = "--force" in sys.argv
    todo = [k for k in UI
            if force or not os.path.exists(os.path.join(ROOT, "assets", "ui", k + ".png"))]
    if not todo:
        print("전부 이미 있음"); sys.exit(0)

    # **먼저 전부 줄 세운다.** 하나씩 굽고 기다리면 여섯 장이 여섯 배 걸린다.
    jobs = {}
    for k in todo:
        try:
            jobs[k] = queue(k); print(f"줄 세움 {k}  {jobs[k]}", flush=True)
        except Exception as e:
            print(f"줄 세우기 실패 {k} — {e}", flush=True)
        time.sleep(1.5)

    # 그다음 돌아가며 받는다. 받아진 것부터 빠진다.
    for rnd in range(60):
        left = {k: v for k, v in jobs.items()
                if not os.path.exists(os.path.join(ROOT, "assets", "ui", k + ".png"))}
        if not left: break
        for k, aid in left.items():
            try:
                n = fetch(k, aid)
                if n: print(f"받음 {k}  {n}바이트", flush=True)
            except Exception as e:
                print(f"받기 실패 {k} — {e}", flush=True)
            time.sleep(1)
        if any(not os.path.exists(os.path.join(ROOT, "assets", "ui", k + ".png")) for k in jobs):
            print(f"— {rnd+1}회차, 남음. 20초 뒤 다시", flush=True)
            time.sleep(20)

    got = [k for k in UI if os.path.exists(os.path.join(ROOT, "assets", "ui", k + ".png"))]
    print(f"══ {len(got)}/{len(UI)}장", flush=True)
    for k in UI:
        print(f"  {'✓' if k in got else '✗'} {k}")
