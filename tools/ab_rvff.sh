#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **되짚은 층은 빨리 지나가게 한다** — 세 번째 판(앞: `ab_rvfast.sh` → `ab_rvsplit.sh`).
#
# 앞 두 판이 남긴 것(씨앗 여섯 · 12분):
#     팔               되짚기%   최고층   죽음   레벨/층   평균 금
#     base (1·1)        22.5     39.2    2.50    0.80     18.2k
#     gapo (GAP 0.5)    21.9     40.0    2.33    0.83     18.7k   ← 거의 안 움직인다
#     fullo(FULL 2)     16.3     43.8    1.83    0.85     28.6k   ← 듣지만 금 +57%
#
# ★ 가설이 **뒤집혔다.** 「GAP 이 매인 자리」라고 적어 놓고 쟀는데, 줄 나오는 속도는
#   되짚기 시간을 0.6%p 밖에 안 돌려줬다 — 되짚는 층에서 줄은 **이미 충분히 나온다**.
#   듣는 것은 FULL 뿐인데, 그건 시간을 아낀 게 아니라 **한 층에서 더 많이 잡은 것**이다
#   (금 +57% · 레벨/층 +6%). 즉 위 둘로는 「시간만」 아낄 수 없다 — 손잡이가 틀렸다.
#
# 남는 시간의 정체는 자가 이미 적어 뒀다: **다가감이 때림의 두 배**(438·611·584초 대
# 314·360·385). 줄도 머릿수도 아니고 **판이 흐르는 속도**다. 그래서 셋째 손잡이는
# 되짚는 동안 **같은 dt 로 step 을 n 번** 돌린다(FF · battle.js ⑧-e).
#   · dt 를 늘리지 않는다 — 걸음이 커지면 떼어놓기·닿음 판정이 달라져 **다른 게임**이 된다.
#   · 같은 틱을 여러 번 돌리면 판은 글자 그대로 같고 **시계만 빨라진다** — 층마다 잡는
#     수·드랍·경험치가 그대로라 **살이 안 찐다**(fullo 와 다른 점이 정확히 이것이다).
#
#   base: FF 1 (지금 그대로 — 앞 판 rs_base_* 와 같은 값이 나와야 한다, 자 점검을 겸한다)
#   ff2 : FF 2  · ff3 : FF 3
# 가설: 되짚기% 가 대략 1/n 로 줄고 **레벨/층·금은 안 움직인다**. 금이 같이 뛰면 FF 도
#       살을 찌우는 손잡이라는 뜻이라 이 길도 닫힌다(그때는 층 건너뛰기 쪽으로 간다).
#
# > 끝: 되짚기 22.5% → **10% 아래** · 죽음 안 늚 · **레벨/층 +5% 안 · 평균 금 ±25% 안**
# ★ 씨앗 여섯. 코드를 안 건드리고 문(globalThis)만 여닫으므로 난수 소비가 같아
#   같은 씨앗이면 같은 판이다 — 팔끼리 곧바로 견줄 수 있다.
# ★ 전선(처음 닿는 층)은 어느 팔에서도 안 건드린다(`revisiting()` 이 매 틱 막는다).
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
    env LH_SEED=$s ${extra[@]+"${extra[@]}"} node tools/loop_health.mjs 12 "tmp/rff_${name}_${s}.json" 2>&1 | tail -8 \
      || echo "FAIL $name $s"
  done
}

arm base
arm ff2 LH_RVFF=2
arm ff3 LH_RVFF=3

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SEEDS = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "ff2", "ff3")
BUCKETS = ("기다림", "싸움", "뒷정리", "되짚기")
print(f"{'팔':6} {'씨앗':>4} {'최고층':>6} {'되짚기%':>7} {'죽음':>4} {'레벨/층':>7} {'금':>8}")
agg = {}
for arm in ARMS:
    rows = []
    for s in SEEDS:
        f = pathlib.Path(f"tmp/rff_{arm}_{s}.json")
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
# base 가 앞 판(rs_base_*)과 같은지 — 자 자체가 안 흔들렸는지 본다
# ★ 이번엔 step 안에 문을 하나 더 냈다(FF). 기본값 1 이면 그 갈래를 아예 안 타므로
#   base 는 앞 판과 **글자 그대로 같아야** 한다. 다르면 문이 새는 것이다.
try:
    old = [json.loads(pathlib.Path(f"tmp/rs_base_{s}.json").read_text())["rows"][-1]["최고층"] for s in SEEDS]
    new = [json.loads(pathlib.Path(f"tmp/rff_base_{s}.json").read_text())["rows"][-1]["최고층"] for s in SEEDS]
    print(f"\n자 점검 · base 최고층  앞판 {old}  이번 {new}"
          f"  → {'같다(FF 문이 안 샌다)' if old == new else '★ 다르다 — FF 갈래가 base 에도 먹고 있다. 코드부터 볼 것'}")
except Exception as e:
    print(f"\n자 점검 건너뜀 ({e.__class__.__name__}: {e})")
PY
git -C "$REPO" status --porcelain js/
