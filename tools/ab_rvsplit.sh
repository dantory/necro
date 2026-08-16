#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **되짚은 층은 빨리 지나가게 한다** — 두 번째 판(앞: `ab_rvfast.sh`).
#
# 앞 A/B(6dc1bb8, 씨앗 여섯 · 12분)가 남긴 것:
#     팔    되짚기%   최고층   죽음   레벨/층   평균 금
#     base   22.5     39.2    2.50    0.80     18.2k
#     fast   17.4     42.2    1.83    0.83     17.6k
#     rush   13.7     45.7    1.33    0.87     58.1k   ← 금이 3.2배
#
# ★ **자가 놓친 것이 있었다.** 끝 조건은 되짚기%·최고층·죽음 셋뿐이라 rush 를
#   「죽음도 줄고 더 깊이 간다」로 읽을 뻔했다. 그런데 금이 3.2배다 —
#   FULL 3 이 한 판에 열여덟을 세워 **가방(12칸)이 포화**하고, 그 뒤로 줍는 것이
#   전부 금으로 녹는다(ROADMAP 「가방」·「금」 항목이 이미 열려 있다).
#   되짚기는 시간을 아끼려던 자리인데 **파밍 구간이 돼 버렸다.**
#   → 자에 **층당 힘**을 넣는다: 레벨/층 · 평균 금. 시간만 아꼈으면 이 둘이 안 움직인다.
#
# ★ 그리고 「최고층 ±1층」은 **틀린 눈금이었다.** 되짚는 시간을 돌려주면 그 시간이
#   전진에 쓰이므로 깊이는 **늘어야 정상**이다(그게 목적이다). 깊이가 아니라
#   **층당 힘이 부풀었는가**를 봐야 한다. rush 는 그 자로 걸린다, fast 는 안 걸린다.
#
# 이번에 가르는 것: 두 손잡이 중 **어느 쪽이 시간을 돌려주고, 어느 쪽이 살을 찌우는가.**
#   base : 지금 그대로 (GAP 1 · FULL 1) — 앞 판과 같은 값이 나와야 한다(자 점검을 겸한다)
#   gapo : GAP 0.5 · FULL 1  — 줄만 두 배로 빨리. 한 판에 서는 수는 **안 늘린다**
#   fullo: GAP 1   · FULL 2  — 수만 늘리고 속도는 그대로
# 가설: 되짚기는 화력이 남아 판이 잘 안 차므로 **GAP 이 매인 자리**고, FULL 은 살만 찌운다.
#       그렇다면 gapo 가 fast 의 이득을 금 부풀림 없이 거의 다 가져온다.
#
# > 끝: 되짚기 22.5% → **10% 아래** · 죽음 안 늚 · **레벨/층 +5% 안 · 평균 금 ±25% 안**
# ★ 씨앗 여섯. 코드를 안 건드리고 문(globalThis)만 여닫으므로 난수 소비가 같아
#   같은 씨앗이면 같은 판이다 — 팔끼리 곧바로 견줄 수 있다.
# ★ 전선(처음 닿는 층)은 어느 팔에서도 안 건드린다(`revisiting()` 이 막는다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4"
arm() { # $1=이름  $2…=추가 환경변수(없으면 base)
  # ★ macOS 의 bash 는 3.2 라 `set -u` 아래에서 빈 "$@" 가 오류다 — ${a[@]+"${a[@]}"} 로 감싼다.
  local name=$1; shift
  local extra=(); [ $# -gt 0 ] && extra=("$@")
  for s in $SEEDS; do
    echo "───────── ARM $name · SEED $s ─────────"
    env LH_SEED=$s ${extra[@]+"${extra[@]}"} node tools/loop_health.mjs 12 "tmp/rs_${name}_${s}.json" 2>&1 | tail -8 \
      || echo "FAIL $name $s"
  done
}

arm base
arm gapo  LH_RVGAP=0.5
arm fullo LH_RVFULL=2

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SEEDS = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "gapo", "fullo")
BUCKETS = ("기다림", "싸움", "뒷정리", "되짚기")
print(f"{'팔':6} {'씨앗':>4} {'최고층':>6} {'되짚기%':>7} {'죽음':>4} {'레벨/층':>7} {'금':>8}")
agg = {}
for arm in ARMS:
    rows = []
    for s in SEEDS:
        f = pathlib.Path(f"tmp/rs_{arm}_{s}.json")
        try:
            d = json.loads(f.read_text())
            T = d["시간"]
            tot = sum(T.get(k, 0) for k in BUCKETS) or 1
            pct = 100 * T.get("되짚기", 0) / tot
            last = d["rows"][-1]
            top, lv, gold = last["최고층"], last["레벨"], last["금"]
            dead = len(d.get("deaths") or [])   # deaths 는 죽은 판의 «기록 목록» 이지 숫자가 아니다
            lpf = lv / max(top, 1)
            rows.append((top, pct, dead, lpf, gold))
            print(f"{arm:6} {s:>4} {top:>6} {pct:>6.1f}% {dead:>4} {lpf:>7.2f} {gold:>8}")
        except Exception as e:
            print(f"{arm:6} {s:>4}   ?  ({e.__class__.__name__}: {e})")   # 까닭을 적어야 다음에 고친다
    if rows:
        n = len(rows)
        agg[arm] = tuple(sum(r[i] for r in rows)/n for i in range(5))
