#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-i **㉥ 막힌 결에서 다른 결로 샌다** (ROADMAP G · 08-17 11:2x).
#
# ⑧-h 가 좁힌 물음: **「merge 판의 재사용 61% 는 진짜 벽인가.」**
# 팔 넷(base·merge·burn35·mergeburn)이 전부 남는 시간을 **재사용** 한 자리에 쌓았다.
#
# ★★ **팔을 걸기 전에 자부터 세워 답을 반쯤 봤다**(08-17 11:1x · 검수기 `재사용속`).
#   「재사용」통은 `S.cd.raise` **하나만** 본다. 그런데 S.cd 는 **스킬마다 따로**다 —
#   해골 1.2초 · 구울 2.0초 · 골렘 6.0초. 그 초에 구울·골렘이 정말 못 쓰는 상태였는지를
#   여태 **아무도 안 봤다.** 재 보니:
#     | 팔    | 재사용%   | 그 초 중 구울을 쓸 수 있었음 | 골렘 | 판 전체로 |
#     | base  | 30~42%    | 14~24%                        | 0~1% | 약 7%    |
#     | merge | 51~70%    | **42~51%**                    | 2~6% | 약 29%   |
#   즉 **절반은 벽이 아니라 «안 쓴 손»이다.** 자동 진행(main.js auto)이 편성 몫을 채우고
#   나면 오직 해골만 두드리기 때문이다. 그리고 **상한을 풀수록 이 손이 더 논다**
#   (base 7% → merge 29%) — merge 가 상한참에서 뺀 시간이 여기로 흘러든 것이다.
#
#     base        — 지금 그대로                                  … 닻
#     merge       — ㉢ __CAP_MERGE=1.25                          … ⑧-e~⑧-h 의 그 팔
#     spill       — ㉥ __RAISE_SPILL=1 (merge 없이)              … 손만 써 본다
#     mergespill  — ㉢ + ㉥                                      … 물음이 난 그 판에서
#
# ★ ㉥ 는 **값을 안 만진다** — 재사용 초·마나·시체·편성 몫 전부 그대로다. 바뀌는 것은
#   **해골이 제 재사용에만 막혔을 때 누가 그 자리를 채우는가** 뿐이다(구울 → 골렘 차례로,
#   시체 2 이상일 때만 구울로 새 해골 몫을 안 굶긴다).
# ★ ㉣ 와 **정반대 방향**이다. ㉣ 은 같은 손에 같은 일을 더 시켜(한 손짓에 n기) 마나를
#   말려 죽였다. ㉥ 은 그 일을 **다른 손**에 준다 — 구울은 제 재사용을 따로 쓰므로
#   한 순간에 자원이 몰리지 않는다.
# ★ 꺼짐이 예전과 같음을 **JSON 전체로 댔다** — 씨앗3·3분 · **198칸 중 다른 칸 0**
#   (`tmp/spill_off_old.json` 대 `spill_off_new.json`). 기본값 `RAISE_SPILL_DEF 0` = 꺼짐,
#   켜는 것은 `LH_SPILL` 환경변수뿐이라 되돌릴 것이 없다.
#
# ⚠️ **미리 적어 두는 예상과 그 뜻**(재고 나서 까닭을 고쳐 쓰지 않으려고 먼저 적는다):
#   ⓐ 재사용%가 **안 줄면** 팔이 안 도는 것이다(손잡이가 헛돈다 — 그러면 코드를 본다).
#   ⓑ 재사용%는 줄었는데 **최고층이 그대로면** — ㉤ 이 마나부족을 7%→0 으로 만들고도
#      깊이를 못 민 것과 **같은 판정**이다: 재사용도 벽이 아니었다는 증명이고, 그러면
#      ⑧ 은 「상한·마나·재사용 셋 다 벽이 아니다」로 닫고 **다른 축**(적 체력 곡선·
#      화력 자체·되짚기)으로 넘어간다. 손잡이 셋을 끝까지 돌려 본 것이 그 판정의 근거다.
#   ⓒ 구울이 늘면 **머릿수당 마나**가 오른다(6 → 12). 마나부족이 크게 늘면 ㉣ 의 자리로
#      되돌아가는 것이므로 ③에서 걸린다 — 그때는 켜지 않는다.
#
# 끝 조건(넷 다여야 켠다):
#   ① 재사용%가 제 닻보다 줄었나(손을 실제로 썼나)
#   ② 최고층 합이 base 에서 씨앗 폭(±6) 밖으로 **깎이지** 않았나
#   ③ 마나부족·시체없음이 제 닻보다 8%p 넘게 커지지 않았나(㉣ 이 진 자리)
#   ④ 실효 화력이 제 닻보다 안 줄었나
#
# 씨앗 3·9·5 · 12분(⑧-e~⑧-h 와 같은 씨앗이라 그때 표와 곧장 견줄 수 있다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS="3 9 5"

