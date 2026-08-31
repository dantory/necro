/* V-198 「연출/에셋」의 자. ㉠ 뼈창 발사체가 «그림»인가(고유색 수·폭) ·
 * ㉡ 적 발밑 붉은 고리끼리 겹침(%). hs_v197_read.mjs 를 본으로, 축을 «못 읽는 연출»로 옮긴다.
 *
 *   node tools/hs_v198_read.mjs [초] [씨앗들]
 *   node tools/hs_v198_read.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 그린 사각을 그대로 본다 — main.js 가 매 프레임 window.__spearRects(그린 뼈창 발사체
 *   화면사각)·window.__ringRects(그린 발밑 색 고리 화면타원+색)·window.__silRects 를 남긴다.
 *   ㉠ 뼈창 사각 안 픽셀을 getImageData 로 읽어 «밝은 픽셀»의 고유색 수와 폭(가로/세로 최소)을 잰다.
 *      흰 선분(색 1~2·폭 3)이면 미달. 그린 스프라이트면 색 여럿·폭 큼.
 *   ㉡ 적 고리(붉/주)만 골라 성긴 격자에 타원을 찍고, 두 겹 이상 찍힌 칸/한 겹 이상 칸 = 겹침%. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 120);
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
  const A = { lastQ: 0, lastE: 0 }; window.__a198 = A;
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
    const ne = nearestEnemy(p);
    if (ne) aim((ne.m.x - cam.x) * Z, (ne.m.y - cam.y) * Z);
    const now = performance.now();
    if (now - A.lastQ > 550) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 450) { A.lastE = now; tap('e'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// window.__spearRects(㉠)·window.__ringRects(㉡)·window.__silRects(회귀 V-197) 과 캔버스 픽셀을 읽는다.
const SAMPLE = `(() => {
  const G = window.G;
  const VW = window.innerWidth, VH = window.innerHeight;
  const g = document.getElementById('board').getContext('2d', { willReadFrequently: true });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ㉠ 뼈창 — 그린 사각 안 «밝은» 픽셀의 고유색 수(≥3px 담긴 칸만)·폭(가로/세로 최소).
  const spears = window.__spearRects || [];
  const spearObs = [];
  for (const r of spears) {
    const x0 = clamp(Math.round(r.x0), 0, VW), x1 = clamp(Math.round(r.x1), 0, VW);
    const y0 = clamp(Math.round(r.y0), 0, VH), y1 = clamp(Math.round(r.y1), 0, VH);
    const w = x1 - x0, h = y1 - y0; if (w <= 1 || h <= 1) continue;
    const d = g.getImageData(x0, y0, w, h).data;
    const buckets = new Map();
    const cols = new Int16Array(w), rows = new Int16Array(h);
    let lit = 0;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4, R = d[i], Gc = d[i + 1], B = d[i + 2];
      const luma = 0.299 * R + 0.587 * Gc + 0.114 * B;
      if (luma < 90) continue;
      lit++; cols[px]++; rows[py]++;
      const q = (R >> 3) << 10 | (Gc >> 3) << 5 | (B >> 3);
      buckets.set(q, (buckets.get(q) || 0) + 1);
    }
    if (lit < 4) continue;
    let nColor = 0; for (const c of buckets.values()) if (c >= 3) nColor++;
    let maxCol = 0, maxRow = 0;
    for (let px = 0; px < w; px++) if (cols[px] > maxCol) maxCol = cols[px];
    for (let py = 0; py < h; py++) if (rows[py] > maxRow) maxRow = rows[py];
    spearObs.push({ nColor, width: Math.min(maxCol, maxRow), lit });
  }

  // ㉡ 적 고리(붉/주만) — 성긴 격자에 타원을 찍어 두 겹 이상/한 겹 이상 = 겹침%.
  const rings = (window.__ringRects || []).filter(r => r.col === '#c0342c' || r.col === '#f0902a');
  const CELL = 3; const gw = Math.ceil(VW / CELL), gh = Math.ceil(VH / CELL);
  const grid = new Uint16Array(gw * gh);
  let cover1 = 0, cover2 = 0;
  for (const r of rings) {
    const cx = r.cx, cy = r.cy, rx = Math.max(1, r.rx), ry = Math.max(1, r.ry);
    const gx0 = clamp(Math.floor((cx - rx) / CELL), 0, gw - 1), gx1 = clamp(Math.ceil((cx + rx) / CELL), 0, gw - 1);
    const gy0 = clamp(Math.floor((cy - ry) / CELL), 0, gh - 1), gy1 = clamp(Math.ceil((cy + ry) / CELL), 0, gh - 1);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const sx = gx * CELL + CELL / 2, sy = gy * CELL + CELL / 2;
      const nx = (sx - cx) / rx, ny = (sy - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const k = gy * gw + gx; const before = grid[k]; grid[k] = before + 1;
      if (before === 0) cover1++; else if (before === 1) cover2++;
    }
  }

  // 회귀 V-197 — 바닥 이름표가 살아있는 것을 덮나(하나라도 겹치면 1).
  const labels = window.__labels || [];
  const sils = window.__silRects || [];
  const players = sils.filter(s => s.who === 'player');
  const mobs = sils.filter(s => s.who === 'mob');
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  let plHit = 0, mbHit = 0;
  for (const L of labels) {
    if (!plHit) for (const s of players) if (ov(L, s)) { plHit = 1; break; }
    if (!mbHit) for (const s of mobs) if (ov(L, s)) { mbHit = 1; break; }
    if (plHit && mbHit) break;
  }

  // 회귀: 교전중 화면 안 적 수(onScreen).
  const cam = window.cam, Z = window.HSZ;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let enem = 0;
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) enem++;

  return { nspear: spears.length, spearObs, nring: rings.length,
    ringCover1: cover1, ringCover2: cover2,
    nlab: labels.length, nplayer: players.length, nmob: mobs.length, plHit, mbHit, enem };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = n => Math.round(n * 10) / 10;
const pct = (a, b) => b ? Math.round((a / b) * 1000) / 10 : 0;

async function runOne(seed, shots) {
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
  const samples = [];
  const shotAt = shots ? new Set([20, 60, 120]) : new Set();
  const shotDone = new Set();
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1000);
    const s = await ev(SAMPLE);
    if (s) samples.push({ t: (Date.now() - t0) / 1000, ...s });
    const el = Math.round((Date.now() - t0) / 1000);
    for (const T of shotAt) if (!shotDone.has(T) && el >= T && s && s.nspear >= 1) {
      shotDone.add(T);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v198_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v198_t${T}.png  (뼈창 ${s.nspear} · 적 ${s.enem} · 고리 ${s.nring})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const spObs = samples.flatMap(x => x.spearObs || []);
  const ringF = samples.filter(x => x.nring >= 2 && x.ringCover1 >= 1);
  const ringRatios = ringF.map(x => pct(x.ringCover2, x.ringCover1));
  const withLab = samples.filter(x => x.nlab >= 1);
  const withLabMob = samples.filter(x => x.nlab >= 1 && x.nmob >= 1);
  const enemA = samples.map(x => x.enem);
  const engaged = enemA.filter(v => v >= 1);
  return {
    seed, n: samples.length, framep95,
    spN: spObs.length,
    spColorMed: median(spObs.map(o => o.nColor)),
    spWidthMed: median(spObs.map(o => o.width)),
    ringN: ringF.length,
    ringOverMed: median(ringRatios),
    ringCover1Sum: ringF.reduce((s, x) => s + x.ringCover1, 0),
    ringCover2Sum: ringF.reduce((s, x) => s + x.ringCover2, 0),
    withLab: withLab.length, plOverlap: withLab.filter(x => x.plHit).length,
    withLabMob: withLabMob.length, mbOverlap: withLabMob.filter(x => x.mbHit).length,
    engP50: median(engaged), engN: engaged.length,
    errs: 0, spObs, ringRatios,
  };
}

async function main() {
  log(`■ hs_v198_read — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 뼈창 고유색 ≥6 · 폭 ≥10px · ㉡ 적 고리 겹침 ≤20%`);
  log(`  회귀: 교전중 적 p50 ≥12 · frame p95 ≤16.7ms · 콘솔 오류 0 · V-197 주인공겹침 ≤3%·몹 ≤15%\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n}` +
      ` · ㉠뼈창 색 ${r.spColorMed}·폭 ${r.spWidthMed}px(관측 ${r.spN})` +
      ` · ㉡고리겹침 ${r.ringOverMed}%(프레임 ${r.ringN})` +
      ` · (V-197) 주인공겹침 ${pct(r.plOverlap, r.withLab)}% 몹 ${pct(r.mbOverlap, r.withLabMob)}%` +
      ` · 교전중 적 p50 ${r.engP50} · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const spObs = runs.flatMap(r => r.spObs);
  const spColorMed = median(spObs.map(o => o.nColor));
  const spWidthMed = median(spObs.map(o => o.width));
  const ringRatios = runs.flatMap(r => r.ringRatios);
  const ringOverMed = median(ringRatios);
  const ringCover1 = runs.reduce((s, r) => s + r.ringCover1Sum, 0);
  const ringCover2 = runs.reduce((s, r) => s + r.ringCover2Sum, 0);
  const ringOverAll = pct(ringCover2, ringCover1);
  const wLab = runs.reduce((s, r) => s + r.withLab, 0), plOv = runs.reduce((s, r) => s + r.plOverlap, 0);
  const wLabMob = runs.reduce((s, r) => s + r.withLabMob, 0), mbOv = runs.reduce((s, r) => s + r.mbOverlap, 0);
  const plShare = pct(plOv, wLab), mbShare = pct(mbOv, wLabMob);
  const engP50 = median(runs.map(r => r.engP50).filter(v => v >= 1)) || median(runs.map(r => r.engP50));
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = {
    spColor: spColorMed >= 6,
    spWidth: spWidthMed >= 10,
    ring: ringOverMed <= 20,
    plV197: plShare <= 3,
    mbV197: mbShare <= 15,
    eng: engP50 >= 12,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 뼈창 고유색 ${spColorMed}(관측 ${spObs.length}) ≥ 6 → ${pass.spColor ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉠ 뼈창 폭 ${spWidthMed}px ≥ 10 → ${pass.spWidth ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 적 고리 겹침 중앙값 ${ringOverMed}%(프레임 ${ringRatios.length}·합산 ${ringOverAll}%) ≤ 20% → ${pass.ring ? "통과 ✔" : "미달 ✘"}`);
  log(`  (V-197) 주인공 겹침 ${plShare}%(${plOv}/${wLab}) ≤3% → ${pass.plV197 ? "통과 ✔" : "미달 ✘"} · 몹 ${mbShare}%(${mbOv}/${wLabMob}) ≤15% → ${pass.mbV197 ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) 교전중 적 p50 ${engP50} ≥12 → ${pass.eng ? "통과 ✔" : "미달 ✘"} · frame p95 ${fp95}ms ≤16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v198_read.json", JSON.stringify({
    SEC, SEEDS,
    spColorMed, spWidthMed, spN: spObs.length,
    ringOverMed, ringOverAll, ringCover1, ringCover2, ringFrames: ringRatios.length,
    plShare, plOv, wLab, mbShare, mbOv, wLabMob,
    engP50, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      spColorMed: r.spColorMed, spWidthMed: r.spWidthMed, spN: r.spN,
      ringOverMed: r.ringOverMed, ringN: r.ringN, engP50: r.engP50,
      plShare: pct(r.plOverlap, r.withLab), mbShare: pct(r.mbOverlap, r.withLabMob) })),
  }, null, 1));
  log(`\n(자료 tmp/v198_read.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
