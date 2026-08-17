#!/bin/bash
# 되짚기(FF)가 «자»를 얼마나 부풀리는지 짝지어 잰다 (2026-08-17).
#
# 여태 cpu_profile 은 deepest = 층+4 로만 판을 세웠다 — 그러면 revisiting() 이 잰 내내
# 참이라 판이 같은 틱을 세 번 돌린다(REVISIT_FF_DEF=3). 되짚기는 사람이 노는 12분 중
# 6.9% 뿐인데, 자는 100% 를 그 안에서 재고 있었다.
#   앞(ff)  : deepest = 층+4  → 되짚기 100%  (여태 적어 온 모든 숫자가 이쪽)
#   뒤(norm): deepest = 층    → 되짚기 0%    (사람이 지나는 보통 걸음)
#
# ★ 성한 판을 고르는 자는 **던전% ≥ 95 · 콘솔오류 0** 하나뿐이다. cpu_profile 의
#   PASS/FAIL 로 거르지 않는다 — 「1위가 5% 넘음」은 **버릴 판이 아니라 잰 결과**이고,
#   그걸로 거르면 ff 팔이 통째로 버려져 A/B 가 성립하지 않는다.
. "$(dirname "$0")/ab_guard.sh"

cd "$(dirname "$0")/.."
N=${N:-3} SEC=${SEC:-8} FLOOR=${FLOOR:-30} BODIES=${BODIES:-40} SLOW=${SLOW:-6}
mkdir -p tmp/ff_ab && rm -f tmp/ff_ab/*.json

for arm in ff norm; do
  got=0; tries=0
  while [ "$got" -lt "$N" ] && [ "$tries" -lt "$((N * 4))" ]; do
    tries=$((tries + 1))
    if [ "$arm" = norm ]; then export NECRO_DEEPEST=$FLOOR; else unset NECRO_DEEPEST; fi
    f=tmp/ff_ab/${arm}_${tries}.json
    node tools/cpu_profile.mjs "$SEC" "$FLOOR" "$BODIES" "$SLOW" > "$f" 2>&1
    verdict=$(node -e '
      const fs=require("fs"); const t=fs.readFileSync(process.argv[1],"utf8");
      const i=t.indexOf("{"), j=t.lastIndexOf("}");
      if(i<0||j<0){console.log("BAD\tJSON 없음");process.exit(0)}
      let o; try{o=JSON.parse(t.slice(i,j+1))}catch(e){console.log("BAD\tJSON 깨짐");process.exit(0)}
      const w=o.머문곳||{};
      if((o.콘솔오류||[]).length){console.log("BAD\t콘솔오류");process.exit(0)}
      if((w["던전%"]??0)<95){console.log(`BAD\t던전 ${w["던전%"]}%`);process.exit(0)}
      const step=(o.JS상위||[]).find(r=>r.이름&&r.이름.startsWith("step"));
      console.log(["OK",o.JS초당ms,w["되짚기%"],(o.JS상위||[])[0]?.이름,(o.JS상위||[])[0]?.비율,
        step?step.ms:"", o.판?JSON.stringify(o.판):""].join("\t"));
    ' "$f")
    if [ "${verdict%%	*}" = OK ]; then
      got=$((got + 1)); mv "$f" "tmp/ff_ab/${arm}_ok${got}.json"
      echo "[$arm $got/$N] $verdict"
    else
      echo "[$arm 버림 $tries] $verdict"
    fi
  done
  echo "[$arm] 성한 판 $got / 돌린 판 $tries"
done

echo "=== 표 ==="
node -e '
const fs=require("fs");
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?+( s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2 ).toFixed(1):NaN};
for(const arm of ["ff","norm"]){
  const fl=fs.readdirSync("tmp/ff_ab").filter(f=>f.startsWith(arm+"_ok"));
  const os=fl.map(f=>JSON.parse((t=>t.slice(t.indexOf("{"),t.lastIndexOf("}")+1))(fs.readFileSync("tmp/ff_ab/"+f,"utf8"))));
  if(!os.length){console.log(arm,"— 성한 판 없음");continue}
  const g=n=>os.map(o=>(o.JS상위||[]).find(r=>r.이름&&r.이름.startsWith(n))?.ms||0);
  console.log(arm,
    "| 판", os.length,
    "| 되짚기%", os.map(o=>o.머문곳["되짚기%"]).join("·"),
    "| JS초당ms", med(os.map(o=>o.JS초당ms)), "(", os.map(o=>o.JS초당ms).join("·"), ")",
    "| step", med(g("step")), "| draw", med(g("draw")), "| tick", med(g("tick")),
    "| 1위", os.map(o=>`${o.JS상위[0]?.이름} ${o.JS상위[0]?.비율}%`).join(" · "));
}'
