/* hs/ V-220 자 — 「긴장이 실제로 생겼는가」를 걸어서 잰다 (밸런스).
 *
 *   node tools/hs_v220_danger.mjs [foeDmg] [최대층] [씨앗들]
 *   node tools/hs_v220_danger.mjs 16              (기본 — 곱 16 · 층 5 · 씨앗 1~5)
 *   node tools/hs_v220_danger.mjs 12 5 1,2,3,4,5
 *
 * 왜 (ROADMAP V-220): V-203b 가 남긴 두 사실 위에 선다 — ㉠ FOE_DMG=16 은 「모자란」 게 아니라
 *   자 위에서 이미 죽은 층 ~30%(상한 20 근처/초과)·hp<50% 60% 다. ㉡ 그런데 자가 실플레이보다
 *   4~5배 거칠고 hp최저가 쌍봉이라 곱 하나로 5~20% «가운데»를 못 짚는다. 그래서 V-220 은 값을 더
 *   밀지 않는다 — 지금 기본값을 다시 걸어서 재고, 넘치면 되돌리고, «위험하다»가 그림으로 읽히는지 본다.
 *
 * ★ 지름길 금지(probe-must-walk-the-real-path) — v202b 봇을 그대로 쓴다(rAF 실키/실마우스로 싸우고
 *   시체로 해골을 세우고 예산이 차면 계단으로 내려간다). 다른 점 셋:
 *   ㉠ __MEASURE_REVIVE 로 죽어도 제자리서 살아 이어 걷는다 — 층 1→5 가 죽음-리셋에 끊기지 않아
 *      높은 층(더 센 층)의 위험이 저층으로 안 쏠린다. 죽음은 __floorLog.died 로 층별 0/1 로 센다.
 *   ㉡ 곱을 손잡이(__FOE_DMG)로 주입해 소스 수정 없이 후보를 잰다.
 *   ㉢ hp 가 50% 밑으로 «처음» 내려가는 순간 + 화살이 날아오는 프레임을 한 장 잡는다(tmp/hs_v220_danger.png).
 *
 * 끝 조건(자로 판정 · ROADMAP V-220 B):
 *   hp<50% 층 비율 ≥ 30% · 죽은 층 비율 5~20% · 완주 시간 지금의 ±40% 안.
 * 회귀: 벽밖 0% · 발사체 벽밖 0% · 콘솔오류 0 · frame p95 규격 안.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const FOE_DMG = +(process.argv[2] || 16);
const MAXFLOOR = +(process.argv[3] || 5);
const SEEDS = (process.argv[4] || "1,2,3,4,5").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;   // 층마다 이만큼 싸우고 계단으로 내려간다(v202b 와 같은 예산 — 봇 실력에 안 흔들리게).
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (FLOORCAP * MAXFLOOR * SEEDS.length + 1200) * 1000);

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

// 씨앗 + 손잡이 + 프레임 표본기를 첫 문서에 심는다. __FOE_DMG·__MEASURE_REVIVE 를 여기서 켜, 소스는 안 건드린다.
const injectSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__FOE_DMG = ${FOE_DMG};
globalThis.__RANGED_MOB = true;
globalThis.__MEASURE_REVIVE = true;
window.__ft = []; window.__lt = 0;
(function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
  if(window.__ft.length>6000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());`;

// 소환형 빌드 — v202b 와 같은 시작점(자리·등급·소환수 피해). 바닥의 빌드 방울로 판 중에 커진다.
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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a220 = A;
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

// 한 표본 — 위험을 재는 데 필요한 값만(hp% · 화살 수 · 벽밖 여부 · 층). __floorLog 가 층별 프레임정확 요약을 따로 든다.
const SAMPLE = `(() => {
  const G = window.G, p = G.player;
  let projOut = 0; for (const s of G.foeShots) if (window.__walkable && !window.__walkable(s.x, s.y, 6)) projOut++;
  let nearE = 1e9; for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) {
    const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < nearE) nearE = d; }
  let nearShot = 1e9; for (const s of G.foeShots) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < nearShot) nearShot = d; }
  return { floor: G.floor, hpPct: Math.round(100 * p.hp / p.maxhp), maxhp: p.maxhp,
    shots: G.foeShots.length, projOut, nearE: Math.round(nearE), nearShot: Math.round(nearShot),
    pOut: window.__walkable ? (window.__walkable(p.x, p.y) ? 0 : 1) : 0,
    deaths: (window.__hsMetric.deaths || 0), foeHit: (window.__hsMetric.foeHit || 0), foeShot: (window.__hsMetric.foeShot || 0) };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = n => Math.round(n * 10) / 10;

let dangerShot = false;   // 위험 컷은 온 씨앗 통틀어 한 장만.

async function runOne(seed, takeCut) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: injectSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await sleep(700);
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0, grains:0, foeShot:0, foeHit:0, hitN:0 }); window.__floorLogReset();`);
  await ev(`window.__ft.length = 0;`);

  let curFloor = 0, floorStart = Date.now(), prevHp = 100;
  const startAll = Date.now();
  let projOutHits = 0, pOutHits = 0, samples = 0;

  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    samples++;
    if (s.projOut > 0) projOutHits++;
    if (s.pOut > 0) pOutHits++;
    if (s.floor !== curFloor) {
      curFloor = s.floor; floorStart = Date.now(); prevHp = s.hpPct;
      if (curFloor > MAXFLOOR) break;
    }
    // 위험 컷 — hp 50% 밑 + 화살이 사람 곁으로 날아오고(nearShot) 적이 붙어 있는(nearE) 프레임.
    //   사람이 «무리 안에서 화살을 맞는» 순간이라야 그림으로도 위험이 읽힌다(한가한 컷을 안 잡게).
    if (takeCut && !dangerShot && prevHp >= 50 && s.hpPct < 50 && s.hpPct > 12
        && s.shots >= 2 && s.nearShot < 360 && s.nearE < 460) {
      dangerShot = true;
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync("tmp/hs_v220_danger.png", Buffer.from(r.data, "base64"));
      log(`  컷 tmp/hs_v220_danger.png  (층 ${s.floor} · hp ${s.hpPct}% · 화살 ${s.shots}발 · 최근적 ${s.nearE} · 최근화살 ${s.nearShot})`);
    }
    prevHp = s.hpPct;
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

log(`\n■ hs_v220_danger — 곱 ${FOE_DMG} · RANGED 켬 · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")} · 창 ${VW}×${VH}`);
log(`  재는 것: 층별 hp최저·죽음(0/1)·처치·초 → hp<50% 층 비율 · 죽은 층 비율 · 완주 · 맞은수/초 · 회귀\n`);

const runs = [];
for (let i = 0; i < SEEDS.length; i++) {
  errs = [];
  const r = await runOne(SEEDS[i], i === 0);
  if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
  r.errs = errs.length; runs.push(r);
  for (const f of r.floors)
    log(`  씨앗 ${r.seed} 층${f.floor}: ${f.sec}s · 처치 ${f.kills} · 맞음 ${f.hitN} · hp최저 ${f.hpMin}% · ${f.died ? "죽음" : "삼"}`);
  log(`    완주 ${r.totSec}s · 맞은수/초 ${r.totSec ? r1(r.foeHit / r.totSec) : 0}(쏨 ${r.foeShot}·명중 ${r.foeHit}) · frame p95 ${r.fp95}ms · 벽밖 ${r.pOutPct}% · 발사체벽밖 ${r.projOutPct}% · 오류 ${r.errs}`);
}
if (!runs.length) { log("판 없음"); bws.close(); process.exit(3); }

// 온 씨앗의 층-셀을 모아 비율을 낸다(끝 조건의 분모 = 걸어 밟은 층 셀 전부).
const cells = runs.flatMap((r) => r.floors);
const nCells = cells.length;
const dip50 = cells.filter((f) => f.hpMin < 50).length;
const died = cells.filter((f) => f.died).length;
const hpMins = cells.map((f) => f.hpMin);
const totErr = runs.reduce((a, r) => a + r.errs, 0);
const totSec = runs.reduce((a, r) => a + r.totSec, 0);
const totHit = runs.reduce((a, r) => a + r.foeHit, 0);
const secMed = median(runs.map((r) => r.totSec));
const fp95Max = Math.max(...runs.map((r) => r.fp95));
const pOutMax = Math.max(...runs.map((r) => r.pOutPct));
const projOutMax = Math.max(...runs.map((r) => r.projOutPct));

const dip50Pct = r1(100 * dip50 / nCells);
const diedPct = r1(100 * died / nCells);

log(`\n▣ 곱 ${FOE_DMG} 합산 (씨앗 ${runs.length} · 층 셀 ${nCells}):`);
log(`  hp<50% 층 비율 : ${dip50Pct}%  (${dip50}/${nCells})   [끝 조건 ≥30%]`);
log(`  죽은 층 비율   : ${diedPct}%  (${died}/${nCells})   [끝 조건 5~20%]`);
log(`  hp최저 중앙    : ${median(hpMins)}%  (min ${Math.min(...hpMins)} · max ${Math.max(...hpMins)})`);
log(`  완주(씨앗 중앙): ${secMed}s`);
log(`  맞은수/초      : ${totSec ? r1(totHit / totSec) : 0}`);
log(`  회귀 — 벽밖 ${pOutMax}% · 발사체벽밖 ${projOutMax}% · frame p95 ${fp95Max}ms · 콘솔오류 ${totErr}`);

const pass = dip50Pct >= 30 && diedPct >= 5 && diedPct <= 20;
log(`\n  판정: ${pass ? "통과" : "미달/초과"} (hp<50% ${dip50Pct >= 30 ? "✓" : "✗"} · 죽은층 ${diedPct >= 5 && diedPct <= 20 ? "✓" : diedPct < 5 ? "모자람" : "넘침"})`);

fs.writeFileSync(`tmp/hs_v220_m${FOE_DMG}.json`, JSON.stringify({
  foeDmg: FOE_DMG, maxfloor: MAXFLOOR, seeds: SEEDS, nCells, dip50Pct, diedPct,
  hpMinMed: median(hpMins), secMed, hitPerSec: totSec ? r1(totHit / totSec) : 0,
  pOutMax, projOutMax, fp95Max, errs: totErr, pass, runs }, null, 2));
log(`  ▸ tmp/hs_v220_m${FOE_DMG}.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
