/* V-182 — 격자 담기 로직만 떼어 브라우저 없이 두들긴다(hs/bag.js 순수 셈).
     ① 물건 40개를 무작위로 넣어 «겹친 칸»이 한 번도 없는지
     ② 꽉 찬 뒤 더 넣으면 거부하는지
     ③ 착용↔해제를 200번 왕복해도 가방 칸 수·스탯이 처음으로 돌아오는지(누수 없음)
   결과를 표로 찍고, 하나라도 FAIL 이면 exit 1.
     node tools/hs_v182_bagcheck.mjs */
import { GRID_COLS, GRID_ROWS, SLOT_SIZE, layoutBag, bagFits, usedCells, equipOp, unequipOp } from "../hs/bag.js";
import { rollItem, resetUniques, sumAffixes, AFFIX_KEYS } from "../hs/loot.js";

const SLOTS = Object.keys(SLOT_SIZE);
const CELLS = GRID_COLS * GRID_ROWS;

/* 격자를 실제로 칠해 «겹친 칸»이 있나 본다 — 순수 셈을 스스로 검산한다. */
function overlapFree(bag) {
  const occ = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(false));
  const { placements } = layoutBag(bag);
  for (const p of placements)
    for (let r = p.row; r < p.row + p.h; r++)
      for (let c = p.col; c < p.col + p.w; c++) {
        if (occ[r][c]) return false;
        occ[r][c] = true;
      }
  return true;
}

const rows = [];
const rec = (name, ok, d) => { rows.push({ name, ok, d }); };

/* ① 무작위 40개 — 넣을 수 있는 것만 넣고, 넣을 때마다 겹침이 없는지 검산. TRIALS 판. */
{
  const TRIALS = 400;
  let overlaps = 0, placedTot = 0, worstPlaced = 99;
  for (let t = 0; t < TRIALS; t++) {
    resetUniques();
    const bag = [];
    for (let i = 0; i < 40; i++) {
      const it = rollItem(1 + ((Math.random() * 10) | 0));
      if (it.build) continue;
      if (bagFits(bag, it)) bag.push(it);
      if (!overlapFree(bag)) overlaps++;
    }
    placedTot += bag.length;
    if (bag.length < worstPlaced) worstPlaced = bag.length;
  }
  rec("① 무작위 40개 · 겹친 칸 0", overlaps === 0,
    `${TRIALS}판 · 평균 담김 ${(placedTot / TRIALS).toFixed(1)}개 · 최소 ${worstPlaced}개 · 겹침 ${overlaps}회`);
}

/* ② 꽉 찬 뒤 거부 — 무기(2×3) 는 rows 0~2 를 열마다 채워 5개까지만 든다(30/40칸). 6번째 거부. */
{
  const bag = [];
  let fit = 0;
  const weapon = () => ({ slot: "weapon", rarity: { color: "#fff", key: "white" }, affixes: [] });
  for (let i = 0; i < 8; i++) { const w = weapon(); if (bagFits(bag, w)) { bag.push(w); fit++; } }
  const sixthRejected = fit === 5 && !bagFits(bag, weapon());
  // 한 칸(부적)은 아직 남은 row 3 에 들어가야 한다(꽉 참이 «전부 거부»는 아니다).
  const amuletStillFits = bagFits(bag, { slot: "amulet", rarity: { color: "#fff", key: "white" }, affixes: [] });
  rec("② 꽉 차면 거부 · 남은 자린 받는다", sixthRejected && amuletStillFits,
    `무기 든 수 ${fit}(기대 5) · 6번째 거부 ${!bagFits(bag, weapon())} · 부적은 여전히 들어감 ${amuletStillFits}`);
}

/* ③-a 자리 잡기·되돌리기 200회(같은 슬롯 빈 칸) — 칸 수·스탯이 처음으로 돌아오나. */
{
  resetUniques();
  const bag = [];
  for (let i = 0; i < 6; i++) { const it = rollItem(5); if (!it.build && bagFits(bag, it)) bag.push(it); }
  const equipped = {};
  const g = bag.find((x) => !x.build) || rollItem(5);
  if (!bag.includes(g)) bag.push(g);
  const cells0 = usedCells(bag), aff0 = sumAffixes(Object.values(equipped).filter(Boolean));
  const len0 = bag.length;
  for (let i = 0; i < 200; i++) { equipOp(bag, equipped, g); unequipOp(bag, equipped, g.slot); }
  const cells1 = usedCells(bag), aff1 = sumAffixes(Object.values(equipped).filter(Boolean));
  const affSame = AFFIX_KEYS.every((k) => aff0[k] === aff1[k]);
  rec("③-a 착용↔해제 200회(빈 슬롯) · 누수 없음", cells0 === cells1 && bag.length === len0 && affSame,
    `칸 ${cells0}→${cells1} · 가방수 ${len0}→${bag.length} · 스탯합 ${JSON.stringify(aff0) === JSON.stringify(aff1) ? "같음" : "다름"}`);
}

/* ③-b 갈아끼우기 200회(같은 슬롯 A↔B 맞바꿈) — prev 되돌림 가지가 새는지. */
{
  resetUniques();
  const A = { slot: "weapon", rarity: { color: "#fff", key: "white" }, affixes: [{ key: "dmg", value: 10 }] };
  const B = { slot: "weapon", rarity: { color: "#6fa8ff", key: "blue" }, affixes: [{ key: "dmg", value: 20 }, { key: "maxHp", value: 40 }] };
  const bag = [A, B];
  const equipped = {};
  equipOp(bag, equipped, A);              // A 착용, B 가방
  const cells0 = usedCells(bag), len0 = bag.length;
  for (let i = 0; i < 200; i++) {
    equipOp(bag, equipped, equipped.weapon === A ? B : A);   // 가방의 반대짝을 끼워 맞바꾼다
  }
  const cells1 = usedCells(bag);
  // 200(짝수) 번 맞바꾸면 처음(A 착용·B 가방)으로 돌아온다.
  const back = equipped.weapon === A && bag.includes(B) && !bag.includes(A) && bag.length === len0;
  const affNow = sumAffixes(Object.values(equipped).filter(Boolean));
  rec("③-b 갈아끼우기 200회(A↔B) · 누수 없음", cells0 === cells1 && back,
    `칸 ${cells0}→${cells1} · 가방수 ${len0}→${bag.length} · 착용=${equipped.weapon === A ? "A" : "B"} · 착용스탯 dmg=${affNow.dmg}`);
}

console.log("\n══ V-182 격자 담기 검산 (hs/bag.js) ══");
console.log(`  격자 ${GRID_COLS}×${GRID_ROWS} = ${CELLS}칸 · 슬롯 크기 ${SLOTS.map((s) => `${s} ${SLOT_SIZE[s][0]}×${SLOT_SIZE[s][1]}`).join(" · ")}\n`);
console.log("| 시험 | 결과 | 잰 값 |");
console.log("| --- | :---: | --- |");
let bad = 0;
for (const r of rows) { if (!r.ok) bad++; console.log(`| ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${r.d} |`); }
console.log(bad ? `\n✗ ${bad} 곳 틀림` : `\n✓ 전부 통과`);
process.exit(bad ? 1 : 0);
