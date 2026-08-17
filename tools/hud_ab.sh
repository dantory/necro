#!/bin/bash
# hud/sideRail 고침을 **짝지어** 잰다 — 지금 나무(뒤) 대 js/main.js 만 되돌린 것(앞).
#
# 왜 짝을 지어야 하나: 이 판의 JS초당ms 는 `step` 이 쥐고 있고 그 값이 판마다
# 190~260 으로 흔들린다. 한 번씩만 재서 대면 고친 것이 아니라 **씨앗을 재게 된다**
# ([[seed-the-probe]]). 그래서 양쪽을 여러 번 돌려 중앙값으로 댄다.
#
# ★ **던전 밖으로 샌 판은 버린다.** 30층은 본인이 죽는 층이라 재는 8초 사이에 마을로
#   끌려가는 판이 섞이는데, 마을은 step 이 안 돌아 숫자가 통째로 좋아진다(125 → 38).
#   `cpu_profile` 이 「던전%」로 그것을 걸러 FAIL 을 내므로 여기서는 **다시 뽑는다.**
. "$(dirname "$0")/ab_guard.sh"

set -u
cd "$(dirname "$0")/.."
N=${N:-3}          # 양쪽 각각 몇 판을 «성한 판»으로 모을지
SEC=${SEC:-8}; FLOOR=${FLOOR:-30}; BODIES=${BODIES:-40}; SLOW=${SLOW:-6}
MAX=$((N * 4))     # 다시 뽑기 상한 — 안 두면 영영 돈다
OUT=tmp/hud_ab.json
STASHED=0
# ★ 이름은 **ASCII 로만** 짓는다 — macOS 의 bash 3.2 는 `local 이름=…` 을
#   「not a valid identifier」로 뱉는다(첫 판이 여기서 통째로 죽었다). 한글은 주석과 낸 글에만.
cleanup() { [ "$STASHED" = 1 ] && git stash pop >/dev/null 2>&1 && echo "되돌림: stash pop 했다"; }
trap cleanup EXIT

collect() {   # $1 = 이름표. 성한 판 N 개를 모아 한 줄씩 낸다
  local tag=$1 got=0 try=0 line=""
  : > "tmp/hud_ab_$tag.txt"
  while [ $got -lt $N ] && [ $try -lt $MAX ]; do
    try=$((try + 1))
    node tools/cpu_profile.mjs "$SEC" "$FLOOR" "$BODIES" "$SLOW" > "tmp/hud_ab_${tag}_$try.json" 2>&1
    line=$(python3 - "$tag" "$try" <<'PY'
import json, sys
name, try_i = sys.argv[1], sys.argv[2]
raw = open(f"tmp/hud_ab_{name}_{try_i}.json").read()
try:
    d = json.JSONDecoder().raw_decode(raw)[0]
except Exception:
    print("BAD 못읽음"); raise SystemExit
w = d.get("머문곳") or {}
dun = w.get("던전%", -1)
t = {r["이름"].split(" @")[0]: r["ms"] for r in d["JS상위"]}
if dun < 95:
    print(f"BAD 던전{dun}%"); raise SystemExit
print(f"OK {d['JS초당ms']} {t.get('hud',0)} {t.get('sideRail',0)} {t.get('step',0)} {len(d.get('콘솔오류',[]))}")
PY
)
    case "$line" in
      OK*) got=$((got + 1)); echo "$line" >> "tmp/hud_ab_$tag.txt"; echo "  $tag #$got/$N  $line" ;;
      *)   echo "  $tag (버림 $try) $line" ;;
    esac
  done
  echo "$tag: 성한 판 $got (돌린 판 $try)"
}

echo "══ 뒤(고친 나무) ══"
collect after

echo "══ 앞(js/main.js 만 되돌림) ══"
git stash push -- js/main.js >/dev/null 2>&1 && STASHED=1
if [ "$STASHED" != 1 ]; then echo "FAIL — js/main.js 를 되돌리지 못했다(고친 게 없나?)"; exit 1; fi
collect before
git stash pop >/dev/null 2>&1 && STASHED=0

python3 - "$OUT" <<'PY'
import json, statistics as st, sys
def load(name):
    rows = []
    for ln in open(f"tmp/hud_ab_{name}.txt"):
        p = ln.split()
        if p and p[0] == "OK":
            rows.append(dict(js=float(p[1]), hud=float(p[2]), rail=float(p[3]),
                             step=float(p[4]), err=int(p[5])))
    return rows
def med(rows, k): return round(st.median([r[k] for r in rows]), 1) if rows else None
out = {}
for n in ("before", "after"):
    r = load(n)
    out[n] = {"판수": len(r), "JS초당ms": med(r, "js"), "hud": med(r, "hud"),
              "sideRail": med(r, "rail"), "step": med(r, "step"),
              "오류": sum(x["err"] for x in r), "낱값": r}
b, a = out["before"], out["after"]
if b["판수"] and a["판수"]:
    out["차이"] = {"hud+sideRail": f'{b["hud"]+b["sideRail"]:.1f} → {a["hud"]+a["sideRail"]:.1f}',
                   "JS초당ms": f'{b["JS초당ms"]} → {a["JS초당ms"]}'}
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
PY
echo "→ $OUT"
