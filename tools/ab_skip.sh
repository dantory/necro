#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **건너뛰기가 정말 시간을 돌려주는가** (병수님 2026-08-16 09:29 「스테이지 스킵」).
# 08-16 10:04 에 넣은 것은 「도는가」까지다 — 죽은 판이 12분 중 236초·118초(최대 33%)를
# 되짚기에 쓰던 그 시간이 실제로 잘려 나가는지는 아직 아무도 안 쟀다.
#
# ★★ 10:35 의 첫 A/B 는 **두 팔이 바이트까지 같았다**(md5 동일). 코드가 안 먹은 게 아니라
#    **문이 열릴 자리가 아예 없었다** — 12분 판의 죽음은 전부 3~10층·2~7분에 나는데,
#    그때 최고 깊이가 10 이하라 `diveMax()` 는 늘 0 이었다(열림 15층 · 되돌림 10층).
#    되짚기를 낳는 죽음과 문이 열리는 깊이가 **서로 안 겹친다.** 그래서 팔을 하나 더 둔다.
#   base : 지금 그대로 — 자동 진행은 고르는 창을 안 열어 늘 1층부터 되짚는다
#   skip : `__AUTO_DIVE` — **늘 제일 깊이 고르는 사람**(diveAt() = diveMax()). 문은 현행 15·10.
#   near : 같은 사람인데 **문을 5·5 로 내린다**(__DIVE_MIN·__DIVE_BACK) — 지나온 마지막
#          관문 하나 위까지 고를 수 있다. 죽는 자리(3~10층)에서 실제로 열리는 유일한 팔.
# > 끝: 되짚기 비중이 17.6% → 10% 아래 · 최고층 차이 ±1층 안 · 죽음이 안 늘 것
#   (죽음 조건은 CHECKPOINT 를 껐던 까닭이다 — 늘 벽에서 시작하면 튕기기만 한다)
# ★ 씨앗 여섯. 코드를 안 건드리고 문(globalThis)만 여닫으므로 **난수 소비가 같아**
#   같은 씨앗이면 같은 판이다 — 팔끼리 곧바로 견줄 수 있다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4"
arm() { # $1=이름  $2…=추가 환경변수(없으면 base)
  # ★ macOS 의 bash 는 3.2 라 `set -u` 아래에서 빈 "$@" 가 **오류**다 — ${a[@]+"${a[@]}"} 로 감싼다.
  local name=$1; shift
  local extra=(); [ $# -gt 0 ] && extra=("$@")
  for s in $SEEDS; do
    echo "───────── ARM $name · SEED $s ─────────"
    env LH_SEED=$s ${extra[@]+"${extra[@]}"} node tools/loop_health.mjs 12 "tmp/sk_${name}_${s}.json" 2>&1 | tail -12 \
      || echo "FAIL $name $s"
  done
}

arm base
arm skip LH_DIVE=1
arm near LH_DIVE=1 LH_DIVEMIN=5 LH_DIVEBACK=5

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SEEDS = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "skip", "near")
BUCKETS = ("기다림", "싸움", "뒷정리", "되짚기")
print(f"{'팔':6} {'씨앗':>4} {'최고층':>6} {'되짚기초':>8} {'되짚기%':>7} {'죽음':>4}")
agg = {}
for arm in ARMS:
    rows = []
    for s in SEEDS:
        f = pathlib.Path(f"tmp/sk_{arm}_{s}.json")
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
    for arm in ("skip", "near"):
        if arm not in agg: continue
        k = agg[arm]
        ok_rv, ok_top, ok_dead = k[1] < 10.0, abs(k[0] - b[0]) <= 1.0, k[2] <= b[2] + 0.34
        print(f"\n[{arm}] 되짚기 {b[1]:.1f}% → {k[1]:.1f}% ({'통과' if ok_rv else '실패'} · 10% 아래)"
              f" · 최고층 차 {k[0]-b[0]:+.2f}층 ({'통과' if ok_top else '실패'} · ±1층)"
              f" · 죽음 {b[2]:.2f} → {k[2]:.2f} ({'통과' if ok_dead else '실패'})")
        if k[1] == b[1] and k[0] == b[0]:
            print("  ⚠ base 와 **똑같다** — 문이 한 번도 안 열린 것이다(죽는 층 < 열림 깊이). 잰 게 없다.")
        else:
            print("  → 넣는다" if (ok_rv and ok_top and ok_dead) else "  → 아직 못 넣는다 — 위 표를 보고 다시 정한다")
PY
git -C "$REPO" status --porcelain js/
