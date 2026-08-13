#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 **위험을 깊이에 걸어 되돌린다** ══════════════════════════════════════
#
#   60분 자료(/tmp/lh_a60_s{1,3,9}.json)를 읽고 나서 안 것:
#     · 죽은 층이 5·5·10 · 5·5 · 5·5·5 — **전부 첫 1~4분**. 나머지 56분은 100층까지 무사고.
#     · 죽은 자리 아홉 중 여덟이 **층의 주인**(맞은횟수 100회 · 5초피해 72~99 대 체력 108~298).
#     · 한 번뿐인 「깊은 죽음」(씨1 · 10층 · 7분)은 **군세 0** 인 순간이었다.
#   ▸ 즉 **군대가 서 있으면 절대 안 죽는다.** 그리고 군대는 3 → 41 로 **시간만 따라** 큰다.
#
#   왜 깊이가 위험을 못 만드나 — 값이 아니라 **기울기**다(js/core.js:1132 · 135~136):
#       raiseHp(base, pw) = pw × 0.42    ← pw = 시체 주인의 최대 체력 ∝ floorHp = 1.19^f
#       들어오는 피해                     ∝ floorDmg = 1.155^f
#     소환수가 **버티는 대수**가 층마다 1.19/1.155 = **1.030 배씩 는다.**
#     40층이면 3.2배 · 60층 5.9배 · 100층 **19배** — 깊이 들어갈수록 군대가 더 안 죽는다.
#     「소환수는 제가 일어난 시체만큼 세다」(core.js:1097~)를 넣을 때 살린 것은 **바닥**인데,
#     그 바닥이 적 **체력** 곡선을 타는 바람에 적 **피해** 곡선을 앞질러 버렸다.
#
#   ★ 값 손잡이는 봉인이다(로드맵 3막). 그래서 상수를 비트는 게 아니라 **두 곡선의 몫**을
#     그대로 되돌린다 — 층 표를 고쳐도 저절로 따라오게 곱씨를 표에서 뽑아 쓴다:
#       riskTilt(f) = (floorDmg(f)/floorDmg(1)) / (floorHp(f)/floorHp(1))    (f=1 이면 정확히 1)
#     이걸 pw 항에만 곱하면 **소환수가 버티는 대수가 깊이와 무관하게 평평**해진다.
#     바닥(종족 기본값 26 등)은 Math.max 가 그대로 지키므로 **초반은 한 톨도 안 바뀐다.**
#
#   팔 셋:
#     ㉠ base — 손 안 댐
#     ㉡ tilt — 몫을 통째로 되돌린다(버티는 대수 평평)
#     ㉢ half — 그 절반만(sqrt) — 통째로가 너무 가팔라 최고층이 무너질 때의 보험
#
#   판정 순서 — ①죽음이 **깊은 층으로** 옮겨 갔나(죽은 층 중앙값) → ②죽음이 앞 5분에서
#     풀렸나(죽은 분 중앙값) → ③그 대가로 **최고층이 얼마나 깎였나.**
#   ★ A-1 끝 조건은 60분 곡선 기준(죽은 층 중앙값 ≥40 · 최고층 ≥80)이다. 이 자는 **15분
#     선별**이라 그 수치를 그대로 못 읽는다 — 여기서 보는 것은 **모양**이다:
#       「죽음이 앞 5분에서 풀려 층을 따라 흩어지는가, 그리고 최고층이 버티는가.」
#     이긴 팔 하나만 다음 감시가 **60분 × 씨앗 셋**으로 확인한다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; }
trap restore EXIT
SEEDS="1 3 9"
MIN=15
# 두 시간 넘게 도는 자다 — 썩은 렌더러 하나가 아홉 판을 통째로 못 믿게 만든다(TOOLS.md).
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"

