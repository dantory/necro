/* **점이 남아도는가** — ROADMAP A-ⓐ 의 자.

     node tools/tree_points.mjs [레벨,레벨,…]

   재는 것(짐작이 아니라 수로 · [[cause-written-in-the-item-is-a-guess]]):
     ① 레벨 L 에서 **가진 점**(spTotal = L-1)
     ② 그 레벨에서 **쓸 수 있는 자리**(관문·선행·배타를 다 지킨 최대 랭크 합)
     ③ 남는 점 = ①-② — **이것이 0 보다 크면 「무엇을 찍어도 같은 판」**이다
     ④ 트리를 통째로 다 찍는 데 드는 점(=배타를 고른 뒤의 상한)과 그때의 레벨

   ★ 배타(`excl`)는 **패마다 제일 큰 쪽**을 고른 것으로 센다 — 「최대로 써도 남는가」를
     보는 자이므로 남는 쪽을 크게 잡아야 판정이 안전하다(작게 잡으면 남는 점이 부풀어
     실제보다 나쁘게 보인다).
   ★ 브라우저 없이 돈다 — core.js 는 DOM 을 모듈 바깥에서만 쓴다. CDP 를 안 거치므로
     한 번에 여러 레벨을 훑을 수 있다([[floor-far-from-threshold]] 처럼 곡선을 본다). */
const { TREE } = await import("../js/core.js");

const LV = (process.argv[2] || "10,20,30,40,50,60,80,98,120").split(",").map(Number);
const ALL = TREE.flatMap((c) => c.nodes);
const byId = Object.fromEntries(ALL.map((n) => [n.id, n]));

/** 레벨 L 에서 **최대로 찍을 수 있는 랭크 합**. 관문·선행을 고정점으로 풀고,
 *  배타 패에서는 상한이 큰 쪽 하나만 센다(같으면 먼저 나온 쪽). */
function capacityAt(L) {
  const open = new Set();
  for (let pass = 0; pass < ALL.length + 2; pass++) {
    let grew = false;
    for (const n of ALL) {
      if (open.has(n.id) || n.lv > L) continue;
      if (n.req && !open.has(n.req)) continue;
      open.add(n.id); grew = true;
    }
    if (!grew) break;
  }
  /* 배타 패에서 하나만 남긴다 — 상한이 큰 쪽(뒤에 딸린 자식까지 세어야 옳지만,
     지금 트리는 갈래 뒤가 대칭이라 상한만 본다. 대칭이 깨지면 여기를 고칠 것). */
  const pick = {};
  for (const n of ALL) {
    if (!open.has(n.id) || !n.excl) continue;
    if (!pick[n.excl] || n.max > byId[pick[n.excl]].max) pick[n.excl] = n.id;
  }
  let sum = 0;
  const drop = new Set();
  for (const n of ALL) {
    if (!open.has(n.id)) continue;
    if (n.excl && pick[n.excl] !== n.id) { drop.add(n.id); continue; }
    sum += n.max;
  }
  /* 버린 갈래에 **딸린 자식**도 같이 버린다(선행이 닫혔으므로). */
  for (let pass = 0; pass < ALL.length; pass++) {
    let grew = false;
    for (const n of ALL) {
      if (!open.has(n.id) || drop.has(n.id)) continue;
      if (n.req && drop.has(n.req)) { drop.add(n.id); sum -= n.max; grew = true; }
    }
    if (!grew) break;
  }
  return sum;
}

const rows = LV.map((L) => {
  const have = Math.max(0, L - 1), cap = capacityAt(L);
  return { L, have, cap, left: Math.max(0, have - cap) };
});

console.log("레벨 |  점 | 쓸자리 | 남는점");
for (const r of rows)
  console.log(String(r.L).padStart(4) + " |" + String(r.have).padStart(4) + " |" +
    String(r.cap).padStart(7) + " |" + String(r.left).padStart(7) + (r.left > 0 ? "  ← 남아돈다" : ""));

const full = capacityAt(999);
let need = 999;
for (let L = 2; L <= 999; L++) if (capacityAt(L) >= L - 1) { need = L; } else break;
console.log(`\n트리 전체(배타 고른 뒤) = ${full} 랭크 → 다 찍는 데 Lv.${full + 1}`);
console.log(`점이 모자란 채로 버티는 마지막 레벨 = Lv.${need}` + (need >= 999 ? " (끝까지 모자람)" : ""));
console.log(`칸 수 = ${ALL.length} · 줄기 ${TREE.length}`);
