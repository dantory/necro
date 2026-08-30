/* V-181 — loot.js 를 그대로 import 해 «옵션 굴림»을 잰다.
   floor 1·5·10 에서 각각 100번 굴려 레어도별 평균 옵션 개수·슬롯 분포·값 범위를 표로 찍는다.
   평범 0 · 매직 1~2 · 레어 3~4 가 실제로 나오는지 이 자 하나로 확인한다.
     node tools/hs_v181_rollcheck.mjs */
import { rollItem, resetUniques, RARITY, AFFIX_KEYS, SLOT_LABEL } from "../hs/loot.js";

const N = 100;
const FLOORS = [1, 5, 10];
const rarByKey = Object.fromEntries(RARITY.map((r) => [r.key, r]));
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

let fail = 0;

for (const floor of FLOORS) {
  resetUniques();
  const byRar = {};                 // key → { n, affixSum }
  const slotCount = {};
  const valRange = {};              // affix key → [min, max]
  for (const k of AFFIX_KEYS) valRange[k] = [Infinity, -Infinity];

  for (let i = 0; i < N; i++) {
    const it = rollItem(floor);
    const rk = it.unique ? "gold" : it.rarity.key;
    (byRar[rk] ||= { n: 0, affixSum: 0 });
    byRar[rk].n++;
    byRar[rk].affixSum += it.affixes.length;
    slotCount[it.slot] = (slotCount[it.slot] || 0) + 1;
    for (const a of it.affixes) {
      const r = valRange[a.key];
      if (a.value < r[0]) r[0] = a.value;
      if (a.value > r[1]) r[1] = a.value;
    }
  }

  console.log(`\n══ Floor ${floor} — ${N}회 ══`);
  console.log(pad("레어도", 8) + padL("개수", 5) + padL("평균옵션", 10));
  const EXPECT = { white: [0, 0], blue: [1, 2], yellow: [3, 4], gold: [2, 3] };
  for (const key of ["white", "blue", "yellow", "gold"]) {
    const b = byRar[key];
    if (!b) { console.log(pad((rarByKey[key]?.name || key), 8) + padL(0, 5) + padL("—", 10)); continue; }
    const avg = b.affixSum / b.n;
    const [lo, hi] = EXPECT[key];
    // 평균은 범위 [lo-0.35, hi+0.35] 안이어야 한다(100회 표본의 흔들림 여유).
    const ok = avg >= lo - 0.35 && avg <= hi + 0.35;
    if (!ok) fail++;
    console.log(pad(rarByKey[key].name, 8) + padL(b.n, 5) + padL(avg.toFixed(2), 8) + "  " + (ok ? "OK" : `✗ 기대 ${lo}~${hi}`));
  }

  const slots = Object.keys(SLOT_LABEL).map((s) => `${SLOT_LABEL[s]} ${slotCount[s] || 0}`).join(" · ");
  console.log("슬롯 분포: " + slots);
  const empties = Object.keys(SLOT_LABEL).filter((s) => !slotCount[s]);
  if (empties.length) { console.log("  ✗ 안 나온 슬롯: " + empties.map((s) => SLOT_LABEL[s]).join(", ")); fail++; }

  const vals = AFFIX_KEYS.map((k) => {
    const [mn, mx] = valRange[k];
    return `${k} ${mn === Infinity ? "—" : mn + "~" + mx}`;
  }).join(" · ");
  console.log("값 범위: " + vals);
}

console.log(fail ? `\n✗ ${fail} 곳이 기대와 어긋난다` : `\n✓ 레어도별 옵션 개수·슬롯·값 범위 전부 기대대로`);
process.exit(fail ? 1 : 0);
