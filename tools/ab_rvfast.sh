#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **되짚은 층은 빨리 지나가게 한다** (ROADMAP 「되짚기 17.6%」).
# 앞서 두 길이 닫혔다 — 시작 층을 옮기는 길(`ab_revisit`·CHECKPOINT)은 죽음이 늘었고,
# 건너뛰기(`ab_skip`)는 죽는 자리(3~10층)와 문이 열리는 깊이가 안 겹쳐 시간을 안 돌려줬다.
# 남은 자리는 **되짚는 동안의 층당 시간** 자체다. 되짚기는 이미 이긴 층이라 화력이
# 남아도는 구간인데, 줄은 처음 왔을 때와 같은 속도로 나온다.
#   base : 지금 그대로 (GAP 1 · FULL 1 — 코드가 예전과 글자 그대로 같은 팔)
#   fast : GAP 0.5 · FULL 2   — 두 배로 빨리 나오고, 열둘까지 서고서야 느려진다
#   rush : GAP 0.35 · FULL 3  — 더 세게. 죽음이 늘면 여기서 갈린다
# > 끝: 되짚기 비중 17.6% → **10% 아래** · 최고층 ±1층 안 · 죽음이 안 늘 것
# ★ 씨앗 여섯. 코드를 안 건드리고 문(globalThis)만 여닫으므로 난수 소비가 같아
#   같은 씨앗이면 같은 판이다 — 팔끼리 곧바로 견줄 수 있다.
# ★ 전선(처음 닿는 층)은 어느 팔에서도 안 건드린다. 거기를 건드리면 최고층·죽음이
#   통째로 흔들려 **무엇이 이득인지** 못 가른다.
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
    env LH_SEED=$s ${extra[@]+"${extra[@]}"} node tools/loop_health.mjs 12 "tmp/rf_${name}_${s}.json" 2>&1 | tail -8 \
      || echo "FAIL $name $s"
  done
}

arm base
arm fast LH_RVGAP=0.5  LH_RVFULL=2
arm rush LH_RVGAP=0.35 LH_RVFULL=3

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SEEDS = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "fast", "rush")
BUCKETS = ("기다림", "싸움", "뒷정리", "되짚기")
print(f"{'팔':6} {'씨앗':>4} {'최고층':>6} {'되짚기초':>8} {'되짚기%':>7} {'죽음':>4}")
agg = {}
for arm in ARMS:
    rows = []
    for s in SEEDS:
        f = pathlib.Path(f"tmp/rf_{arm}_{s}.json")
        try:
            d = json.loads(f.read_text())
            T = d["시간"]
            tot = sum(T.get(k, 0) for k in BUCKETS) or 1
            rv = T.get("되짚기", 0)
            top = d["rows"][-1]["최고층"]
            dead = len(d.get("deaths") or [])   # deaths 는 죽은 판의 «기록 목록» 이지 숫자가 아니다
            rows.append((top, rv, 100 * rv / tot, dead))
            print(f"{arm:6} {s:>4} {top:>6} {rv:>8.1f} {100*rv/tot:>6.1f}% {dead:>4}")
        except Exception as e:
            print(f"{arm:6} {s:>4}   ?  ({e.__class__.__name__}: {e})")   # 까닭을 적어야 다음에 고친다
    if rows:
        n = len(rows)
        agg[arm] = (sum(r[0] for r in rows)/n, sum(r[2] for r in rows)/n, sum(r[3] for r in rows)/n)
print()
for arm, (top, pct, dead) in agg.items():
    print(f"{arm:6} 평균 최고층 {top:6.2f} · 되짚기 {pct:5.1f}% · 죽음 {dead:4.2f}")
if "base" in agg:
    b = agg["base"]
    for arm in ("fast", "rush"):
        if arm not in agg: continue
        k = agg[arm]
        ok_rv, ok_top, ok_dead = k[1] < 10.0, abs(k[0] - b[0]) <= 1.0, k[2] <= b[2] + 0.34
        print(f"\n[{arm}] 되짚기 {b[1]:.1f}% → {k[1]:.1f}% ({'통과' if ok_rv else '실패'} · 10% 아래)"
              f" · 최고층 차 {k[0]-b[0]:+.2f}층 ({'통과' if ok_top else '실패'} · ±1층)"
              f" · 죽음 {b[2]:.2f} → {k[2]:.2f} ({'통과' if ok_dead else '실패'})")
        if abs(k[1] - b[1]) < 1e-9 and abs(k[0] - b[0]) < 1e-9:
            print("  ⚠ base 와 **똑같다** — 되짚는 판이 한 번도 안 왔거나 문이 안 먹은 것이다. 잰 게 없다.")
        else:
            print("  → 넣는다" if (ok_rv and ok_top and ok_dead) else "  → 아직 못 넣는다 — 위 표를 보고 다시 정한다")
PY
git -C "$REPO" status --porcelain js/
