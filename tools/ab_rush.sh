#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **몰려옴(rush) C-1 ②** — 줄이 빈 뒤(뒷정리) 남은 적이 제 발로 소환수에게 몰려온다.
# 12분을 눈금으로 쪼개 보면 제일 큰 통이 뒷정리이고, 그 안은 **걷는 시간**(다가감)이 제일
# 크다(tmp/wl_* 열 판: 때림 23~27% · 다가감 40~49% · 놀고 28~33%). 값으론 다섯 번 졌고
# ab_walk 는 소환수 쪽을 이미 대 봤다 — 이번엔 **적 쪽**을 움직인다.
#   base : LH_RUSH=0 — 문 꺼짐(예전 코드 그대로 · 상한 90 · 걸음 m.spd)
#          ★ 2026-08-14 에 문이 **기본 켜짐**이 됐으므로 base 는 0 을 **명시해야** 한다
#            (안 주면 아무것도 안 가른 두 팔이 나온다).
#   rush : LH_RUSH=1 — 줄이 빈 뒤 (a) 표적 상한 90 을 풀고 (b) 아직 못 때릴 땐 RUSH.spd 배로 걷는다
# ★ **코드를 갈아끼우지 않는다.** battle.js 의 rushOn() 문을 loop_health 의 LH_RUSH 로만 가른다
#   (ab_walk 의 python 치환과 다른 점) — 문이 꺼지면 난수 소비가 한 톨도 안 달라지므로 base 는
#   손대기 전과 byte 단위로 같다.
# ★ 씨앗 **여덟**. 코드/문을 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   씨앗 셋의 합은 잡음이다(11:0x 에 ab_dmg_wide 로 배운 것).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4 6 7"
# 팔: RUSH 환경변수만 가른다(코드 치환 없음). 첫 인자=arm, 둘째=LH_RUSH 값(빈 값이면 **기본**).
# ★ 앞에 붙이는 환경변수를 **확장 결과로 만들지 말 것**(2026-08-14, 팔 하나를 통째로 날렸다).
#   `LH_SEED=$s ${rush:+LH_RUSH=$rush} node …` 는 확장이 끝난 뒤라 bash 가 `LH_RUSH=1` 을
#   **명령 이름**으로 읽는다 → `LH_RUSH=1: command not found` 로 rush 여덟 판이 전부 빈손.
#   그런데 파이프(`| tail`)의 종료 코드는 tail 것이라 `|| FAIL` 도 안 찍혀 **조용히** 지나갔다.
#   그래서 `env` 로 넘긴다(env 는 VAR=val 인자를 제 손으로 푼다) + 실패를 PIPESTATUS 로 본다.
arm() {
  local a=$1 rush=${2:-}
  for s in $SEEDS; do
    echo "───────── ARM $a · SEED $s ─────────"
    env LH_SEED=$s ${rush:+LH_RUSH=$rush} node tools/loop_health.mjs 12 "tmp/rush_${a}_$s.json" 2>&1 | tail -10
    [ "${PIPESTATUS[0]}" = 0 ] || echo "★ FAIL $a $s (rc=${PIPESTATUS[0]})"
  done
}

# 팔을 고를 수 있다: `ab_rush.sh rush` 면 rush 만(base 판이 이미 tmp/rush_base_*.json 에 있을 때).
ONLY=${1:-}
[ "$ONLY" = rush ] || arm base 0
[ "$ONLY" = base ] || arm rush 1

echo "═════ 끝 · $(date +%H:%M) ═════"
# 팔별 표 — 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 두 팔끼리만** 견준다.
# 씨앗별: 최고층 · 뒷정리%(전체 시간 중) · 다가감%(뒷정리 안 때림/다가감/놀고 중).
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4, 6, 7)

def median(xs):
    xs = sorted(xs)
    n = len(xs)
    if not n: return None
    m = n // 2
    return xs[m] if n % 2 else (xs[m - 1] + xs[m]) / 2

def read(arm, s):
    f = pathlib.Path(f"tmp/rush_{arm}_{s}.json")
    try:
        d = json.loads(f.read_text())
    except Exception:
        return None
    top = d["rows"][-1]["최고층"]
    t = d.get("시간") or {}
    tot = sum(t.get(k, 0) for k in ("기다림", "싸움", "뒷정리", "되짚기")) or 1
    clean = t.get("뒷정리", 0) / tot * 100                     # 뒷정리가 전체 시간에서 먹는 몫
    P = t.get("뒷") or {}
    mari = P.get("마리초", 0) or 1
    approach = P.get("다가감", 0) / mari * 100                  # 뒷정리 안에서 걷는(다가감) 몫
    return top, clean, approach

print(f"{'seed':>5} │ {'base 최고/뒷정리/다가감':>26} │ {'rush 최고/뒷정리/다가감':>26}")
print("─" * 66)
agg = {"base": {"top": [], "clean": [], "app": []}, "rush": {"top": [], "clean": [], "app": []}}
for s in SE:
    cells = {}
    for arm in ("base", "rush"):
        r = read(arm, s)
        if r is None:
            cells[arm] = f"{'—':>26}"
            continue
        top, clean, app = r
        agg[arm]["top"].append(top); agg[arm]["clean"].append(clean); agg[arm]["app"].append(app)
        cells[arm] = f"{top:>6.1f} / {clean:>5.1f}% / {app:>5.1f}%"
    print(f"{s:>5} │ {cells['base']:>26} │ {cells['rush']:>26}")
print("─" * 66)
for arm in ("base", "rush"):
    a = agg[arm]
    if not a["top"]:
        print(f"{arm:>5} │ (판 없음)"); continue
    print(f"{arm:>5} │ 최고층 합 {sum(a['top']):>6.1f} · 중앙 {median(a['top']):>5.1f}"
          f" │ 뒷정리 중앙 {median(a['clean']):>5.1f}% · 다가감 중앙 {median(a['app']):>5.1f}%")
# 끝 조건(C-1): rush 의 뒷정리 중앙 30% 아래 + 최고층이 base(44.8 기준) 대비 안 깎임.
PY

git -C "$REPO" status --porcelain js/ tools/