arm() {                            # $1 = 이름
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/risk_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

# ── 곱씨를 심는다. pw 항에만 곱하므로 바닥(종족 기본값)은 그대로다. ──
patch() {                          # $1 = full | half
  python3 - "$1" <<'PY'
import pathlib, sys
mode = sys.argv[1]
p = pathlib.Path("js/core.js"); s = p.read_text()
old = 'export const raiseHp  = (base, pw) => Math.round(Math.max(base, (pw | 0) * RAISE_HP));'
inner = ('(floorDmg(f) / floorDmg(1)) / (floorHp(f) / floorHp(1))')
expr = inner if mode == "full" else f'Math.sqrt({inner})'
new = ('/* AB risk — 시체가 물려주는 몸이 적 **체력** 곡선(1.19)을 타는데 들어오는 피해는\n'
       '   **피해** 곡선(1.155)이라, 버티는 대수가 층마다 1.030 배씩 늘어 깊이가 안전해졌다.\n'
       '   두 곡선의 몫을 그대로 되돌린다 — 층 표를 고쳐도 저절로 따라온다. */\n'
       'export const riskTilt = () => { const f = Math.max(1, S.floor | 0);\n'
       f'  return {expr}; }};\n'
       'export const raiseHp  = (base, pw) =>\n'
       '  Math.round(Math.max(base, (pw | 0) * RAISE_HP * riskTilt()));')
assert s.count(old) == 1, "raiseHp 를 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
}

restore;              arm base
restore; patch full;  arm tilt
restore; patch half;  arm half
restore
echo "═════ 끝 · $(date +%H:%M) ═════"

# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib, statistics as st
SE = (1, 3, 9)
ARMS = ("base", "tilt", "half")

def load(arm, s):
    try:    return json.loads(pathlib.Path(f"tmp/risk_{arm}_{s}.json").read_text())
    except Exception: return None

def stat(d):
    t = d["시간"]; 새땅 = t["기다림"] + t["싸움"] + t["뒷정리"]
    A = t.get("군세") or {}; 초 = A.get("초") or 0; n = (초 / 0.05) or 1e-9
    dd = d.get("deaths") or []
    층 = [x.get("층") for x in dd if isinstance(x, dict) and x.get("층")]
    분 = [x.get("분") for x in dd if isinstance(x, dict) and x.get("분")]
    return dict(최고층=d["rows"][-1]["최고층"],
                뒷정리=100 * t["뒷정리"] / max(1e-9, 새땅),
                군세=A.get("머릿수합", 0) / n,
                죽음=len(dd),
                죽은층중앙=st.median(층) if 층 else float("nan"),
                죽은층최대=max(층) if 층 else float("nan"),
                죽은분중앙=st.median(분) if 분 else float("nan"),
                앞5분=sum(1 for m in 분 if m <= 5), 층들=층)

rows = {a: [] for a in ARMS}
for s in SE:
    print(f"── 씨앗 {s} ──")
    for a in ARMS:
        d = load(a, s)
        if not d: print(f"   {a:>5}  (자료 없음)"); continue
        x = stat(d); rows[a].append(x)
        print(f"   {a:>5}  최고층 {x['최고층']:>3} · 죽음 {x['죽음']:>2}회 "
              f"(층 {x['층들']}) · 뒷정리 {x['뒷정리']:.0f}% · 군세 {x['군세']:.1f}")
print()
def avg(a, k):
    v = [x[k] for x in rows[a] if x[k] == x[k]]
    return sum(v) / len(v) if v else float("nan")
for a in ARMS:
    if not rows[a]: print(f"{a:>5}  (자료 없음)"); continue
    allf = [f for x in rows[a] for f in x["층들"]]
    allm = [x["앞5분"] for x in rows[a]]
    print(f"{a:>5}  최고층 {avg(a,'최고층'):.1f} │ 죽음 {avg(a,'죽음'):.1f}회 · "
          f"**죽은 층 중앙값 {st.median(allf) if allf else float('nan')}** · 최대 "
          f"{max(allf) if allf else float('nan')} · 앞 5분에 {sum(allm)}/{sum(x['죽음'] for x in rows[a])} "
          f"│ 뒷정리 {avg(a,'뒷정리'):.0f}% · 군세 {avg(a,'군세'):.1f}")
print()
print("판정 순서:")
print("  1) **죽음이 깊은 층으로 옮겨 갔나** — 죽은 층 중앙값이 base(=5) 보다 확실히 위여야 한다.")
print("     안 움직였으면 곱씨가 안 먹은 것이다(군대 말고 다른 것이 벽을 서고 있다는 뜻).")
print("  2) 죽음이 **앞 5분에서 풀렸나** — 여전히 전부 앞 5분이면 고친 것이 아니다.")
print("  3) 그 대가로 **최고층이 얼마나 깎였나** — 15분 base 대비 20% 넘게 깎이면")
print("     60분에서 80층을 못 채운다(그때는 half, 그것도 무너지면 A-1 을 다른 축으로 다시 짠다).")
print("  ⚠ 이긴 팔은 여기서 확정하지 말 것 — **60분 × 씨앗 1·3·9** 로 확인해야 A-1 끝 조건이다.")
PY
git -C "$REPO" status --porcelain js/
