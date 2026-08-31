/* hs/ V-202 자 — 「층 만드는 법」의 구조를 잰다 (BSP 로 갈아엎기 전/후).
 *
 *   node tools/hs_v202_map.mjs [before|after] [씨앗수] [층들]
 *   node tools/hs_v202_map.mjs before                 (기본 — 씨앗 8 × 층 1·5·10)
 *   node tools/hs_v202_map.mjs after 12 1,5,10
 *
 * 왜 (ROADMAP V-202): genFloor 가 방을 무작위로 뿌리고 복도를 방중심→방중심 L 로 이어
 *   ① 갈래가 없고 ② 방이 다 비슷하고 ③ 복도가 남의 방을 관통하고 ④ 깊을수록 휑하다.
 *   값이 아니라 구조를 바꿔야 하므로([[seam-not-values]]) 먼저 «자»를 세워 before 를 재고,
 *   BSP 로 고친 뒤 같은 자로 after 를 재 「구조가 생겼나」를 수치로 본다.
 * ★ genFloor 는 순수 JS(브라우저 불필요)라 여기서 바로 import 해 씨앗을 심고 굴린다.
 *
 * 재는 것:
 *   · 관통 복도 수 — 복도의 «중심선»이 어떤 방을 «가로질러» 양끝을 다 넘어가는 개수
 *     (끝점 방은 안 세진다 — 그 방 안에서 멈추니 반대편 모서리를 못 넘는다). before 에서
 *     크게 나와야 자가 멀쩡한 것이다. 링크 메타데이터에 안 기대는 순수 기하 정의라
 *     before/after 를 똑같이 잰다.
 *   · 방 넓이 최대/최소 비 — 큰 홀과 좁은 골방이 갈리는가(1 에 가까우면 다 비슷).
 *   · 방 개수 — 층 1 대 층 10 에서 늘어나는가.
 *   · 바닥 비율 — (방∪복도 넓이)/전체. 깊은 층에서 안 줄어드는가.
 *   · 도달률 — 방∪복도 격자 flood fill 로 시작점에서 모든 방에 걸어 닿는가(반드시 100%).
 *   · 만든 시간(ms) — 층당 50ms 를 넘기지 마라.
 */
import { genFloor } from "../hs/map.js";

const MODE = process.argv[2] === "after" ? "after" : "before";
const NSEED = +(process.argv[3] || 8);
const FLOORS = (process.argv[4] || "1,5,10").split(",").map((s) => +s);
const SEEDS = Array.from({ length: NSEED }, (_, i) => 1337 + i * 1103);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");

