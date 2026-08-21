#!/usr/bin/env python3
"""무너짐이 «사건»인가 «벌»인가를 재는 자 (D-13).

D-12 가 뒤 6분에 처음으로 오르내림을 만들었다. 그런데 끝층이 1·6 까지 떨어지는
판이 셋 있다 — 되돌린 폭이 판을 통째로 무르는 수준이면 그것은 사건이 아니라 벌이다.

판정선은 **재기 전에** 적는다(양쪽으로 열어 둔다):
  · 사건  = 한 번의 후퇴가 그때 최고층의 1/3 이하 · 되찾는 데 3분 이하
  · 벌    = 최고층의 2/3 이상을 무르거나 · 판이 끝날 때까지 못 되찾음
  · 그 사이는 «무거움»

★ **첫 판에 이 자가 세 팔에 똑같은 75% 를 냈다** — 아는 차이(fp05 는 깊은 죽음이 0)를
  못 가르면 눈금이 아니다([[floor-far-from-threshold]]). 까닭은 **앞 6분의 후퇴와
  뒤 6분의 후퇴를 한 통에 담아서**다. 앞쪽 후퇴(7→3층)도 층으로 재면 57% 라 «벌» 로
  찍힌다. 그래서 **구간을 갈라** 내고, 층 비율과 함께 **시간**(되짚기 몫)을 같이 낸다 —
  층은 되짚는 데 드는 «시간»이 다르므로 층 비율 하나로는 아프기를 못 잰다.

읽기만 한다 — 산출물(tmp/<arm>/*.json)을 세는 것 말고는 아무것도 안 건드린다.
사용: python3 tools/setback.py [--each] tmp/collapse_fp05 tmp/collapse_def_d12
"""
import json, sys, os, glob, statistics as st

EVENT_FRAC, PUNISH_FRAC = 1/3, 2/3
EVENT_MIN = 3
DEEP_MIN = 13          # 이 분 이후에 시작한 후퇴를 «뒤쪽»으로 본다


def spans(rows):
    """후퇴 구간: 층이 그때까지의 최고층 아래로 내려간 순간부터 되찾을 때까지."""
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
                cur["되찾은분"] = m
                out.append(cur)
                cur = None
    if cur is not None:
        cur["되찾은분"] = None
        out.append(cur)
    return out


def judge(s):
    frac = (s["봉우리"] - s["바닥"]) / max(1, s["봉우리"])
    back = None if s["되찾은분"] is None else s["되찾은분"] - s["시작분"]
    if back is None or frac >= PUNISH_FRAC:
        return "벌", frac, back
    if frac <= EVENT_FRAC and back <= EVENT_MIN:
        return "사건", frac, back
    return "무거움", frac, back


def arm(d, each=False):
    tally = {"앞": {"사건": 0, "무거움": 0, "벌": 0}, "뒤": {"사건": 0, "무거움": 0, "벌": 0}}
    fr = {"앞": [], "뒤": []}
    lost, tails, retr = [], [], []
    for p in sorted(glob.glob(os.path.join(d, "*.json"))):
        j = json.load(open(p))
        rows = j["rows"]
        ss = spans(rows)
        for s in ss:
            key = "뒤" if s["시작분"] >= DEEP_MIN else "앞"
            v, frac, back = judge(s)
            tally[key][v] += 1
            fr[key].append(frac)
            if s["되찾은분"] is None:
                lost.append(s)
        last = rows[-1]
        tails.append(last["층"] / max(1, last["최고층"]))
        t = j.get("시간", {})
        tot = sum(t.get(k, 0) for k in ("기다림", "싸움", "뒷정리", "되짚기"))
        retr.append(t.get("되짚기", 0) / max(1, tot))
        if each:
            desc = " ".join(
                f"{s['봉우리']}→{s['바닥']}@{s['시작분']}"
                + (f"..{s['되찾은분']}" if s["되찾은분"] else "..X")
                for s in ss)
            print(f"  {os.path.basename(p):<14} 끝층{last['층']:>3}/{last['최고층']:<3}"
                  f" 되짚기{t.get('되짚기', 0):>5.0f}s  {desc}")
    return dict(판=len(tails), 앞=tally["앞"], 뒤=tally["뒤"],
                앞폭=st.median(fr["앞"]) if fr["앞"] else 0,
                뒤폭=st.median(fr["뒤"]) if fr["뒤"] else 0,
                못되찾음=len(lost),
                끝층비=st.median(tails), 되짚기몫=st.median(retr))


def line(name, a):
    f = lambda t: f"{t['사건']}/{t['무거움']}/{t['벌']}"
    return (f"{name:<22}{a['판']:>3}"
            f"{f(a['앞']):>12}{a['앞폭']*100:>6.0f}%"
            f"{f(a['뒤']):>12}{a['뒤폭']*100:>6.0f}%"
            f"{a['못되찾음']:>7}{a['끝층비']*100:>8.0f}%{a['되짚기몫']*100:>8.0f}%")


def main(argv):
    each = "--each" in argv
    dirs = [x for x in argv if not x.startswith("--")] or \
        ["tmp/collapse_fp05", "tmp/collapse_def_d12"]
    print(f"{'팔':<22}{'판':>3}{'앞 사건/무거/벌':>12}{'폭':>7}"
          f"{'뒤 사건/무거/벌':>12}{'폭':>7}{'못되찾음':>7}{'끝층/최고':>9}{'되짚기몫':>9}")
    for d in dirs:
        if each:
            print(f"== {d}")
        print(line(os.path.basename(d), arm(d, each)))
    print(f"\n(«뒤» = {DEEP_MIN}분 이후에 시작한 후퇴 · 폭은 중앙값 · "
          f"판정선 사건≤{EVENT_FRAC:.2f}&≤{EVENT_MIN}분 · 벌≥{PUNISH_FRAC:.2f})")


if __name__ == "__main__":
    main(sys.argv[1:])