node tools/chrome_guard.mjs 2>&1 | tail -2

arm() {                            # $1=이름  $2=LH_CAPMERGE("" 면 안 켬)  $3=LH_SPILL("" 면 안 켬)
  env2=""
  [ -n "$2" ] && env2="LH_CAPMERGE=$2"
  [ -n "$3" ] && env2="$env2 LH_SPILL=$3"
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    env LH_SEED=$s $env2 node tools/loop_health.mjs 12 "$OUT/spill_$1_$s.json" 2>&1 \
      | grep -E '최고|뒷정리 군세|자리가 빈|판 전체 막힘|재사용 속|errors' | head -8 || echo "FAIL $1 $s"
  done
}

echo "═════ 팔 넷 × 씨앗 셋 × 12분 · $(date +%H:%M) ═════"
arm base        ""    ""
arm merge       1.25  ""
arm spill       ""    1
arm mergespill  1.25  1

echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5)
ARMS = ("base", "merge", "spill", "mergespill")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/spill_{arm}_{s}.json").read_text())
    except Exception:
        return None

"""★★ 막힘 넷은 **판 전체 자**(`시간.막힘전` · 720초)로 잰다 — ⑧-f 에서 자 둘의
   눈금이 다른 것을 잡았다(같은 판에서 19% 대 55%). 끝 조건이 판 전체 자로
   적혀 있으니 판정도 그 자로 한다."""

def stat(d):
    """(최고층, 머릿수, 실효화력, 상한참%, 재사용%, 마나부족%, 시체없음%, 다른손%)"""
    top = d["rows"][-1]["최고층"]
    A = (d.get("시간") or {}).get("군세") or {}
    M = (d.get("시간") or {}).get("막힘전") or {}
    n = ((A.get("초") or 0) / 0.05) or 1e-9
    초 = M.get("초") or 0
    pc = lambda k: 100 * M.get(k, 0) / 초 if 초 else 0.0
    R2 = M.get("재사용속") or {}
    cd = M.get("재사용", 0)
    손 = 100 * (R2.get("다른손", 0) / cd) if cd else 0.0     # 재사용 초 중 다른 손이 비어 있던 몫
    return (top, A.get("머릿수합", 0) / n, A.get("화력합", 0) / n,
            pc("상한참"), pc("재사용"), pc("마나부족"), pc("시체없음"), 손)

rows = {a: [] for a in ARMS}
tops = {a: [] for a in ARMS}
print("막힘 %% 는 **판 전체 720초** 자다(막힘전). 「손」은 재사용 초 중 구울·골렘이 비어 있던 몫.")
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고/화력/재사용/손':>26}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>26}"); continue
        st = stat(d); rows[a].append(st); tops[a].append(st[0])
        cells.append(f"{f'{st[0]} / {st[2]:.0f} / {st[4]:.0f}% / {st[7]:.0f}%':>26}")
    print(f"{s:>4} " + " ".join(cells))