print()
for arm, (top, pct, dead, lpf, gold) in agg.items():
    print(f"{arm:6} 평균 최고층 {top:6.2f} · 되짚기 {pct:5.1f}% · 죽음 {dead:4.2f}"
          f" · 레벨/층 {lpf:5.2f} · 금 {gold:9.0f}")
if "base" in agg:
    b = agg["base"]
    for arm in ARMS:
        if arm == "base" or arm not in agg: continue
        k = agg[arm]
        ok_rv   = k[1] < 10.0
        ok_dead = k[2] <= b[2] + 0.34
        ok_lpf  = k[3] <= b[3] * 1.05          # 층당 힘이 안 부풀 것
        ok_gold = abs(k[4] - b[4]) <= b[4] * 0.25
        print(f"\n[{arm}] 되짚기 {b[1]:.1f}% → {k[1]:.1f}% ({'통과' if ok_rv else '실패'} · 10% 아래)"
              f" · 죽음 {b[2]:.2f} → {k[2]:.2f} ({'통과' if ok_dead else '실패'})"
              f"\n       레벨/층 {b[3]:.2f} → {k[3]:.2f} ({'통과' if ok_lpf else '실패'} · +5% 안)"
              f" · 금 {b[4]:.0f} → {k[4]:.0f} ({'통과' if ok_gold else '실패'} · ±25%)"
              f"\n       (최고층 {b[0]:.1f} → {k[0]:.1f} — 깊이는 늘어도 좋다, 그게 목적이다)")
        if abs(k[1] - b[1]) < 1e-9 and abs(k[0] - b[0]) < 1e-9:
            print("  ⚠ base 와 **똑같다** — 되짚는 판이 한 번도 안 왔거나 문이 안 먹은 것이다. 잰 게 없다.")
        else:
            print("  → 넣는다" if (ok_rv and ok_dead and ok_lpf and ok_gold)
                  else "  → 아직 못 넣는다 — 위 표를 보고 다시 정한다")
# base 가 앞 판(rf_base_*)과 같은지 — 자 자체가 안 흔들렸는지 본다
try:
    old = []
    for s in SEEDS:
        d = json.loads(pathlib.Path(f"tmp/rf_base_{s}.json").read_text())
        old.append(d["rows"][-1]["최고층"])
    new = []
    for s in SEEDS:
        d = json.loads(pathlib.Path(f"tmp/rs_base_{s}.json").read_text())
        new.append(d["rows"][-1]["최고층"])
    print(f"\n자 점검 · base 최고층  앞판 {old}  이번 {new}"
          f"  → {'같다(자가 안 흔들렸다)' if old == new else '★ 다르다 — 코드가 바뀌었거나 판이 안 정해져 있다'}")
except Exception as e:
    print(f"\n자 점검 건너뜀 ({e.__class__.__name__}: {e})")
PY
git -C "$REPO" status --porcelain js/
