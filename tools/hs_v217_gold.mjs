/* V-217 「금 알갱이가 화면을 노란 점으로 덮는다」의 자. hs_v199_read.mjs 를 본으로.
 *
 *   node tools/hs_v217_gold.mjs [초] [씨앗들]
 *   node tools/hs_v217_gold.mjs 60 1,2     (기본 — 60초×씨앗 둘)
 *
 * ★ main.js 가 관찰 계기 셋을 남긴다(로직/연출 불변):
 *   window.__goldRects   매 프레임 그린 금 화면사각(넓이 계산용)
 *   window.__goldDwell    회수된 금 한 톨의 바닥 체류시간 g.t 로그(생성→회수)
 *   METRIC.goldGen/goldGot 뿌린 금 총액 · 회수한 금 총액(회귀: goldGen 전후 동일)
 * 눈금:
 *   ㉠ 화면 동시 금 개체 수 — 중앙값·p95. 통과선 p95 ≤ 12.
 *   ㉡ 금 한 톨 바닥 체류시간 중앙값. 통과선 ≤ 1.2초.
 *   ㉢ 금이 덮은 화면 넓이 비율(그린 사각 합/판 넓이). 전/후 비교.
 * ★ 관측 0 을 통과로 읽지 않는다 — 분모(golds 관측·dwell 표본)를 함께 찍는다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 60);
const SEEDS = (process.argv[3] || "1,2").split(",").map((s) => +s);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC * SEEDS.length + 900) * 1000);

await ensureChrome({ log, force: false });
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

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const DEATH = { attr: { str: 20 }, skill: { spear: 10, nova: 8, curse: 2 }, grade: 0 };

// 자동조종 — 뼈창(q)으로 잡아 금을 끊임없이 뿌리게 한다(hs_v199_read 의 AUTO 를 그대로).
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
  window.__prof && window.__prof.reset && window.__prof.reset();
  const A = { lastQ: 0, lastE: 0, aimCorpse: 0 };
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
  function nearestCorpse(p) { let b = null, bd = 1e18;
    for (const c of G.corpses) { if (c.used) continue; const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2; if (d < bd) { bd = d; b = c; } }
    return b ? { c: b, d: Math.sqrt(bd) } : null; }
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
    const Z = window.HSZ;
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
    const now = performance.now();
    const ne = nearestEnemy(p);
    const nc = nearestCorpse(p);
    if (nc && now - A.lastE > 380 && p.mana >= 30) {
      aim((nc.c.x - cam.x) * Z, (nc.c.y - cam.y) * Z);
      A.lastE = now; tap('e'); A.aimCorpse = now;
    } else if (ne && now - A.aimCorpse > 90) {
      aim((ne.m.x - cam.x) * Z, (ne.m.y - cam.y) * Z);
    }
    if (now - A.lastQ > 480) { A.lastQ = now; tap('q'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// 화면 안 금 개체 수 · 그린 금 사각이 덮은 넓이 비율.
const SAMPLE = `(() => {
  const G = window.G;
  const VW = window.innerWidth, VH = window.innerHeight, area = VW * VH;
  const cam = window.cam, Z = window.HSZ;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let goldOn = 0;
  for (const g of (G.golds || [])) if (onScreen(g.x, g.y)) goldOn++;
  let cover = 0;
  for (const r of (window.__goldRects || [])) {
    const x0 = clamp(r.x0, 0, VW), x1 = clamp(r.x1, 0, VW), y0 = clamp(r.y0, 0, VH), y1 = clamp(r.y1, 0, VH);
    const w = x1 - x0, h = y1 - y0; if (w > 0 && h > 0) cover += w * h;
  }
  return { goldOn, goldTotal: (G.golds || []).length, coverPct: cover / area * 100, nrects: (window.__goldRects || []).length };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;

async function runOne(seed, shot) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log("부팅 실패"); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(DEATH)})`);
  await sleep(600);
  const t0 = Date.now();
  const counts = [], covers = [];
  const TAG = process.env.V217TAG || "";
  let shotDone = false;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(500);
    const s = await ev(SAMPLE);
    if (s) { counts.push(s.goldOn); covers.push(s.coverPct); }
    const el = (Date.now() - t0) / 1000;
    if (shot && TAG && !shotDone && el >= 20) {
      shotDone = true;
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/hs_v217_${TAG}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/hs_v217_${TAG}.png  (화면금 ${s ? s.goldOn : "?"} · 덮음 ${s ? r2(s.coverPct) : "?"}%)`);
    }
  }
  const dwell = (await ev(`window.__goldDwell || []`)) || [];
  const goldGen = await ev(`(window.__hsMetric && window.__hsMetric.goldGen) || 0`);
  const goldGot = await ev(`(window.__hsMetric && window.__hsMetric.goldGot) || 0`);
  const grains = await ev(`(window.__hsMetric && window.__hsMetric.grains) || 0`);
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  return { seed, n: counts.length, counts, covers, dwell, goldGen, goldGot, grains, framep95 };
}

async function main() {
  log(`■ hs_v217_gold — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 화면 금 p95 ≤ 12 · ㉡ 바닥 체류 중앙값 ≤ 1.2초`);
  log(`  회귀: goldGen(뿌린 총액) 표기 · frame p95 ≤ 16.7ms · 콘솔 오류 0\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const r = await runOne(SEEDS[i], i === 0);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n}` +
      ` · ㉠화면금 중앙 ${median(r.counts)}·p95 ${p95(r.counts)}(최대 ${Math.max(0, ...r.counts)})` +
      ` · ㉡체류중앙 ${r2(median(r.dwell))}초(표본 ${r.dwell.length})` +
      ` · ㉢덮음중앙 ${r2(median(r.covers))}%·p95 ${r2(p95(r.covers))}%` +
      ` · 뿌린금 ${r.goldGen}·회수 ${r.goldGot}·알갱이 ${r.grains}` +
      ` · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const allCounts = runs.flatMap(r => r.counts);
  const allCovers = runs.flatMap(r => r.covers);
  const allDwell = runs.flatMap(r => r.dwell);
  const countMed = median(allCounts), countP95 = p95(allCounts);
  const dwellMed = median(allDwell);
  const coverMed = median(allCovers), coverP95 = p95(allCovers);
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);
  const goldGen = runs.reduce((s, r) => s + r.goldGen, 0);
  const goldGot = runs.reduce((s, r) => s + r.goldGot, 0);
  const grains = runs.reduce((s, r) => s + r.grains, 0);

  const pass = {
    countP95: countP95 <= 12,
    countObs: allCounts.length >= 1,
    dwell: dwellMed <= 1.2,
    dwellObs: allDwell.length >= 1,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 화면 금 개체 중앙 ${countMed}·p95 ${countP95}(표본 ${allCounts.length}) ≤ 12 → ${pass.countP95 && pass.countObs ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 바닥 체류 중앙값 ${r2(dwellMed)}초(표본 ${allDwell.length}) ≤ 1.2 → ${pass.dwell && pass.dwellObs ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉢ 덮음 중앙 ${r2(coverMed)}%·p95 ${r2(coverP95)}% (참고)`);
  log(`  (회귀) 뿌린금 ${goldGen}·회수 ${goldGot}·알갱이 ${grains} · frame p95 ${fp95}ms ≤16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v217_gold.json", JSON.stringify({
    SEC, SEEDS, countMed, countP95, dwellMed, dwellN: allDwell.length,
    coverMed, coverP95, fp95, totErr, goldGen, goldGot, grains, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, countMed: median(r.counts), countP95: p95(r.counts),
      dwellMed: median(r.dwell), dwellN: r.dwell.length, coverMed: median(r.covers),
      goldGen: r.goldGen, goldGot: r.goldGot, grains: r.grains, framep95: r.framep95, errs: r.errs })),
  }, null, 1));
  log(`\n(자료 tmp/v217_gold.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
