/* hs/ V-221 자 ②「가운데 띠가 생겼는가」를 앞뒤로 잰다 (i-frame 전/후 · 같은 바이너리).
 *
 *   node tools/hs_v221_danger.mjs [ifr] [최대층] [씨앗들]
 *   node tools/hs_v221_danger.mjs 0.4              (기본 — i-frame 0.4s · 층 5 · 씨앗 1~5)
 *   node tools/hs_v221_danger.mjs 0.3 5 1,2,3,4,5
 *
 * 왜 (NOW/ROADMAP V-221): V-220 은 교전층 hp최저가 «멀쩡(≥66) 아니면 죽음(≤3)» 둘뿐이라 가운데가 없다고
 *   봤다. hs_v221_forensic 이 까닭을 갈랐다 — 단발도 한프레임 몰림도 아닌 ~7 대 × ~7%maxhp 가 ~0.42s 간격으로
 *   쌓여 하강이 안 멎는다(≤0.4s 안에 온 타격이 49%). 고침은 맞은 뒤 짧은 무적(main.js __V221, 기본 0.4s).
 *   이 자가 __V221=false(앞) 대 __V221_IFR=ifr(뒤)를 한 프로세스에서 재 가운데 띠가 열리는지 본다.
 *
 * 끝 조건(교전층 = 처치>0 인 층만 분모 · 굶은 층 제외):
 *   교전층 hp최저 10~60% 비율 ≥ 25% · 죽은 층 5~20% · 완주(씨앗 중앙) 228s ±40%(137~319s).
 * 회귀: 벽밖 0% · 발사체 벽밖 0% · 콘솔오류 0 · frame p95 규격 안.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const IFR = process.argv[2] !== undefined ? +process.argv[2] : 0.4;
const MAXFLOOR = +(process.argv[3] || 5);
const SEEDS = (process.argv[4] || "1,2,3,4,5").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (FLOORCAP * MAXFLOOR * SEEDS.length * 2 + 1800) * 1000);

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

const injectSrc = (seed, ifr) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__FOE_DMG = 16;
globalThis.__RANGED_MOB = true;
globalThis.__MEASURE_REVIVE = true;
globalThis.__V221 = ${ifr > 0 ? "true" : "false"};
globalThis.__V221_IFR = ${ifr};
window.__ft = []; window.__lt = 0;
(function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
  if(window.__ft.length>6000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());`;

const MINION = { attr: { int: 20, vit: 10, str: 10 }, skill: { slot: 8, grade: 2, mdmg: 10, mhp: 8, spear: 5 }, grade: 2 };

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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a221 = A;
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

const SAMPLE = `(() => {
  const G = window.G, p = G.player;
  let projOut = 0; for (const s of G.foeShots) if (window.__walkable && !window.__walkable(s.x, s.y, 6)) projOut++;
  return { floor: G.floor, hpPct: Math.round(100 * p.hp / p.maxhp),
    projOut, pOut: window.__walkable ? (window.__walkable(p.x, p.y) ? 0 : 1) : 0 };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed, ifr) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: injectSrc(seed, ifr) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await sleep(700);
  await ev(`Object.assign(window.__hsMetric, { taken:0, deaths:0, kills:0, foeShot:0, foeHit:0, hitN:0 }); window.__floorLogReset(); window.__ft.length = 0;`);

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

  const flog = await ev(`JSON.stringify(window.__floorLog)`);
  const foe = await ev(`({ foeHit: window.__hsMetric.foeHit||0, foeShot: window.__hsMetric.foeShot||0 })`);
  const ft = JSON.parse(await ev(`JSON.stringify(window.__ft)`) || "[]").sort((a, b) => a - b);
  const fp95 = ft.length ? +ft[Math.floor(ft.length * 0.95)].toFixed(1) : 0;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const floors = JSON.parse(flog || "[]").filter((f) => f.floor >= 1 && f.floor <= MAXFLOOR);
  const totSec = floors.reduce((a, f) => a + f.sec, 0);
  return { seed, floors, foeHit: foe.foeHit, foeShot: foe.foeShot, fp95,
    projOutPct: samples ? r1(100 * projOutHits / samples) : 0,
    pOutPct: samples ? r1(100 * pOutHits / samples) : 0, totSec: r1(totSec) };
}

async function runArm(name, ifr) {
  log(`\n════ ${name} (i-frame ${ifr}s · 곱 16 · RANGED 켬 · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")}) ════`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const r = await runOne(SEEDS[i], ifr);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    for (const f of r.floors)
      log(`  씨앗 ${r.seed} 층${f.floor}: ${f.sec}s · 처치 ${f.kills} · 맞음 ${f.hitN} · hp최저 ${f.hpMin}% · ${f.died ? "죽음" : "삼"}`);
    log(`    완주 ${r.totSec}s · 맞은수/초 ${r.totSec ? r1(r.foeHit / r.totSec) : 0} · frame p95 ${r.fp95}ms · 벽밖 ${r.pOutPct}% · 발사체벽밖 ${r.projOutPct}% · 오류 ${r.errs}`);
  }
  if (!runs.length) return null;

  const cells = runs.flatMap((r) => r.floors);
  const engaged = cells.filter((f) => f.kills > 0);   // 굶은 층(처치 0)은 분모에서 뺀다.
  const nEng = engaged.length;
  const band = engaged.filter((f) => f.hpMin >= 10 && f.hpMin <= 60).length;
  const died = engaged.filter((f) => f.died).length;
  const hpMins = engaged.map((f) => f.hpMin);
  const totErr = runs.reduce((a, r) => a + r.errs, 0);
  const secMed = median(runs.map((r) => r.totSec));
  const fp95Max = Math.max(...runs.map((r) => r.fp95));
  const pOutMax = Math.max(...runs.map((r) => r.pOutPct));
  const projOutMax = Math.max(...runs.map((r) => r.projOutPct));
  const starved = cells.length - nEng;

  const bandPct = nEng ? r1(100 * band / nEng) : 0;
  const diedPct = nEng ? r1(100 * died / nEng) : 0;
  const secOk = secMed >= 137 && secMed <= 319;
  const pass = bandPct >= 25 && diedPct >= 5 && diedPct <= 20 && secOk && totErr === 0 && pOutMax === 0 && projOutMax === 0;

  log(`\n  ▣ ${name} 합산 (교전층 ${nEng}/${cells.length} · 굶은층 ${starved} 제외):`);
  log(`    hp최저 10~60% 비율 : ${bandPct}%  (${band}/${nEng})   [끝 조건 ≥25%]`);
  log(`    죽은 층 비율       : ${diedPct}%  (${died}/${nEng})   [끝 조건 5~20%]`);
  log(`    hp최저 중앙        : ${median(hpMins)}%  (min ${Math.min(...hpMins)} · max ${Math.max(...hpMins)})`);
  log(`    완주(씨앗 중앙)    : ${secMed}s   [끝 조건 137~319s]`);
  log(`    회귀 — 벽밖 ${pOutMax}% · 발사체벽밖 ${projOutMax}% · frame p95 ${fp95Max}ms · 콘솔오류 ${totErr}`);
  log(`    판정: ${pass ? "통과" : "미달/초과"} (밴드 ${bandPct >= 25 ? "✓" : "✗"} · 죽음 ${diedPct >= 5 && diedPct <= 20 ? "✓" : diedPct < 5 ? "모자람" : "넘침"} · 완주 ${secOk ? "✓" : "✗"})`);

  return { name, ifr, nEng, starved, bandPct, diedPct, hpMinMed: median(hpMins), secMed,
    fp95Max, pOutMax, projOutMax, errs: totErr, pass, runs };
}

log(`\n■ hs_v221_danger — 가운데 띠 앞뒤 (i-frame off vs ${IFR}s) · 창 ${VW}×${VH}`);
const before = await runArm("BEFORE (__V221=false)", 0);
const after = await runArm(`AFTER (i-frame ${IFR}s)`, IFR);

if (before && after) {
  log(`\n╔═══ 앞뒤 비교 (곱 16 고정 · 손잡이만 뒤집음) ═══╗`);
  log(`  hp최저 10~60% 비율 : ${before.bandPct}%  →  ${after.bandPct}%   [≥25%]`);
  log(`  죽은 층 비율       : ${before.diedPct}%  →  ${after.diedPct}%   [5~20%]`);
  log(`  hp최저 중앙        : ${before.hpMinMed}%  →  ${after.hpMinMed}%`);
  log(`  완주(중앙)         : ${before.secMed}s  →  ${after.secMed}s   [137~319s]`);
  log(`  교전층/굶은층      : ${before.nEng}/${before.starved}  →  ${after.nEng}/${after.starved}`);
  log(`  AFTER 판정: ${after.pass ? "★ 통과" : "미달/초과"}`);
}

fs.writeFileSync(`tmp/hs_v221_danger.json`, JSON.stringify({ ifr: IFR, seeds: SEEDS, before, after }, null, 2));
log(`\n  ▸ tmp/hs_v221_danger.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
