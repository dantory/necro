#!/usr/bin/env python3
"""D 의 끝 조건을 «두 팔» 에서 한꺼번에 재는 자 (D-14).

까닭(ROADMAP D-13 이 남긴 ☐): 여태 D 의 자는 **한 팔로만** 돌았다 —
`loop_health` 가 `건너뛰기`(diveAt) 문을 안 써서 **늘 1층부터 다시 걷는 사람**만
흉내 냈다. 문을 쓰게 하니 같은 기본값이 되짚기 31% → 17% · 최고층 55 → 65 ·
뒤쪽 후퇴폭 79% → 14% 로 **다른 게임**이 나왔다.

둘 다 진짜 사람이다:
  · **문 안 씀** — `건너뛰기` 창을 한 번도 안 연 사람(META.dive = 0, 게임 기본값).
  · **문 씀**   — 늘 제일 깊이 고르는 사람(`LH_DIVE=1` = `__AUTO_DIVE`).
그러므로 **D 의 끝 조건은 두 팔 모두에서 서야 한다.** 한 팔에서만 서는 수정은
「고쳤다」가 아니라 「그 사람에게만 고쳤다」다.

재는 여섯(끝 조건은 D-12·D-13 이 재기 전에 적어 둔 것을 그대로 옮겼다):
  ① 깊은 몸 가짓수  25층+ 죽음의 최대체력 가짓수 ÷ 죽음 수 ≥ 0.5
                    (한 값에 못 박히면 그 층엔 «내가 만든 몸»이 없다 — floor-erases-the-ramp)
  ② 25층+ 죽음      기준 팔의 80% 이상 (위험을 지우면 D-10 으로 돌아간다)
  ③ 앞 6분 죽음     기준 팔의 ±10% (앞은 한 톨도 안 물려야 한다)
  ④ 뒤쪽 후퇴폭     13분 이후 후퇴의 중앙 폭 ≤ 1/3 (그 위는 «벌»이다 — setback.py 와 같은 눈금)
  ⑤ 되짚기 몫       ≤ 20% (그 위는 재미가 아니라 노역이다)
  ⑥ 최고층 중앙     기준 팔의 115% 이하 (깊은 층이 도로 안전해지면 안 된다)

읽기만 한다 — 산출물(tmp/<팔>/*.json)을 세는 것 말고는 아무것도 안 건드린다.
쓰기:
  python3 tools/d_gate.py 문안씀=tmp/collapse_def_d12 문씀=tmp/collapse_d13dive
  python3 tools/d_gate.py --base 문안씀=A 문씀=B  새문안씀=C 새문씀=D
     (--base 를 주면 앞 두 팔을 기준으로 삼아 뒤 팔들을 ①~⑥ 으로 판정한다)
"""
import json, sys, os, glob, statistics as st

DEEP_FLOOR = 25        # 이 층부터 «깊은 층»
EARLY_MIN = 6          # 이 분까지가 «앞»
LATE_MIN = 13          # 이 분 이후에 시작한 후퇴가 «뒤쪽»  (setback.py 와 같다)
SURVIVE_HITS = 5

GATE = {"①": 0.50, "②": 0.80, "③": 0.10, "④": 1/3, "⑤": 0.20, "⑥": 1.15}


def spans(rows):
    """후퇴 구간 — setback.py 와 같은 셈."""
    out, cur = [], None
    for r in rows:
        peak, f, m = r["최고층"], r["층"], r["분"]
        if cur is None:
            if f < peak:
                cur = {"시작분": m, "봉우리": peak, "바닥": f}
        else:
            cur["바닥"] = min(cur["바닥"], f)
            cur["봉우리"] = max(cur["봉우리"], peak)
            if f >= cur["봉우리"]:
                cur["되찾은분"] = m; out.append(cur); cur = None
    if cur is not None:
        cur["되찾은분"] = None; out.append(cur)
    return out


