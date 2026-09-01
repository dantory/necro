/**
 * hs_v225_graph — V-225 ① 「경로없음」의 원인을 셋으로 가른다 (순수 node · 브라우저 없음)
 *
 * 증상(V-226 ③, 2026-09-01): 씨앗3 층5 에서 `경로없음 707 · 직선폴백 707`(씨앗1·2 는 0).
 * 자의 BFS(`tools/hs_v221_danger.mjs` planTo)는 «방+복도 사각형이 2px 넘게 겹치면 간선»으로
 * 그래프를 세우고, 목표 노드가 다른 성분에 있으면 `noPath++` 하고 옛 직선걷기로 떨어진다.
 *
 * 그래서 갈라야 할 셋:
 *   ⓐ 방이 안 이어졌나 — 그래프 성분이 2개 이상인가(구조적으로 못 가는 방이 있나)
 *   ⓑ 목표 셀이 벽 안인가 — 방 중심/계단이 어느 사각형에도 안 들어가나
 *   ⓒ BFS 예산 초과인가 — 성분은 하나인데 홉 수가 큰가
 *
 * genFloor 는 hs/map.js 에서 그대로 가져온다(게임 코드 무변경). 씨앗은 자와 같은 LCG.
 */
import { genFloor } from "../hs/map.js";

const SEEDS = (process.env.SEEDS || "1,2,3,4,5").split(",").map(Number);
const MAXFLOOR = Number(process.env.MAXFLOOR || 5);
const REPS = Number(process.env.REPS || 40);   // 씨앗당 층당 몇 판을 볼지(genFloor 는 Math.random 만 쓴다)

function seedRandom(seed) {
  let s = (seed >>> 0) || 1;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
// ★ 자(hs_v221_danger.mjs)의 rectsMeet/buildGraph 와 **같은 규칙**이어야 한다. 한 글자도 바꾸지 말 것.
function rectsMeet(a, b) {
  const ox0 = Math.max(a.x, b.x), ox1 = Math.min(a.x + a.w, b.x + b.w);
  const oy0 = Math.max(a.y, b.y), oy1 = Math.min(a.y + a.h, b.y + b.h);
  if (ox1 > ox0 + 2 && oy1 > oy0 + 2) return { x: (ox0 + ox1) / 2, y: (oy0 + oy1) / 2 };
  return null;
}
function analyze(G) {
  const nodes = [...G.rooms, ...G.corridors];
  const nRoom = G.rooms.length;
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (rectsMeet(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
  // 성분
  const comp = new Array(nodes.length).fill(-1); let nc = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (comp[i] >= 0) continue;
    const q = [i]; comp[i] = nc;
    for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (comp[v] < 0) { comp[v] = nc; q.push(v); }
    nc++;
  }
  const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const nodeAt = (x, y) => { for (let i = 0; i < nodes.length; i++) if (inside(nodes[i], x, y)) return i; return -1; };
  const start = nodeAt(G.startX, G.startY);
  const startComp = start >= 0 ? comp[start] : -1;
  // ⓐ 시작 성분에서 못 가는 «방»
  let roomsUnreach = 0;
  for (let i = 0; i < nRoom; i++) {
    const r = G.rooms[i], cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const ni = nodeAt(cx, cy);
    if (ni < 0 || comp[ni] !== startComp) roomsUnreach++;
  }
  // ⓑ 목표점이 어느 사각형에도 안 든 경우(방 중심 · 계단 · 팩 중심)
  let goalsOutside = 0, goalsTot = 0;
  const chk = (x, y) => { goalsTot++; if (nodeAt(x, y) < 0) goalsOutside++; };
  for (const r of G.rooms) chk(r.x + r.w / 2, r.y + r.h / 2);
  if (G.stairs) chk(G.stairs.x, G.stairs.y);
  for (const p of G.packs) chk(p.x, p.y);
  // ⓒ 홉 수(시작 → 각 방) 최대
  const D = new Array(nodes.length).fill(-1);
  if (start >= 0) { D[start] = 0; const q = [start];
    for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (D[v] < 0) { D[v] = D[q[h]] + 1; q.push(v); } }
  let maxHop = 0;
  for (let i = 0; i < nRoom; i++) { const r = G.rooms[i]; const ni = nodeAt(r.x + r.w / 2, r.y + r.h / 2);
    if (ni >= 0 && D[ni] > maxHop) maxHop = D[ni]; }
  return { nRoom, nNode: nodes.length, nComp: nc, startOutside: start < 0 ? 1 : 0,
           roomsUnreach, goalsOutside, goalsTot, maxHop };
}

console.log(`■ hs_v225_graph — 「경로없음」의 원인을 셋으로 가른다 (씨앗 ${SEEDS.join("/")} × 층 1~${MAXFLOOR} × ${REPS}판)`);
const rowsByFloor = new Map();
for (const seed of SEEDS) {
  seedRandom(seed);
  for (let rep = 0; rep < REPS; rep++) {
    for (let f = 1; f <= MAXFLOOR; f++) {
      const a = analyze(genFloor(f));
      if (!rowsByFloor.has(f)) rowsByFloor.set(f, []);
      rowsByFloor.get(f).push(a);
    }
  }
}
const med = (xs) => { const s = [...xs].sort((p, q) => p - q); return s[s.length >> 1]; };
let totSplit = 0, totRuns = 0, totUnreach = 0, totGoalOut = 0;
console.log(`\n  층 | 판 | 방(중앙) | 노드(중앙) | 성분>1 판 | 못가는 방(합) | 목표가 벽밖(합/전체) | 최대홉(중앙/최대)`);
for (let f = 1; f <= MAXFLOOR; f++) {
  const R = rowsByFloor.get(f);
  const split = R.filter((a) => a.nComp > 1).length;
  const unreach = R.reduce((s, a) => s + a.roomsUnreach, 0);
  const gout = R.reduce((s, a) => s + a.goalsOutside, 0);
  const gtot = R.reduce((s, a) => s + a.goalsTot, 0);
  const hops = R.map((a) => a.maxHop);
  totSplit += split; totRuns += R.length; totUnreach += unreach; totGoalOut += gout;
  console.log(`  ${f}  | ${R.length} | ${med(R.map(a=>a.nRoom))} | ${med(R.map(a=>a.nNode))} | ${split} (${(100*split/R.length).toFixed(1)}%) | ${unreach} | ${gout}/${gtot} (${(100*gout/gtot).toFixed(1)}%) | ${med(hops)} / ${Math.max(...hops)}`);
}
console.log(`\n  ▣ 판정 재료 — 성분 쪼개진 판 ${totSplit}/${totRuns} (${(100*totSplit/totRuns).toFixed(1)}%) · 못 가는 방 합 ${totUnreach} · 목표가 벽 밖 ${totGoalOut}`);
console.log(`     ⓐ 성분>1 이 흔하면 = 방이 «구조적으로» 안 이어진 것(맵 생성 또는 간선 규칙 2px 문턱).`);
console.log(`     ⓑ 목표가 벽 밖이 흔하면 = 자가 «사각형 밖»을 목표로 잡는 것(nodeAt 이 최근접으로 때워 엉뚱한 데로 간다).`);
console.log(`     ⓒ 둘 다 0 이면 = 예산/타이밍 쪽 — planTo 를 언제 다시 부르는지를 본다.`);
