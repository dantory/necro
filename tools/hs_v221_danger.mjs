/* hs/ V-223 자 ②「가운데 띠(hp최저 10~60%)가 생겼는가」를 «걷는 자»로 다시 잰다 (i-frame 전/후 · 같은 바이너리).
 *
 *   node tools/hs_v221_danger.mjs [ifr] [최대층] [씨앗들]
 *   node tools/hs_v221_danger.mjs 0.4              (기본 — i-frame 0.4s · 층 5 · 씨앗 1~5)
 *   node tools/hs_v221_danger.mjs 0.4 5 1,2,3,4,5
 *   출력: $V223_OUT (기본 tmp/hs_v223_band.json) — per-cell(runs[].cells[]) 포함.
 *
 * 왜 (NOW/ROADMAP V-223): V-217~V-221 의 밴드 판정은 전부 이 자의 «옛 걷기»(직선·dist≤240 정지)로 쟀다.
 *   V-222 진단이 그 걷기가 층 면적의 1.4%·방 10% 만 밟는다는 걸 보였다 — 면적 1% 짜리 자로 낸 판정이라 못 믿는다.
 *   그래서 걷기를 V-222 의 BFS 길찾기(hs_v222_starve.mjs AUTO·V222ACC 를 그대로 옮겨 심음)로 갈아 끼우고,
 *   판정 골격(hp최저 표본·죽은층·밴드)은 그대로 둔 채 곱 16·i-frame 0.4s 로 밴드를 다시 잰다.
 *   ★ 앞뒤 비교가 아니라 «새 자로 낸 값 하나»가 결과다(교전층이 11→24 로 늘어 옛 밴드와 분모가 다르다).
 *
 * 두 팔: __V221=false(앞·i-frame 끔) 대 __V221_IFR=ifr(뒤·i-frame ifr) 를 한 프로세스에서 잰다.
 *   걷기 손잡이 __V222_NAV 는 두 팔 다 true(BFS)로 고정 — 옛 직선걷기로 되돌리려면 __V222_NAV=false.
 *
 * 끝 조건(교전층 = 처치>0 인 층만 분모 · 굶은 층 제외):
 *   교전층 hp최저 10~60% 비율 ≥ 25% · 죽은 층 5~20% · 완주(씨앗 중앙) 137~319s.
 * 회귀: 벽밖 0% · 발사체 벽밖 0% · 콘솔오류 0 · frame p95 규격 안.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const NAV_MINPASS = Number(process.env.NAV_MINPASS || 48);   // ★ V-225 — 자의 그래프 간선: 지날 수 있는 폭(px)
let NAV_LEGACY = process.env.NAV_LEGACY === "1";   // ★ V-225 — 옛 간선 규칙(두 축 다 >2px 겹침). V225_ARMS=1 이면 팔마다 뒤집는다

const URL = "http://127.0.0.1:8774/hs/index.html";
const IFR = process.argv[2] !== undefined ? +process.argv[2] : 0.4;
const MAXFLOOR = +(process.argv[3] || 5);
const SEEDS = (process.argv[4] || "1,2,3,4,5").split(",").map((s) => +s);
const OUT = process.env.V223_OUT || "tmp/hs_v223_band.json";
const VW = 1512, VH = 863;
const FLOORCAP = 45, FLOORCAP_STEP = 5;   // ㉢ 깊은 층일수록 셀이 커지는데(205→374) 시간이 같아 덜 덮인다.
//   층 깊이로 시간을 준다: 층1..5 = 45·50·55·60·65s(완주 ~275s · 규격 137~319s 안). 얕은 층은 옛 45s 그대로.
const capFor = (f) => FLOORCAP + Math.max(0, f - 1) * FLOORCAP_STEP;
const totalCap = Array.from({ length: MAXFLOOR }, (_, i) => capFor(i + 1)).reduce((a, b) => a + b, 0);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (totalCap * SEEDS.length * 2 + 1800) * 1000);

await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); let errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?").slice(0, 160));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push("console.error " + (m.params.args?.[0]?.value || "?")); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const injectSrc = (seed, ifr, grow, v226b) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__FOE_DMG = 16;
globalThis.__RANGED_MOB = true;
globalThis.__MEASURE_REVIVE = true;
globalThis.__NAV_LEGACY = ${NAV_LEGACY};       // ★ V-225 — 자의 그래프 간선 규칙(true = 옛 «두 축 다 >2px»)
globalThis.__NAV_MINPASS = ${NAV_MINPASS};     // ★ V-225 — 지날 수 있는 폭(px)
globalThis.__V222_NAV = true;              // 걷기: V-222 BFS 길찾기 켬(옛 직선걷기로 되돌리려면 false)
globalThis.__V221 = ${ifr > 0 ? "true" : "false"};   // i-frame 손잡이 — 팔마다 뒤집는다
globalThis.__V221_IFR = ${ifr};
globalThis.__V226_GROW = ${grow === false ? "false" : "true"};  // V-226: 사람이 번 점수를 쓰는가(false = 옛 «박은 빌드»)
globalThis.__V226B = ${v226b === false ? "false" : "true"};   // V-226B: 적 dmg 곡선을 hp 곡선에서 뗐는가(false = 옛 «한 곡선»)
window.__ft = []; window.__lt = 0;
(function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
  if(window.__ft.length>6000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());`;

const MINION = { attr: { int: 20, vit: 10, str: 10 }, skill: { slot: 8, grade: 2, mdmg: 10, mhp: 8, spear: 5 }, grade: 2 };

// ── 걷기 (V-222 ②) — 사각형 그래프 BFS 길찾기로 실제로 층을 걷는다 ────────────────
// 옛 자(v221)는 nearestPack 을 향해 WASD 직선만 밀어 벽에 끼고, dist<=240 이면 팩 «중심» 앞에
// 45s 를 그냥 섰다. 맵은 rooms∪corridors 가 전부 사각형이고 inFree 가 그 둘로만 통행을 판정하니
// A* 격자가 필요 없다 — 사각형을 노드로, 겹치는 사각형끼리 간선을 놓아 BFS 로 최단 사각형 열을 얻고
// 이웃 겹침의 «중심»을 웨이포인트로 하나씩 통과한다. 정지는 팩 중심이 아니라 «가장 가까운 살아있는
// 적»이 근접 사거리 안에 들어왔을 때만. 끼면 다음 웨이포인트로 건너뛰거나 팩을 잠시 블랙리스트.
//   globalThis.__V222_NAV === false → 옛 직선 걷기로 되돌린다(기본은 길찾기 ON).
const AUTO = `(SPEC => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup',   { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const tap = k => { kd(k); setTimeout(() => ku(k), 40); };
  const aim = (sx, sy) => cv.dispatchEvent(new MouseEvent('mousemove', { clientX: sx, clientY: sy, bubbles: true }));
  cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, bubbles: true }));
  const A = { lastQ: 0, lastE: 0, lastPt: 0, navFail: 0, noPath: 0, stuckSkips: 0, reTarget: 0, toured: 0,
    tl: [], cf: null, lastTick: 0, dt: 0 }; window.__a222 = A;
  // ── 층별 나눔(㉠ 진단 계기) ── 왜 어떤 층은 «안 걷나»를 수로 가른다:
  //   dwellMs 다훑기 대기 · moveMs 키 눌러 이동 · idleMs 데드존/무입력 · targets 목표 교체 수.
  //   dwell 큼 → ⓐ(한 팩에 45s) · move 큼인데 pathLen 작음 → ⓑ(벽끼임: 눌러도 안 감) · targets·방 작음 → ⓒ(한구석 맴돎).
  function pushFloor() { if (!A.cf) return; A.cf.stuckSkips = A.stuckSkips - A.cf.sk0; A.cf.reTarget = A.reTarget - A.cf.rt0;
    A.cf.toured = A.toured - A.cf.to0; A.tl.push(A.cf); A.cf = null; }
  window.__a222flush = pushFloor;
  const Z = window.HSZ;
  const NAV = () => globalThis.__V222_NAV !== false;   // 기본 켬 · false 면 옛 직선걷기
  function ensureBuild() {
    const p = window.G.player;
    if (p.__built) return;
    p.attr = { str:0,dex:0,int:0,sta:0,def:0,vit:0 };
    p.skill = { slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0 };
    p.mult = { dmg:1, body:1, minionDmg:1 }; p.buildSlots = 0; p.grade = 0;
    Object.assign(p.attr, SPEC.attr); Object.assign(p.skill, SPEC.skill);
    p.attrPts = 0; p.sklPts = 0; window.recalc(); p.grade = SPEC.grade;
    p.hp = p.maxhp; p.mana = p.maxmana; p.__built = 1;
  }
  // ── V-226 ① 자 고침 — «사람도 자라야» 두 곡선을 견줄 수 있다 ──────────────────
  // 옛 자는 SPEC 을 한 번 박고 attrPts/sklPts 를 0 으로 눌러, 층을 내려가며 레벨이 올라도
  // 사람 maxhp 가 «층1~층5 내내 4515 로 고정»이었다(2026-09-01 측정 10칸 전부 동일).
  // 그 자로 「깊이 곡선이 사람보다 가파른가」를 물으면 답은 늘 예 — 사람이 상수니까.
  // 그래서 레벨업으로 «번» 점수만 사람이 하듯 쓴다(초기 SPEC 비율 그대로: int2·vit1·str1).
  //   globalThis.__V226_GROW === false → 옛 «박은 빌드»로 되돌린다.
  const GROW_ATTR = ['int', 'int', 'vit', 'str'];
  const GROW_SKILL = ['mdmg', 'mhp', 'slot', 'grade', 'spear'];
  let growA = 0;
  function spendPoints() {
    if (globalThis.__V226_GROW === false) return;
    const p = window.G.player;
    let guard = 64;
    while (p.attrPts > 0 && guard-- > 0) {
      if (!window.spendAttr(GROW_ATTR[growA++ % GROW_ATTR.length])) break;
    }
    guard = 64;
    while (p.sklPts > 0 && guard-- > 0) {
      let spent = false;
      for (const k of GROW_SKILL) if (window.spendSkill(k)) { spent = true; break; }
      if (!spent) break;                     // 다 최대치면 남겨 둔다(무한루프 금지)
    }
  }
  function nearestEnemy(p) { let b = null, bd = 1e18;
    for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) {
      const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2; if (d < bd) { bd = d; b = m; } }
    return b ? { m: b, d: Math.sqrt(bd) } : null; }

  // ── 사각형 그래프 (방 ∪ 복도) — 층마다 다시 짓는다 ─────────────────────
  const nav = { floor: -1, rooms: null, nodes: [], adj: [], path: null, wi: 0,
    goalTok: null, lastPlan: 0, hist: [], black: new Map(), target: null, toured: new Set(),
    dwellStart: 0, targetStart: 0, roomSeen: new Set(),
    roomTarget: null, roomBlack: new Map(), reachMin: Infinity, reachT: 0,
    escapeUntil: 0, escapeDx: 0, escapeDy: 0, stuckStreak: 0, lastStuckT: 0 };
  // 두 사각형이 겹치면(맞닿으면) 겹침 구역의 중심을 돌려준다 — 그 점은 두 사각형 안이라 걸을 수 있다.
  function rectsMeet(a, b) {
    const ox0 = Math.max(a.x, b.x), ox1 = Math.min(a.x + a.w, b.x + b.w);
    const oy0 = Math.max(a.y, b.y), oy1 = Math.min(a.y + a.h, b.y + b.h);
    // ★ V-225 ① — 옛 규칙은 «두 축 다 2px 넘게 겹칠 것»을 요구했다. 그런데 복도는 방의 «모서리에 딱 붙어»
    //   생기는 일이 잦아 한 축 겹침이 0 이다(hs/map.js hRect/vRect 는 방 경계에서 시작한다). 그래서 자의
    //   그래프가 조각나고, 목표가 다른 조각에 있으면 planTo 가 noPath → 옛 직선걷기로 떨어져 벽에 꼈다.
    //   순수 node 로 1000 판을 세어 보니(tools/hs_v225_graph.mjs) **성분>1 이 10.7%**(층1 5.5% → 층5 18.5%),
    //   못 가는 방 367 개. 문턱만 0 으로 낮추면 0.8% 로 줄고, «닿기만 해도 이음»이면 0% 다.
    //   다만 모서리끼리 점으로 스친 것은 사람이 못 지나므로 **지날 수 있는 폭(≥MINPASS)** 을 함께 건다
    //   (복도폭 150 · 사람 반지름 22 → 48 이면 넉넉히 안쪽). 되돌림: 환경변수 NAV_LEGACY=1 이면 옛 규칙(두 축 다 >2px)으로 정확히 돌아간다.
    if (globalThis.__NAV_LEGACY) return (ox1 > ox0 + 2 && oy1 > oy0 + 2) ? { x: (ox0 + ox1) / 2, y: (oy0 + oy1) / 2 } : null;
    if (ox1 < ox0 || oy1 < oy0) return null;
    if (Math.max(ox1 - ox0, oy1 - oy0) < (globalThis.__NAV_MINPASS ?? 48)) return null;
    return { x: (ox0 + ox1) / 2, y: (oy0 + oy1) / 2 };
  }
  function buildGraph(G) {
    const nodes = [];
    for (const r of G.rooms) nodes.push(r);
    for (const c of G.corridors) nodes.push(c);
    const adj = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (rectsMeet(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
    nav.floor = G.floor; nav.rooms = G.rooms; nav.nodes = nodes; nav.adj = adj;
    nav.path = null; nav.wi = 0; nav.goalTok = null; nav.black.clear(); nav.target = null;
    nav.toured.clear(); nav.dwellStart = 0; nav.roomSeen.clear();
    nav.roomTarget = null; nav.roomBlack.clear(); nav.reachMin = Infinity;
    nav.escapeUntil = 0; nav.stuckStreak = 0; nav.lastStuckT = 0;
  }
  // 그 점이 든 사각형 인덱스 — 밖이면(끼임·모서리) 중심이 가장 가까운 사각형.
  function nodeAt(x, y) {
    const N = nav.nodes; let best = -1, bd = 1e18;
    for (let i = 0; i < N.length; i++) { const r = N[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function bfs(si, gi) {
    if (si < 0 || gi < 0) return null;
    if (si === gi) return [si];
    const prev = new Array(nav.nodes.length).fill(-2); prev[si] = -1;
    const q = [si];
    for (let h = 0; h < q.length; h++) { const u = q[h];
      if (u === gi) break;
      for (const v of nav.adj[u]) if (prev[v] === -2) { prev[v] = u; q.push(v); } }
    if (prev[gi] === -2) return null;
    const seq = []; for (let c = gi; c !== -1; c = prev[c]) seq.push(c); seq.reverse();
    return seq;
  }
  // 목표까지 경로를 짠다 → nav.path = [웨이포인트...], 마지막은 실제 목표점.
  function planTo(p, gx, gy, tok) {
    nav.goalTok = tok; nav.lastPlan = performance.now();
    const seq = bfs(nodeAt(p.x, p.y), nodeAt(gx, gy));
    if (!seq) { A.noPath++; nav.path = null; nav.wi = 0; return; }
    const wp = [];
    for (let i = 0; i + 1 < seq.length; i++) { const w = rectsMeet(nav.nodes[seq[i]], nav.nodes[seq[i + 1]]); if (w) wp.push(w); }
    wp.push({ x: gx, y: gy });
    nav.path = wp; nav.wi = 0;
  }
  function nearestPack(p) { let b = null, bd = 1e18, bi = -1; const now = performance.now();
    for (let i = 0; i < G.packs.length; i++) { const q = G.packs[i];
      if (q.done) continue;
      const bl = nav.black.get(q); if (bl && bl > now) continue;
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; b = q; bi = i; } }
    return b ? { q: b, i: bi, d: Math.sqrt(bd) } : null; }
  // ── 층 순회(floor patrol) — «팩 사냥»이 아니라 «안 가 본 방»을 그래프 거리 순으로 돈다 ──────
  //   ㉠ 진단(2026-09-01): 봇은 45s 내내 키를 눌렀는데(이동 46s·대기 0) 팩 빽빽한 층(30팩)에선 503px 밖에
  //   못 걸었다 — 원인은 ⓑ(벽끼임). 옛 자는 목표를 «가장 가까운 팩»으로 고르고, 끼임감지를 combat(적<200px)
  //   이면 꺼서, 적 옆에 낀 봇이 안 풀렸다. 이제 목표는 방이고, 끼임감지는 «항상» 돈다.
  //   방들은 buildGraph 가 rooms 를 먼저 넣어 노드 0..rooms.length-1 이 곧 방 인덱스다.
  function graphDist(si) {   // 현재 노드에서 각 노드까지 BFS 홉 수(도달불가 -1)
    const D = new Array(nav.nodes.length).fill(-1); if (si < 0) return D;
    D[si] = 0; const q = [si];
    for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nav.adj[u]) if (D[v] < 0) { D[v] = D[u] + 1; q.push(v); } }
    return D; }
  // 안 밟은 방 중 그래프상 가장 가까운 방을 고른다. 현재 목표 방이 아직 안 밟혔고 블랙 안이면 유지(퐁당 방지).
  function nextRoom(p, now) {
    const rt = nav.roomTarget;
    if (rt != null && rt >= 0 && !nav.roomSeen.has(rt)) { const bl = nav.roomBlack.get(rt); if (!bl || bl <= now) return rt; }
    const D = graphDist(nodeAt(p.x, p.y));
    let best = -1, bd = 1e9;
    for (let i = 0; i < nav.rooms.length; i++) {
      if (nav.roomSeen.has(i)) continue;
      const bl = nav.roomBlack.get(i); if (bl && bl > now) continue;
      const d = D[i] < 0 ? 1e6 + i : D[i];   // 도달불가(끊긴 방)는 맨 뒤로
      if (d < bd) { bd = d; best = i; } }
    return best; }
  // 방향 키 — 목표점을 향해 WASD 를 켠다(dead-zone 30).
  function stepToward(want, tx, ty, p) {
    const dx = tx - p.x, dy = ty - p.y;
    if (dx > 30) want.add('d'); else if (dx < -30) want.add('a');
    if (dy > 30) want.add('s'); else if (dy < -30) want.add('w');
  }
  // ── 벽 인식 조향(맨해튼 우선) ── 맵은 축정렬 사각형(방∪복도)이라 «대각선»이 코너 벽에 박힌다(ⓑ 원인).
  //   그래서 순수 축(상하좌우)을 대각선보다 먼저 시도하고, window.__walkable(x,y)=실제 이동가능(소품 포함)로
  //   앞이 걸을 수 있는지 찍어 첫 통과 방향을 고른다. 반대편으로 도는 «궤도 돌기»를 없애려 큰 각(반전)은 뒤에 둔다.
  const PROBE = 30;
  function walkStep(want, tx, ty, p) {
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    if (dist < 10) return;
    const sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1, domX = Math.abs(dx) >= Math.abs(dy);
    // 우선순위: 주축(순수) → 부축(순수) → 목표 대각선 → 부축 반대(벽 따라 미끄러짐) → 주축 반대
    const cands = domX
      ? [[sx, 0], [0, sy], [sx, sy], [0, -sy], [-sx, 0]]
      : [[0, sy], [sx, 0], [sx, sy], [-sx, 0], [0, -sy]];
    const W = window.__walkable;
    let pick = domX ? [sx, 0] : [0, sy];   // __walkable 없으면 주축
    if (W) for (const c of cands) { if (W(p.x + c[0] * PROBE, p.y + c[1] * PROBE)) { pick = c; break; } }
    if (pick[0]) want.add(pick[0] > 0 ? 'd' : 'a');
    if (pick[1]) want.add(pick[1] > 0 ? 's' : 'w');
  }
  // ── 낀 자리 탈출(㉡) ── 웨이포인트만 넘기면 벽에 박힌 봇은 안 풀린다(ⓑ 재현: net~0 인데 45s 내내 이동).
  //   8방향으로 걸을 수 있는 길이를 재 «가장 트인 쪽»을 골라 잠깐 그리로만 민다 — 벽에서 물리적으로 떼어낸다.
  const ESC_DIRS = [[1,0],[-1,0],[0,1],[0,-1],[0.7071,0.7071],[0.7071,-0.7071],[-0.7071,0.7071],[-0.7071,-0.7071]];
  function clearRun(x, y, ux, uy) { const W = window.__walkable; if (!W) return 0;
    let d = 0; for (let s = 24; s <= 260; s += 24) { if (W(x + ux * s, y + uy * s)) d = s; else break; } return d; }
  //   트인 쪽 중에서도 «목표(웨이포인트) 쪽»을 고른다 — 안 그러면 넓은 스폰 방 «안쪽»으로 도로 밀려 좁은 출구를 못 뚫는다.
  function bestEscape(p, gx, gy) { const tx = gx - p.x, ty = gy - p.y, tl = Math.hypot(tx, ty) || 1;
    let bx = 0, by = 0, best = -1e9, ok = false;
    for (const [ux, uy] of ESC_DIRS) { const d = clearRun(p.x, p.y, ux, uy); if (d < 48) continue;
      const score = d + ((ux * tx + uy * ty) / tl) * 140;   // 트인 길이 + 목표 쪽 가산
      if (score > best) { best = score; bx = ux; by = uy; ok = true; } }
    return { ux: bx, uy: by, d: ok ? 1 : 0 }; }

  function tick() {
    const G = window.G, cam = window.cam;
    if (!G || !G.player) { requestAnimationFrame(tick); return; }
    if (G.dead) { tap('r'); requestAnimationFrame(tick); return; }
    ensureBuild();
    spendPoints();                            // V-226 ① — 번 점수를 사람처럼 쓴다
    const p = G.player;
    if (nav.floor !== G.floor || nav.rooms !== G.rooms) buildGraph(G);
    { const nowT = performance.now();   // 층별 나눔 계기: 층이 바뀌면 앞 층을 밀어 넣고 새 통을 연다.
      if (!A.cf || A.cf.floor !== G.floor) { pushFloor();
        A.cf = { floor: G.floor, dwellMs: 0, moveMs: 0, idleMs: 0, targets: 0, sk0: A.stuckSkips, rt0: A.reTarget, to0: A.toured };
        A.lastTick = nowT; }
      A.dt = A.lastTick ? Math.min(nowT - A.lastTick, 300) : 0; A.lastTick = nowT; }
    const np = nearestPack(p);
    const ne = nearestEnemy(p);
    const want = new Set();

    if (!NAV()) {
      // ── 옛 직선 걷기(되돌리기) ── nearestPack→계단, dist<=240 이면 정지 ──
      const tx = np ? np.q.x : G.stairs.x, ty = np ? np.q.y : G.stairs.y;
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
      if (np && dist <= 240) {
        if (ne && ne.d < 70) { if (Math.abs(dx) > 30) want.add(dx > 0 ? 'a' : 'd'); if (Math.abs(dy) > 30) want.add(dy > 0 ? 'w' : 's'); }
      } else {
        if (dx > 40) want.add('d'); else if (dx < -40) want.add('a');
        if (dy > 40) want.add('s'); else if (dy < -40) want.add('w');
      }
    } else {
      // ── 층 순회(floor patrol) ── 안 가 본 방을 그래프거리 순으로 돈다. 멈추지 않는다 — 지나가며
      //   스킬·미니언이 팩을 깬다(처치는 덤). 방에 들어서면 밟힘 처리되어 자연히 다음 방으로 넘어간다.
      const now = performance.now();
      // 지금 든 방을 «밟은 방»으로 기록(계기 V222ACC 와 같은 판정) — 목표 선택·완주 판정에 함께 쓴다.
      for (let i = 0; i < G.rooms.length; i++) { const r = G.rooms[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          if (!nav.roomSeen.has(i)) { nav.roomSeen.add(i); A.toured++; } break; } }   // ㉠ 실제로 든 방 수(투어) — 순회가 도는지 보이게
      const ri = nextRoom(p, now);
      if (ri !== nav.roomTarget) { nav.roomTarget = ri; nav.reachMin = Infinity; nav.reachT = now;
        nav.path = null; nav.goalTok = null; if (ri >= 0 && A.cf) A.cf.targets++; }
      let gx, gy, tok;
      if (ri >= 0) { const r = nav.rooms[ri]; gx = r.x + r.w / 2; gy = r.y + r.h / 2; tok = 'room' + ri; }
      else { gx = G.stairs.x; gy = G.stairs.y; tok = 'stairs'; }   // 다 밟았으면 계단으로
      // 방 포기(진척 기반) — «가까워지는 중»이면 안 버린다(긴 복도도 끝까지 간다). 목표 방 중심까지의 최소
      //   도달거리가 4s 동안 조금도 안 줄고 아직 멀면(진짜 막힘) 잠시 접고 다음 방. 시간 기반은 긴 복도를
      //   도착 전에 잘라 «많이 걷는데 방은 못 드는»(㉠ 재현) 병을 만들었다 — 그래서 진척으로 판정한다.
      if (ri >= 0) {
        const rc = Math.hypot(gx - p.x, gy - p.y);
        if (rc < nav.reachMin - 8) { nav.reachMin = rc; nav.reachT = now; }
        if (rc > 80 && now - nav.reachT > 4000) {
          nav.roomBlack.set(ri, now + 8000); nav.roomTarget = null; nav.path = null; nav.goalTok = null; A.reTarget++;
        }
      }
      if (nav.goalTok !== tok || !nav.path || now - nav.lastPlan > 1500) planTo(p, gx, gy, tok);
      let w;
      if (nav.path) {
        while (nav.wi < nav.path.length - 1 && Math.hypot(nav.path[nav.wi].x - p.x, nav.path[nav.wi].y - p.y) < 56) nav.wi++;
        w = nav.path[Math.min(nav.wi, nav.path.length - 1)];
      } else { A.navFail++; w = { x: gx, y: gy }; }
      // 가벼운 끼임 감지 — 조향(walkStep)이 대부분 처리하지만, 웨이포인트를 못 넘고 서 있으면 다음
      //   웨이포인트로 넘기고 재계획한다. 봇 몸은 적한테 안 막히니(지형만 walkable) 정지=벽끼임이다.
      nav.hist.push({ t: now, x: p.x, y: p.y });
      while (nav.hist.length && now - nav.hist[0].t > 1300) nav.hist.shift();
      const h0 = nav.hist[0];
      if (nav.hist.length > 4 && now - h0.t > 1100 && Math.hypot(p.x - h0.x, p.y - h0.y) < 24) {
        A.stuckSkips++;
        nav.stuckStreak = (now - nav.lastStuckT < 2500) ? nav.stuckStreak + 1 : 1;
        nav.lastStuckT = now;
        if (nav.stuckStreak >= 2) {   // 같은 자리에서 두 번 이상 끼면 «탈출»한다 — 웨이포인트만 넘기지 않는다.
          const e = bestEscape(p, w.x, w.y);
          if (e.d) { nav.escapeDx = e.ux; nav.escapeDy = e.uy; nav.escapeUntil = now + 550; }
          if (ri >= 0) nav.roomBlack.set(ri, now + 12000);   // 못 가는 방은 잠시 접고 다른 방으로
          nav.roomTarget = null; nav.path = null; nav.goalTok = null; A.reTarget++;
          nav.stuckStreak = 0;
        } else if (nav.path && nav.wi < nav.path.length - 1) nav.wi++;
        else { nav.path = null; nav.goalTok = null; }
        nav.hist.length = 0;
      }
      if (now < nav.escapeUntil) {   // 탈출 버스트 — 웨이포인트 무시, 트인 쪽으로만 민다(벽에서 떼어낸다)
        if (nav.escapeDx > 0.3) want.add('d'); else if (nav.escapeDx < -0.3) want.add('a');
        if (nav.escapeDy > 0.3) want.add('s'); else if (nav.escapeDy < -0.3) want.add('w');
      } else if (Math.hypot(w.x - p.x, w.y - p.y) < 90) {
        stepToward(want, w.x, w.y, p);   // 문 코앞 — 웨이포인트 중심(반드시 walkable)을 곧장 겨눠 통과. walkStep 은 off-axis 면 문을 지나쳐 미끄러진다.
      } else {
        walkStep(want, w.x, w.y, p);   // 멀리선 벽 인식 조향으로 웨이포인트를 향해 간다
      }
    }

    if (A.cf) { if (nav.dwellStart) A.cf.dwellMs += A.dt; else if (want.size) A.cf.moveMs += A.dt; else A.cf.idleMs += A.dt; }
    setKeys(want);
    // 계단 — NAV 는 «안 밟은 방이 없을 때»(순회 끝, nextRoom 이 -1) 밟는다. 옛 걷기는 팩을 다 처리했을 때.
    const anyLeft = NAV() ? (nav.roomTarget !== -1) : G.packs.some((q) => !q.done);
    if (!anyLeft && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 66) tap('f');
    if (ne) aim((ne.m.x - cam.x) * Z, (ne.m.y - cam.y) * Z);
    const now = performance.now();
    if (now - A.lastQ > 380) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 700) { A.lastE = now; tap('e'); }
    if (now - A.lastPt > 500) { A.lastPt = now; tap('z'); tap('x'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// ── 공간 계기 (프레임정확 · 층마다 누적) — __floorLog(처치) 와 층 번호로 맞춘다 ──────
const V222ACC = `(() => {
  const S = { log: [] };
  let cur = null, px = 0, py = 0;
  function totalCells(G) { const wc = new Set();
    const add = (rx, ry, rw, rh) => { for (let x = rx; x <= rx + rw; x += 120) for (let y = ry; y <= ry + rh; y += 120) wc.add(((x/120)|0) + ',' + ((y/120)|0)); };
    for (const r of G.rooms) add(r.x, r.y, r.w, r.h);
    for (const c of G.corridors) add(c.x, c.y, c.w, c.h);
    return wc.size; }
  function newFloor(G) { let etot = 0; for (const pk of G.packs) etot += pk.enemies.length;
    return { floor: G.floor, enemiesTotal: etot, packsTotal: G.packs.length, roomsTotal: G.rooms.length,
      t0: performance.now(), lastT: performance.now(), rooms: new Set(), cells: new Set(), dists: [],
      minEver: Infinity, awoke: new Set(), pathLen: 0, stairsAt: 0, totalCells: totalCells(G) }; }
  function finalize(c) { const ds = c.dists.slice().sort((a,b)=>a-b); const med = ds.length ? ds[ds.length>>1] : -1;
    return { floor: c.floor, enemiesTotal: c.enemiesTotal, packsTotal: c.packsTotal, roomsTotal: c.roomsTotal,
      roomsVisited: c.rooms.size, cellsVisited: c.cells.size, totalCells: c.totalCells,
      areaPct: c.totalCells ? Math.round(1000 * c.cells.size / c.totalCells)/10 : 0,
      roomsPct: c.roomsTotal ? Math.round(1000 * c.rooms.size / c.roomsTotal)/10 : 0,
      awokePacks: c.awoke.size, minDistEver: isFinite(c.minEver) ? Math.round(c.minEver) : -1,
      minDistMed: med < 0 ? -1 : Math.round(med), pathLen: Math.round(c.pathLen),
      secOnFloor: Math.round((c.lastT-c.t0)/10)/100,
      timeToStairs: c.stairsAt ? Math.round((c.stairsAt-c.t0)/10)/100 : -1,
      timeAfterStairs: c.stairsAt ? Math.round((c.lastT-c.stairsAt)/10)/100 : -1 }; }
  function tick() { const G = window.G;
    if (G && G.player && !G.dead) {
      if (!cur || cur.floor !== G.floor) { if (cur) S.log.push(finalize(cur)); cur = newFloor(G); px = G.player.x; py = G.player.y; }
      const p = G.player, now = performance.now();
      for (let i = 0; i < G.rooms.length; i++) { const r = G.rooms[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { cur.rooms.add(i); break; } }
      cur.cells.add(((p.x/120)|0) + ',' + ((p.y/120)|0));
      cur.pathLen += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y;
      let md = Infinity;
      for (let pi = 0; pi < G.packs.length; pi++) { const pk = G.packs[pi]; if (pk.awake) cur.awoke.add(pi);
        for (const m of pk.enemies) if (m.alive) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < md) md = d; } }
      if (md < Infinity) { cur.dists.push(md); if (md < cur.minEver) cur.minEver = md; }
      if (!cur.stairsAt && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 70) cur.stairsAt = now;
      cur.lastT = now;
    }
    requestAnimationFrame(tick); }
  window.__v222flush = () => { if (cur) { S.log.push(finalize(cur)); cur = null; } };
  window.__v222 = S;
  requestAnimationFrame(tick);
  return 1;
})()`;

const SAMPLE = `(() => {
  const G = window.G, p = G.player;
  let projOut = 0; for (const s of G.foeShots) if (window.__walkable && !window.__walkable(s.x, s.y, 6)) projOut++;
  return { floor: G.floor, projOut, pOut: window.__walkable ? (window.__walkable(p.x, p.y) ? 0 : 1) : 0 };
})()`;

const median = a => { if (!a.length) return null;   // ★ 빈 표본은 0 이 아니라 «없음» — 0 으로 내면 판정이 뒤집힌다(V-222)
 const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const show = v => (v === null || v === undefined) ? "—" : v;   // median 이 null(표본없음) 이면 «—» 로 — 0 으로 못 읽게
const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed, ifr, grow, v226b) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: injectSrc(seed, ifr, grow, v226b) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await ev(V222ACC);
  await sleep(700);
  await ev(`Object.assign(window.__hsMetric, { taken:0, deaths:0, kills:0, foeShot:0, foeHit:0, hitN:0 }); window.__floorLogReset(); window.__ft.length = 0; window.__v222.log.length = 0;`);

  let curFloor = 0, floorStart = Date.now();
  const startAll = Date.now();
  let projOutHits = 0, pOutHits = 0, samples = 0;
  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    samples++;
    if (s.projOut > 0) projOutHits++;
    if (s.pOut > 0) pOutHits++;
    if (s.floor !== curFloor) { curFloor = s.floor; floorStart = Date.now(); if (curFloor > MAXFLOOR) break; }
    if (Date.now() - floorStart > capFor(curFloor) * 1000) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (Date.now() - startAll > (totalCap + FLOORCAP) * 1000) break;
  }

  await ev(`window.__v222flush()`);
  const flog = JSON.parse(await ev(`JSON.stringify(window.__floorLog)`) || "[]");
  const spat = JSON.parse(await ev(`JSON.stringify(window.__v222.log)`) || "[]");
  const ft = JSON.parse(await ev(`JSON.stringify(window.__ft)`) || "[]").sort((a, b) => a - b);
  const fp95 = ft.length ? +ft[Math.floor(ft.length * 0.95)].toFixed(1) : 0;
  const nav = (await ev(`(window.__a222 ? { navFail: __a222.navFail, noPath: __a222.noPath, stuckSkips: __a222.stuckSkips, reTarget: __a222.reTarget, toured: __a222.toured } : {})`)) || {};
  await ev(`window.__a222flush && window.__a222flush()`);   // 마지막 층을 층별 타임라인에 밀어 넣는다.
  const navtl = JSON.parse(await ev(`JSON.stringify(window.__a222 ? window.__a222.tl : [])`) || "[]");
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  // 층 번호로 처치(floorLog) 와 공간(v222) 을 맞춘다.
  const cells = [];
  for (const f of flog) {
    if (f.floor < 1 || f.floor > MAXFLOOR) continue;
    const sp = spat.find((x) => x.floor === f.floor) || {};
    const nt = navtl.find((x) => x.floor === f.floor) || {};
    cells.push({ seed, floor: f.floor, kills: f.kills, hitN: f.hitN, died: f.died, hpMin: f.hpMin, maxhp: f.maxhp || 0, foeDmg: f.foeDmg || 0, sec: f.sec,
      dwellMs: nt.dwellMs || 0, moveMs: nt.moveMs || 0, idleMs: nt.idleMs || 0, targets: nt.targets || 0, ...sp });
  }
  const totSec = cells.reduce((a, c) => a + (c.sec || 0), 0);
  return { seed, cells, fp95, nav, projOutPct: samples ? r1(100 * projOutHits / samples) : 0,
    pOutPct: samples ? r1(100 * pOutHits / samples) : 0, totSec: r1(totSec) };
}

async function runArm(name, ifr, grow, v226b) {
  log(`\n════ ${name} (i-frame ${ifr}s · 곱 16 · RANGED 켬 · BFS 걷기 · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")}) ════`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const r = await runOne(SEEDS[i], ifr, grow, v226b);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    for (const c of r.cells) {
      const starv = c.kills === 0 ? " ◀굶음" : "";
      log(`  씨앗 ${r.seed} 층${c.floor}: ${c.sec}s · 처치 ${c.kills} · 맞음 ${c.hitN} · hp최저 ${c.hpMin}% · 사람maxhp ${c.maxhp} · 적dmg중앙 ${c.foeDmg} · ${c.died ? "죽음" : "삼"} · 방 ${c.roomsVisited}/${c.roomsTotal}(${c.roomsPct}%) · 면적 ${c.areaPct}%${starv}`);
    }
    const nv = r.nav || {};
    log(`    완주 ${r.totSec}s · frame p95 ${r.fp95}ms · 벽밖 ${r.pOutPct}% · 발사체벽밖 ${r.projOutPct}% · 오류 ${r.errs} · 길찾기[투어 ${nv.toured||0}·경로없음 ${nv.noPath||0}·직선폴백 ${nv.navFail||0}·끼임건너뜀 ${nv.stuckSkips||0}·팩재선택 ${nv.reTarget||0}]`);
  }
  if (!runs.length) return null;

  const cells = runs.flatMap((r) => r.cells);
  const engaged = cells.filter((c) => c.kills > 0);   // 굶은 층(처치 0)은 분모에서 뺀다.
  const nEng = engaged.length;
  const band = engaged.filter((c) => c.hpMin >= 10 && c.hpMin <= 60).length;
  const died = engaged.filter((c) => c.died).length;
  const hpMins = engaged.map((c) => c.hpMin);
  const starved = cells.length - nEng;
  const totErr = runs.reduce((a, r) => a + r.errs, 0);
  const secMed = median(runs.map((r) => r.totSec));
  const fp95Max = Math.max(...runs.map((r) => r.fp95));
  const pOutMax = Math.max(...runs.map((r) => r.pOutPct));
  const projOutMax = Math.max(...runs.map((r) => r.projOutPct));
  // 걷기가 옮겨졌는지 보이는 커버리지(전 층 중앙) — 스모크·회귀용.
  const areaMedAll = median(cells.map((c) => c.areaPct));
  const roomMedAll = median(cells.map((c) => c.roomsPct));
  const pathMedAll = median(cells.map((c) => c.pathLen));

  const bandPct = nEng ? r1(100 * band / nEng) : 0;
  const diedPct = nEng ? r1(100 * died / nEng) : 0;
  const secOk = secMed !== null && secMed >= 137 && secMed <= 319;
  const pass = bandPct >= 25 && diedPct >= 5 && diedPct <= 20 && secOk && totErr === 0 && pOutMax === 0 && projOutMax === 0;

  log(`\n  ▣ ${name} 합산 (교전층 ${nEng}/${cells.length} · 굶은층 ${starved} 제외):`);
  log(`    hp최저 10~60% 비율 : ${bandPct}%  (${band}/${nEng})   [끝 조건 ≥25%]`);
  log(`    죽은 층 비율       : ${diedPct}%  (${died}/${nEng})   [끝 조건 5~20%]`);
  log(`    hp최저 중앙        : ${nEng ? median(hpMins) : "—"}%  (min ${nEng ? Math.min(...hpMins) : "—"} · max ${nEng ? Math.max(...hpMins) : "—"})`);
  log(`    커버리지(전층 중앙): 면적 ${show(areaMedAll)}% · 방문 ${show(roomMedAll)}% · 걸은거리 ${show(pathMedAll)}   [걷기 옮겨졌으면 면적 ~10%]`);
  log(`    완주(씨앗 중앙)    : ${show(secMed)}s   [끝 조건 137~319s]`);
  log(`    회귀 — 벽밖 ${pOutMax}% · 발사체벽밖 ${projOutMax}% · frame p95 ${fp95Max}ms · 콘솔오류 ${totErr}`);
  log(`    판정: ${pass ? "통과" : "미달/초과"} (밴드 ${bandPct >= 25 ? "✓" : "✗"} · 죽음 ${diedPct >= 5 && diedPct <= 20 ? "✓" : diedPct < 5 ? "모자람" : "넘침"} · 완주 ${secOk ? "✓" : "✗"})`);

  return { name, ifr, nEng, starved, bandPct, diedPct, hpMinMed: nEng ? median(hpMins) : null,
    areaMedAll, roomMedAll, pathMedAll, secMed, fp95Max, pOutMax, projOutMax, errs: totErr, pass, runs };
}

log(`\n■ hs_v223_band — 가운데 띠를 «걷는 자»로 다시 잰다 (i-frame off vs ${IFR}s · BFS 걷기) · 창 ${VW}×${VH}`);
// ── 팔 고르기 ─────────────────────────────────────────────────────────
// 기본(V-223): i-frame 손잡이를 뒤집는다.  V226_ARMS=1: i-frame 을 고정하고
// «사람이 자라는가»(__V226_GROW) 를 뒤집는다 — V-226 의 곡선 기울기 측정용.
//   V226B_ARMS=1: 사람 성장·i-frame 을 «둘 다 켜 고정»하고 «적 dmg 곡선을 뗐는가»(__V226B) 만 뒤집는다
//   — V-226 의 고침을 재는 팔이다(BEFORE = 옛 한 곡선 = 오늘 18:57 측정과 같은 조건).
const V226 = process.env.V226_ARMS === "1";
const V226B = process.env.V226B_ARMS === "1";
//   V225_ARMS=1: 게임 손잡이를 전부 «현재 바이너리»로 고정하고 «자의 그래프 간선 규칙»만 뒤집는다
//   — BEFORE = 옛 규칙(두 축 다 >2px 겹침 · 방을 조각냈다) · AFTER = 닿음+폭 ≥NAV_MINPASS.
const V225 = process.env.V225_ARMS === "1";
const before = V225
  ? (NAV_LEGACY = true, await runArm(`BEFORE (NAV_LEGACY · 옛 간선 «두 축 다 >2px» · i-frame ${IFR}s)`, IFR, true, true))
  : V226B
  ? await runArm(`BEFORE (__V226B=false · 옛 «한 곡선» dmg=hp=1+층×0.35 · i-frame ${IFR}s)`, IFR, true, false)
  : V226
  ? await runArm(`BEFORE (__V226_GROW=false · 옛 «박은 빌드» · i-frame ${IFR}s)`, IFR, false, false)
  : await runArm("BEFORE (__V221=false · i-frame 끔)", 0, true, false);
const after = V225
  ? (NAV_LEGACY = false, await runArm(`AFTER (간선 «닿음 + 폭 ≥${NAV_MINPASS}» · i-frame ${IFR}s)`, IFR, true, true))
  : V226B
  ? await runArm(`AFTER (__V226B=true · dmg 곡선 1+층×0.14 · hp 곡선 그대로 · i-frame ${IFR}s)`, IFR, true, true)
  : V226
  ? await runArm(`AFTER (__V226_GROW=true · 사람이 번 점수를 쓴다 · i-frame ${IFR}s)`, IFR, true, false)
  : await runArm(`AFTER (i-frame ${IFR}s · 현재 바이너리)`, IFR, true, false);

if (before && after) {
  log(`\n╔═══ 두 팔 (곱 16 고정 · BFS 걷기 · i-frame 손잡이만 뒤집음) ═══╗`);
  log(V225 ? `  ★ V-225 팔: 게임 손잡이 전부 고정 · «자의 그래프 간선 규칙»만 뒤집었다(BEFORE=옛 >2px).`
    : V226B ? `  ★ V-226B 팔: 사람 성장·i-frame ${IFR}s 고정 · «적 dmg 곡선을 뗐는가»만 뒤집었다.`
    : V226 ? `  ★ V-226 팔: i-frame ${IFR}s 고정 · «사람이 자라는가»만 뒤집었다.` : `  ★ 헤드라인은 AFTER(i-frame 0.4s = 현재 바이너리) 한 값이다. BEFORE 는 참고.`);
  log(`  hp최저 10~60% 비율 : BEFORE ${before.bandPct}%  |  AFTER ${after.bandPct}%   [≥25%]`);
  log(`  죽은 층 비율       : BEFORE ${before.diedPct}%  |  AFTER ${after.diedPct}%   [5~20%]`);
  log(`  hp최저 중앙        : BEFORE ${show(before.hpMinMed)}%  |  AFTER ${show(after.hpMinMed)}%`);
  log(`  커버리지 면적/방문 : BEFORE ${show(before.areaMedAll)}%/${show(before.roomMedAll)}%  |  AFTER ${show(after.areaMedAll)}%/${show(after.roomMedAll)}%   [걷기 옮겨졌으면 면적 ~10%]`);
  log(`  완주(중앙)         : BEFORE ${show(before.secMed)}s  |  AFTER ${show(after.secMed)}s   [137~319s]`);
  log(`  교전층/굶은층      : BEFORE ${before.nEng}/${before.starved}  |  AFTER ${after.nEng}/${after.starved}`);
  log(`  판정(각 팔)        : BEFORE ${before.pass ? "★통과" : "미달/초과"} · AFTER ${after.pass ? "★통과" : "미달/초과"}`);
}

fs.writeFileSync(OUT, JSON.stringify({ axis: V226B ? "V-226B" : V226 ? "V-226" : "V-223", ifr: IFR, seeds: SEEDS, maxfloor: MAXFLOOR, before, after }, null, 2));
log(`\n  ▸ ${OUT}`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
