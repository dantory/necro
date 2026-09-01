/* hs/ V-222 자 — 「굶는 층(처치 0)」의 원인을 수로 가른다 (값 밀기 «전에»).
 *
 *   node tools/hs_v222_starve.mjs [최대층] [씨앗들]
 *   node tools/hs_v222_starve.mjs 5 1,2,3,4,5     (기본)
 *
 * 왜 (ROADMAP V-222): 씨앗5×층5=25 셀 중 처치 0 인 층이 절반(56%). 밴드(긴장) 분모가 11 뿐이라
 *   한 층이 9%p 를 흔든다. 분모를 키우려면 먼저 왜 굶는지 갈라야 한다 — 세 가설:
 *     ㉠ 적이 안 나온다(스폰 0/희박)      → enemiesTotal
 *     ㉡ 봇이 방을 안 들르고 계단만/막힘   → roomsVisited·areaPct·pathLen·awokePacks
 *     ㉢ 적이 있는데 시야 밖이라 안 붙는다  → minDistEver(가장 가까이 간 거리) vs WAKE 500
 *
 * 걷기·CDP 골격은 hs_v221_danger.mjs 를 그대로 재사용(순간이동 말고 걸어서). 기본 바이너리(손잡이 무변경)를
 * 잰다 — __FOE_DMG=16·__RANGED_MOB·__MEASURE_REVIVE 는 V-220/221 기준선과 같게 두되 i-frame 은 끈다.
 *
 * 앞뒤(A/B): 인자 mode="ab" 면 __V222=false(앞) 대 __V222=true(뒤)를 한 프로세스에서 잰다(고칠 손잡이).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const MODE = process.argv[2] === "ab" ? "ab" : "diag";
const ARGOFF = MODE === "ab" ? 3 : 2;
const MAXFLOOR = +(process.argv[ARGOFF] || 5);
const SEEDS = (process.argv[ARGOFF + 1] || "1,2,3,4,5").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (FLOORCAP * MAXFLOOR * SEEDS.length * (MODE === "ab" ? 2 : 1) + 1800) * 1000);

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

const injectSrc = (seed, v222) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__FOE_DMG = 16;
globalThis.__RANGED_MOB = true;
globalThis.__MEASURE_REVIVE = true;
globalThis.__V222 = ${v222 ? "true" : "false"};
window.__ft = []; window.__lt = 0;
(function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
  if(window.__ft.length>6000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());`;

const MINION = { attr: { int: 20, vit: 10, str: 10 }, skill: { slot: 8, grade: 2, mdmg: 10, mhp: 8, spear: 5 }, grade: 2 };

// ── 걷기 (v221 과 동일 — 순간이동 없이 nearestPack→계단) ──────────────────────
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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a222 = A;
  const Z = window.HSZ;
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
  function nearestEnemy(p) { let b = null, bd = 1e18;
    for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) {
      const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2; if (d < bd) { bd = d; b = m; } }
    return b ? { m: b, d: Math.sqrt(bd) } : null; }
  function nearestPack(p) { let b = null, bd = 1e18;
    for (const q of G.packs) { if (q.done) continue; const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; b = q; } }
    return b ? { q: b, d: Math.sqrt(bd) } : null; }
  function tick() {
    const G = window.G, cam = window.cam;
    if (!G || !G.player) { requestAnimationFrame(tick); return; }
    if (G.dead) { tap('r'); requestAnimationFrame(tick); return; }
    ensureBuild();
    const p = G.player;
    const np = nearestPack(p);
    let tx, ty;
    if (np) { tx = np.q.x; ty = np.q.y; } else { tx = G.stairs.x; ty = G.stairs.y; }
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    const want = new Set();
    if (np && dist <= 240) {
      const ne0 = nearestEnemy(p);
      if (ne0 && ne0.d < 70) { if (Math.abs(dx) > 30) want.add(dx > 0 ? 'a' : 'd'); if (Math.abs(dy) > 30) want.add(dy > 0 ? 'w' : 's'); }
    } else {
      if (dx > 40) want.add('d'); else if (dx < -40) want.add('a');
      if (dy > 40) want.add('s'); else if (dy < -40) want.add('w');
    }
    setKeys(want);
    if (!np && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 66) tap('f');
    const ne = nearestEnemy(p);
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

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed, v222) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: injectSrc(seed, v222) });
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
    if (Date.now() - floorStart > FLOORCAP * 1000) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (Date.now() - startAll > FLOORCAP * (MAXFLOOR + 1) * 1000) break;
  }

  await ev(`window.__v222flush()`);
  const flog = JSON.parse(await ev(`JSON.stringify(window.__floorLog)`) || "[]");
  const spat = JSON.parse(await ev(`JSON.stringify(window.__v222.log)`) || "[]");
  const ft = JSON.parse(await ev(`JSON.stringify(window.__ft)`) || "[]").sort((a, b) => a - b);
  const fp95 = ft.length ? +ft[Math.floor(ft.length * 0.95)].toFixed(1) : 0;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  // 층 번호로 처치(floorLog) 와 공간(v222) 을 맞춘다.
  const cells = [];
  for (const f of flog) {
    if (f.floor < 1 || f.floor > MAXFLOOR) continue;
    const sp = spat.find((x) => x.floor === f.floor) || {};
    cells.push({ seed, floor: f.floor, kills: f.kills, hitN: f.hitN, died: f.died, hpMin: f.hpMin, sec: f.sec, ...sp });
  }
  const totSec = cells.reduce((a, c) => a + (c.sec || 0), 0);
  return { seed, cells, fp95, projOutPct: samples ? r1(100 * projOutHits / samples) : 0,
    pOutPct: samples ? r1(100 * pOutHits / samples) : 0, totSec: r1(totSec) };
}

async function runArm(name, v222) {
  log(`\n════ ${name} (곱 16 · RANGED 켬 · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")}) ════`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const r = await runOne(SEEDS[i], v222);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    for (const c of r.cells) {
      const starv = c.kills === 0 ? " ◀굶음" : "";
      log(`  씨앗 ${r.seed} 층${c.floor}: 처치 ${c.kills} · 적수 ${c.enemiesTotal} · 방 ${c.roomsVisited}/${c.roomsTotal}(${c.roomsPct}%) · 면적 ${c.areaPct}% · 깬팩 ${c.awokePacks}/${c.packsTotal} · 최근접 ${c.minDistEver}(중앙 ${c.minDistMed}) · 걸은거리 ${c.pathLen} · ${c.sec}s(계단 ${c.timeToStairs}s·잔여 ${c.timeAfterStairs}s)${starv}`);
    }
    log(`    완주 ${r.totSec}s · frame p95 ${r.fp95}ms · 벽밖 ${r.pOutPct}% · 발사체벽밖 ${r.projOutPct}% · 오류 ${r.errs}`);
  }
  if (!runs.length) return null;

  const cells = runs.flatMap((r) => r.cells);
  const starved = cells.filter((c) => c.kills === 0);
  const nStarv = starved.length;
  const starvPct = r1(100 * nStarv / cells.length);
  const totErr = runs.reduce((a, r) => a + r.errs, 0);
  const secMed = median(runs.map((r) => r.totSec));
  const fp95Max = Math.max(...runs.map((r) => r.fp95));
  const pOutMax = Math.max(...runs.map((r) => r.pOutPct));
  const projOutMax = Math.max(...runs.map((r) => r.projOutPct));

  // 굶은 층만 놓고 세 가설을 가른다.
  const spawn0 = starved.filter((c) => (c.enemiesTotal || 0) === 0).length;          // ㉠
  const nearMed = median(starved.map((c) => c.minDistEver).filter((d) => d >= 0));    // ㉢ 지표
  const gotClose = starved.filter((c) => c.minDistEver >= 0 && c.minDistEver < 500).length;  // WAKE 안까지 감
  const woke = starved.filter((c) => (c.awokePacks || 0) > 0).length;                 // 팩을 깨움
  const roomMed = median(starved.map((c) => c.roomsPct));
  const areaMed = median(starved.map((c) => c.areaPct));
  const pathMed = median(starved.map((c) => c.pathLen));

  const engaged = cells.filter((c) => c.kills > 0);
  const band = engaged.filter((c) => c.hpMin >= 10 && c.hpMin <= 60).length;
  const bandPct = engaged.length ? r1(100 * band / engaged.length) : 0;

  log(`\n  ▣ ${name} 합산 (셀 ${cells.length} · 굶은층 ${nStarv}):`);
  log(`    굶은 층 비율        : ${starvPct}%  (${nStarv}/${cells.length})   [끝 조건 ≤20%]`);
  log(`    교전층 밴드(참고)   : ${bandPct}%  (${band}/${engaged.length})   [이번 판 안 건드림]`);
  log(`    ─ 굶은 층 원인 가르기 ─`);
  log(`    ㉠ 적수 0 인 층      : ${spawn0}/${nStarv}`);
  log(`    ㉡ 방 방문 중앙      : ${roomMed}%  · 면적 중앙 ${areaMed}%  · 걸은거리 중앙 ${pathMed}`);
  log(`    ㉡ 팩 깨운 층        : ${woke}/${nStarv}`);
  log(`    ㉢ 최근접 중앙       : ${nearMed}px  (WAKE 500 안까지 간 층 ${gotClose}/${nStarv})`);
  log(`    회귀 — 완주 ${secMed}s · 벽밖 ${pOutMax}% · 발사체벽밖 ${projOutMax}% · frame p95 ${fp95Max}ms · 오류 ${totErr}`);

  return { name, v222, cells, nStarv, starvPct, bandPct, secMed, fp95Max, pOutMax, projOutMax, errs: totErr,
    diag: { spawn0, nearMed, gotClose, woke, roomMed, areaMed, pathMed }, runs };
}

log(`\n■ hs_v222_starve [${MODE}] — 굶는 층의 원인 가르기 · 창 ${VW}×${VH}`);
const out = { mode: MODE, seeds: SEEDS, maxfloor: MAXFLOOR };
if (MODE === "ab") {
  out.before = await runArm("BEFORE (__V222=false)", false);
  out.after = await runArm("AFTER (__V222=true)", true);
  if (out.before && out.after) {
    log(`\n╔═══ 앞뒤 비교 (손잡이만 뒤집음) ═══╗`);
    log(`  굶은 층 비율 : ${out.before.starvPct}%  →  ${out.after.starvPct}%   [≤20%]`);
    log(`  교전층 밴드  : ${out.before.bandPct}%  →  ${out.after.bandPct}%   (참고 · 안 건드림)`);
    log(`  완주(중앙)   : ${out.before.secMed}s  →  ${out.after.secMed}s   [137~319s]`);
    log(`  AFTER 판정: ${out.after.starvPct <= 20 && out.after.secMed >= 137 && out.after.secMed <= 319 && out.after.errs === 0 && out.after.pOutMax === 0 && out.after.projOutMax === 0 ? "★ 통과" : "미달"}`);
  }
} else {
  out.before = await runArm("DIAG (현재 바이너리)", false);
}
fs.writeFileSync(`tmp/hs_v222_starve.json`, JSON.stringify(out, null, 2));
log(`\n  ▸ tmp/hs_v222_starve.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