print()

def avg(v): return sum(v) / len(v) if v else float("nan")
agg = {}
for a in ARMS:
    r = rows[a]
    if not r:
        print(f"{a:>10}  (자료 없음)"); continue
    agg[a] = tuple(avg([x[i] for x in r]) for i in range(8))
    top, head, pw, jam, cd, mana, corp, 손 = agg[a]
    print(f"{a:>10}  최고층 {top:.1f}(합 {sum(tops[a])}) · 머릿수 {head:.1f} · 실효화력 {pw:.0f}")
    print(f"            막힘 → 상한참 {jam:.0f}% · 재사용 {cd:.0f}% · 마나부족 {mana:.0f}% · "
          f"시체없음 {corp:.0f}% · [재사용 속 다른손 {손:.0f}%]")
print()

if "base" not in agg:
    print("── 판정 ── 닻(base)이 안 끝났다 — 판정하지 않는다.")
else:
    b = agg["base"]
    for a in ("spill", "mergespill"):
        if a not in agg:
            print(f"── {a} 판정 ── 안 끝났다."); continue
        top, head, pw, jam, cd, mana, corp, 손 = agg[a]
        ref = agg.get("merge") if a == "mergespill" else b   # mergespill 은 merge 가 제 닻이다
        rn = "merge" if a == "mergespill" else "base"
        if ref is None: ref, rn = b, "base"
        print(f"── {a} 판정 (닻: {rn}) ──")
        print(f"  ① 재사용 {cd:.0f}% vs {rn} {ref[4]:.0f}% ... "
              + ("OK — 손을 실제로 썼다" if cd < ref[4] - 0.5 else "★ 안 줄었다 — 팔이 헛돈다(코드를 본다)"))
        d_top = sum(tops[a]) - sum(tops["base"])
        print(f"  ② 최고층 합 {sum(tops[a])} vs base {sum(tops['base'])} ({d_top:+d}) · 폭 ±6 ... "
              + ("OK — 안 깎임" if d_top >= -6 else "★ 깊이를 치렀다"))
        print(f"  ③ 마나부족 {mana:.0f}%/{ref[5]:.0f}% · 시체없음 {corp:.0f}%/{ref[6]:.0f}% (+8%p 안) ... "
              + ("OK — 통이 안 옮겨 앉았다" if (mana <= ref[5] + 8 and corp <= ref[6] + 8)
                 else "★ 통이 옮겨 앉았다(㉣ 의 자리)"))
        print(f"  ④ 실효화력 {pw:.0f} vs {rn} {ref[2]:.0f} ... "
              + ("OK — 안 줄었다" if pw >= ref[2] * 0.98 else "★ 줄었다"))
        okc = (cd < ref[4] - 0.5) and d_top >= -6 and mana <= ref[5] + 8 and corp <= ref[6] + 8 and pw >= ref[2] * 0.98
        print(f"  → **{a}: {'통과 후보' if okc else '미달'}** (넷 모두 OK 여야 통과 후보)")
        print(f"     ※ 깊이 변화 {d_top:+d} 를 «반드시» 같이 읽을 것 — ⓑ(손잡이는 도는데 깊이가")
        print(f"        안 움직인다)이면 켜는 것이 아니라 **⑧ 을 닫고 다른 축으로 넘어가는** 신호다.")
        print()
print("  ★ 통과 후보이면 켜는 자리는 js/core.js 의 `RAISE_SPILL_DEF` 0 → 1 이다 — 환경변수는 검수기 것이다.")
print("  ★ 「통과 후보」는 팔의 자기 보호막이지 ⑧ 의 끝 조건이 아니다([[threshold-and-ruler-must-match]]).")
PY
echo "─────────────────────────────────────────────────────────"
echo "결과 JSON: $REPO/tmp/spill_<base|merge|spill|mergespill>_<씨앗>.json"