// 씨앗 심기 — genFloor 안 Math.random 을 결정적 LCG 로 바꾼다(자마다 판이 재현된다).
function seedRandom(seed) {
  let s = (seed >>> 0) || 1;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// 복도 하나(사각형)가 어떤 방을 «가로지르나» — 중심선이 방 안을 지나며 양끝을 다 넘는다.
function crossesRoom(c, r) {
  const horiz = c.w >= c.h;              // 가로 복도 = 폭이 높이보다 크다
  if (horiz) {
    const cyc = c.y + c.h / 2, x1 = c.x, x2 = c.x + c.w;
    return r.y < cyc && cyc < r.y + r.h && x1 < r.x && x2 > r.x + r.w;
  } else {
    const cxc = c.x + c.w / 2, y1 = c.y, y2 = c.y + c.h;
    return r.x < cxc && cxc < r.x + r.w && y1 < r.y && y2 > r.y + r.h;
  }
}

function measure(f) {
  const { W, H, rooms, corridors, stairs, startX, startY } = f;

  // ① 관통 복도
  let through = 0;
  for (const c of corridors) for (const r of rooms) if (crossesRoom(c, r)) through++;

  // ② 방 넓이 최대/최소 비
  const areas = rooms.map((r) => r.w * r.h);
  const areaRatio = Math.max(...areas) / Math.min(...areas);

  // ③④⑤ 격자로 바닥 비율 + flood fill 도달률
  const CELL = 30;
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
  const walk = new Uint8Array(cols * rows);
  const paint = (rc) => {
    const x0 = Math.max(0, Math.floor(rc.x / CELL)), x1 = Math.min(cols - 1, Math.floor((rc.x + rc.w) / CELL));
    const y0 = Math.max(0, Math.floor(rc.y / CELL)), y1 = Math.min(rows - 1, Math.floor((rc.y + rc.h) / CELL));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) walk[gy * cols + gx] = 1;
  };
  for (const r of rooms) paint(r);
  for (const c of corridors) paint(c);
  let walkCells = 0;
  for (let i = 0; i < walk.length; i++) if (walk[i]) walkCells++;
  const floorRatio = walkCells / (cols * rows);

  // flood fill from start
  const seen = new Uint8Array(cols * rows);
  const sgx = Math.min(cols - 1, Math.max(0, Math.floor(startX / CELL)));
  const sgy = Math.min(rows - 1, Math.max(0, Math.floor(startY / CELL)));
  const stack = [];
  if (walk[sgy * cols + sgx]) { seen[sgy * cols + sgx] = 1; stack.push(sgy * cols + sgx); }
  while (stack.length) {
    const idx = stack.pop(), gx = idx % cols, gy = (idx - gx) / cols;
    const nb = [[gx - 1, gy], [gx + 1, gy], [gx, gy - 1], [gx, gy + 1]];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if (walk[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
    }
  }
  let reached = 0;
  for (const r of rooms) {
    const gx = Math.min(cols - 1, Math.max(0, Math.floor(r.cx / CELL)));
    const gy = Math.min(rows - 1, Math.max(0, Math.floor(r.cy / CELL)));
    if (seen[gy * cols + gx]) reached++;
  }
  const reachPct = 100 * reached / rooms.length;

  return { W, H, rooms: rooms.length, through, areaRatio: +areaRatio.toFixed(2),
    floorRatio: +floorRatio.toFixed(3), reachPct: +reachPct.toFixed(1), stairs: !!stairs };
}

log(`\n■ hs_v202_map (${MODE}) — 씨앗 ${SEEDS.length}개 × 층 ${FLOORS.join("/")}`);
const byFloor = {};
for (const floor of FLOORS) {
  const runs = [];
  for (const seed of SEEDS) {
    seedRandom(seed);
    const t0 = performance.now();
    const f = genFloor(floor);
    const ms = performance.now() - t0;
    const m = measure(f);
    m.ms = +ms.toFixed(1); m.seed = seed;
    runs.push(m);
  }
  const avg = (k) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
  const g = {
    floor,
    rooms: +avg("rooms").toFixed(1),
    through: +avg("through").toFixed(2),
    throughMax: Math.max(...runs.map((r) => r.through)),
    areaRatio: +avg("areaRatio").toFixed(2),
    areaRatioMin: +Math.min(...runs.map((r) => r.areaRatio)).toFixed(2),
    floorRatio: +avg("floorRatio").toFixed(3),
    reachPct: +avg("reachPct").toFixed(1),
    reachMin: +Math.min(...runs.map((r) => r.reachPct)).toFixed(1),
    msMax: +Math.max(...runs.map((r) => r.ms)).toFixed(1),
  };
  byFloor[floor] = g;
  log(`  층 ${String(floor).padStart(2)}: 방 ${g.rooms} · 관통 ${g.through}(최대 ${g.throughMax}) · ` +
    `넓이비 ${g.areaRatio}(최소 ${g.areaRatioMin}) · 바닥 ${(g.floorRatio * 100).toFixed(1)}% · ` +
    `도달 ${g.reachPct}%(최소 ${g.reachMin}) · ${g.msMax}ms`);
}

if (FLOORS.includes(1) && FLOORS.includes(10)) {
  const roomsGrow = byFloor[10].rooms > byFloor[1].rooms;
  const floorHeld = byFloor[10].floorRatio >= byFloor[1].floorRatio - 0.02;
  const allReach = FLOORS.every((f) => byFloor[f].reachMin === 100);
  const noThrough = FLOORS.every((f) => byFloor[f].throughMax === 0);
  // 관통·도달은 «반드시 늘 참»인 불변식이라 최대/최소로 조인다. 넓이비는 방이 «갈리는가»를
  // 보는 분포 성질이라 대표값(평균)으로 본다 — 작은 층1 한 씨앗의 꼬리에 통과가 걸리지 않게.
  const bigRatio = FLOORS.every((f) => byFloor[f].areaRatio >= 2.5);
  const fast = FLOORS.every((f) => byFloor[f].msMax <= 50);
  log(`\n▣ ${MODE} 통과선:`);
  log(`  관통 복도 0        → ${noThrough ? "✔" : "✘"}`);
  log(`  도달률 100%        → ${allReach ? "✔" : "✘"}`);
  log(`  넓이비 ≥ 2.5       → ${bigRatio ? "✔" : "✘"}`);
  log(`  방 개수 층10>층1   → ${roomsGrow ? "✔" : "✘"} (${byFloor[1].rooms} → ${byFloor[10].rooms})`);
  log(`  바닥비 안 줄어듦   → ${floorHeld ? "✔" : "✘"} (${(byFloor[1].floorRatio * 100).toFixed(1)}% → ${(byFloor[10].floorRatio * 100).toFixed(1)}%)`);
  log(`  층당 ≤ 50ms        → ${fast ? "✔" : "✘"}`);
  if (MODE === "after")
    log(`  ▶ ${[noThrough, allReach, bigRatio, roomsGrow, floorHeld, fast].every(Boolean) ? "다 규격 안 ✅" : "미달 있음 ❌"}`);
}

const fs = await import("node:fs");
fs.writeFileSync(`tmp/hs_v202_map_${MODE}.json`, JSON.stringify(byFloor, null, 2));
log(`  ▸ tmp/hs_v202_map_${MODE}.json`);