def arm(d):
    deep, early, peaks, retr, lateFr = [], 0, [], [], []
    n = 0
    for p in sorted(glob.glob(os.path.join(d, "*.json"))):
        j = json.load(open(p)); n += 1
        rows, dea = j["rows"], j["deaths"]
        for de in dea:
            if de["층"] >= DEEP_FLOOR: deep.append(de)
            if de["분"] <= EARLY_MIN:  early += 1
        peaks.append(max(r["최고층"] for r in rows))
        t = j.get("시간", {})
        tot = sum(t.get(k, 0) for k in ("기다림", "싸움", "뒷정리", "되짚기"))
        retr.append(t.get("되짚기", 0) / max(1, tot))
        for s in spans(rows):
            if s["시작분"] >= LATE_MIN:
                lateFr.append((s["봉우리"] - s["바닥"]) / max(1, s["봉우리"]))
    # ① 깊은 죽음의 «몸» 가짓수. 층별로 못 박혔는지도 같이 센다.
    kinds = len({de["최대체력"] for de in deep})
    pinned = []
    byfl = {}
    for de in deep: byfl.setdefault(de["층"], []).append(de)
    for fl, v in byfl.items():
        hp = {x["최대체력"] for x in v}; dmg = {x["층피해"] for x in v}
        if len(v) >= 2 and len(hp) == 1 and len(dmg) == 1 \
           and abs(next(iter(hp)) - next(iter(dmg)) * SURVIVE_HITS) < 1:
            pinned.append((fl, len(v)))
    return dict(판=n, 깊은죽음=len(deep), 몸가짓수=kinds,
                몸비=kinds / max(1, len(deep)),
                못박힌층=sorted(pinned), 앞죽음=early,
                최고층=st.median(peaks) if peaks else 0,
                되짚기몫=st.median(retr) if retr else 0,
                뒤폭=st.median(lateFr) if lateFr else 0,
                뒤후퇴수=len(lateFr))


def head():
    print(f"{'팔':<24}{'판':>3}{'25층+죽음':>11}{'몸가짓수':>11}{'앞6분죽음':>11}"
          f"{'뒤후퇴폭':>10}{'되짚기몫':>10}{'최고층':>8}")


def row(name, a):
    kinds = "%d/%d" % (a["몸가짓수"], a["깊은죽음"])
    print(f"{name:<24}{a['판']:>3}{a['깊은죽음']:>11}{kinds:>11}{a['앞죽음']:>11}"
          f"{a['뒤폭']*100:>9.0f}%{a['되짚기몫']*100:>9.0f}%{a['최고층']:>8.0f}")


def judge(a, b):
    """b(기준) 에 견주어 a 를 ①~⑥ 으로 판정한다. b 가 None 이면 절대 조건만."""
    out = []
    ok1 = a["몸비"] >= GATE["①"] if a["깊은죽음"] else None
    out.append(("①몸가짓수", ok1,
                f"{a['몸가짓수']}/{a['깊은죽음']}"
                + (f" · 못박힌층 {a['못박힌층']}" if a["못박힌층"] else "")))
    if b:
        r2 = a["깊은죽음"] / max(1, b["깊은죽음"])
        out.append(("②25층+죽음", r2 >= GATE["②"], f"{a['깊은죽음']} ({r2*100:.0f}%)"))
        r3 = abs(a["앞죽음"] - b["앞죽음"]) / max(1, b["앞죽음"])
        out.append(("③앞6분죽음", r3 <= GATE["③"], f"{a['앞죽음']} ({r3*100:+.0f}%)"))
    out.append(("④뒤후퇴폭", a["뒤폭"] <= GATE["④"] if a["뒤후퇴수"] else None,
                f"{a['뒤폭']*100:.0f}% (n={a['뒤후퇴수']})"))
    out.append(("⑤되짚기몫", a["되짚기몫"] <= GATE["⑤"], f"{a['되짚기몫']*100:.0f}%"))
    if b:
        r6 = a["최고층"] / max(1, b["최고층"])
        out.append(("⑥최고층", r6 <= GATE["⑥"], f"{a['최고층']:.0f} ({r6*100:.0f}%)"))
    return out


def parse(x):
    return x.split("=", 1) if "=" in x else (os.path.basename(x), x)


def main(argv):
    items = [parse(x) for x in argv if not x.startswith("--")]
    if len(items) < 2:
        print(__doc__); return 2
    base = None
    if "--base" in argv:
        base = items[:2]; items = items[2:]
        if not items:
            print("--base 만 주면 견줄 팔이 없다."); return 2
    head()
    arms = [(n, arm(d)) for n, d in items]
    for n, a in arms: row(n, a)
    basearms = [(n, arm(d)) for n, d in base] if base else []
    for n, a in basearms: row("기준 " + n, a)

    print()
    bad = 0
    for i, (n, a) in enumerate(arms):
        b = basearms[i][1] if i < len(basearms) else None
        marks = judge(a, b)
        line = " · ".join(
            f"{k} {'✓' if v else ('—' if v is None else '✗')} {t}" for k, v, t in marks)
        bad += sum(1 for _, v, _ in marks if v is False)
        print(f"  {n}: {line}")
    print(f"\n{'▣ 두 팔 다 섰다.' if bad == 0 else f'▣ 못 넘은 조건 {bad} 개 — D 는 «두 팔 모두»에서 서야 한다.'}"
          f"  (①≥{GATE['①']:.2f} ②≥{GATE['②']:.2f} ③±{GATE['③']:.2f}"
          f" ④≤{GATE['④']:.2f} ⑤≤{GATE['⑤']:.2f} ⑥≤{GATE['⑥']:.2f})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
