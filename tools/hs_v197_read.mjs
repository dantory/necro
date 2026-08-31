/* V-197 「안 읽히는 것」의 자. ㉠ 바닥 이름표가 살아있는 것(주인공·몹)을 덮는 비율 ·
 * ㉡ 어두운 구역 적의 대비. hs_v196_bars.mjs 를 본으로, 축을 «못 보는 것»으로 옮긴다.
 *
 *   node tools/hs_v197_read.mjs [초] [씨앗들]
 *   node tools/hs_v197_read.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 그린 사각을 그대로 본다 — main.js 가 매 프레임 window.__labels(그린 이름표 사각) 과
 *   window.__silRects(그린 주인공·몹의 «불투명 실루엣» 화면사각, opaqueHeadTop·footMetrics 로)를
 *   남긴다. 자는 그 배열만 읽는다(㉠). 자와 그림이 어긋나지 않는다.
 *   ㉠ 이름표가 덮는 비율 = 이름표 사각이 (ㄱ)주인공 (ㄴ)몹 실루엣 사각과 겹치는 프레임 비율. 나눠 잰다.
 *   ㉡ 대비 = 화면 안 적 실루엣 사각의 불투명 코어 평균밝기 − 그 둘레 배경 평균밝기(getImageData).
 *     둘레 밝기로 어두운/밝은 구역을 갈라 대비를 나눠 잰다. */
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
  const A = { lastQ: 0, lastE: 0 }; window.__a197 = A;
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

// window.__labels(그린 이름표)·window.__silRects(그린 실루엣) 과 캔버스 픽셀(㉡)을 읽는다.
const SAMPLE = `(() => {
  const G = window.G;
  const VW = window.innerWidth, VH = window.innerHeight;
  const labels = window.__labels || [];
  const sils = window.__silRects || [];
  const players = sils.filter(s => s.who === 'player');
  const mobs = sils.filter(s => s.who === 'mob');
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  // ㉠ 이름표가 살아있는 것을 덮나 — 이 프레임에 하나라도 겹치면 1.
  let plHit = 0, mbHit = 0;
  for (const L of labels) {
    if (!plHit) for (const s of players) if (ov(L, s)) { plHit = 1; break; }
    if (!mbHit) for (const s of mobs) if (ov(L, s)) { mbHit = 1; break; }
    if (plHit && mbHit) break;
  }
  // ㉡ 어두운 구역 적의 대비 — 각 몹 실루엣의 코어 평균밝기 − 둘레 배경 평균밝기.
  const g = document.getElementById('board').getContext('2d');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function meanLuma(x0, y0, x1, y1) {
    x0 = clamp(Math.round(x0), 0, VW); x1 = clamp(Math.round(x1), 0, VW);
    y0 = clamp(Math.round(y0), 0, VH); y1 = clamp(Math.round(y1), 0, VH);
    const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return null;
    const d = g.getImageData(x0, y0, w, h).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
    return { s, n };
  }
  const PAD = 20; const bright = [], dark = [];
  for (const m of mobs) {
    const core = meanLuma(m.x0, m.y0, m.x1, m.y1);
    const outer = meanLuma(m.x0 - PAD, m.y0 - PAD, m.x1 + PAD, m.y1 + PAD);
    if (!core || !outer || outer.n <= core.n) continue;
    const coreMean = core.s / core.n;
    const surrMean = (outer.s - core.s) / (outer.n - core.n);
    const contrast = Math.abs(coreMean - surrMean);
    (surrMean < 40 ? dark : bright).push(Math.round(contrast * 10) / 10);
  }
  // 회귀: 교전중 화면 안 적 수(onScreen).
  const cam = window.cam, Z = window.HSZ;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let enem = 0;
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) enem++;
  return { nlab: labels.length, nplayer: players.length, nmob: mobs.length, plHit, mbHit,
    brightC: bright, darkC: dark, enem };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
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
    for (const T of shotAt) if (!shotDone.has(T) && el >= T && s && s.enem >= 1) {
      shotDone.add(T);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v197_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v197_t${T}.png  (이름표 ${s.nlab} · 주인공겹침 ${s.plHit} · 몹겹침 ${s.mbHit} · 적 ${s.enem})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const withLab = samples.filter(x => x.nlab >= 1);
  const withLabMob = samples.filter(x => x.nlab >= 1 && x.nmob >= 1);
  const plOverlap = withLab.filter(x => x.plHit).length;
  const mbOverlap = withLabMob.filter(x => x.mbHit).length;
  const brightAll = samples.flatMap(x => x.brightC || []);
  const darkAll = samples.flatMap(x => x.darkC || []);
  const enemA = samples.map(x => x.enem);
  const engaged = enemA.filter(v => v >= 1);
  return {
    seed, n: samples.length, framep95,
    withLab: withLab.length, plOverlap, plShare: pct(plOverlap, withLab.length),
    withLabMob: withLabMob.length, mbOverlap, mbShare: pct(mbOverlap, withLabMob.length),
    brightMed: median(brightAll), brightN: brightAll.length,
    darkMed: median(darkAll), darkN: darkAll.length,
    engP50: median(engaged), engN: engaged.length,
    errs: 0, samples,
  };
}

async function main() {
  log(`■ hs_v197_read — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 주인공 겹침 ≤3% · 몹 겹침 ≤15% · ㉡ 어두운 구역 대비 ≥ 밝은 구역 50%`);
  log(`  회귀: 교전중 적 p50 ≥12 · frame p95 ≤16.7ms · 콘솔 오류 0\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n} · 이름표든표본 ${r.withLab}` +
      ` · ㉠주인공겹침 ${r.plShare}%(${r.plOverlap}/${r.withLab}) · 몹겹침 ${r.mbShare}%(${r.mbOverlap}/${r.withLabMob})` +
      ` · ㉡대비 밝 ${r.brightMed}(${r.brightN}) 암 ${r.darkMed}(${r.darkN})` +
      ` · 교전중 적 p50 ${r.engP50}(표본 ${r.engN}) · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const wLab = runs.reduce((s, r) => s + r.withLab, 0);
  const plOv = runs.reduce((s, r) => s + r.plOverlap, 0);
  const wLabMob = runs.reduce((s, r) => s + r.withLabMob, 0);
  const mbOv = runs.reduce((s, r) => s + r.mbOverlap, 0);
  const plShare = pct(plOv, wLab), mbShare = pct(mbOv, wLabMob);
  const brightAll = runs.flatMap(r => r.samples.flatMap(s => s.brightC || []));
  const darkAll = runs.flatMap(r => r.samples.flatMap(s => s.darkC || []));
  const brightMed = median(brightAll), darkMed = median(darkAll);
  const contrastRatio = brightMed ? Math.round((darkMed / brightMed) * 1000) / 10 : 0;
  const allEng = runs.flatMap(r => r.samples.map(s => s.enem)).filter(v => v >= 1);
  const engP50 = median(allEng);
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = {
    player: plShare <= 3,
    mob: mbShare <= 15,
    contrast: darkMed >= brightMed * 0.5,
    eng: engP50 >= 12,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 주인공 겹침 ${plShare}%(${plOv}/${wLab}) ≤ 3% → ${pass.player ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉠ 몹 겹침 ${mbShare}%(${mbOv}/${wLabMob}) ≤ 15% → ${pass.mob ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 대비 밝 ${brightMed}(${brightAll.length}) · 암 ${darkMed}(${darkAll.length}) · 암/밝 ${contrastRatio}% ≥ 50% → ${pass.contrast ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) 교전중 적 p50 ${engP50} ≥ 12 → ${pass.eng ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) frame p95 ${fp95}ms ≤ 16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 콘솔 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v197_read.json", JSON.stringify({
    SEC, SEEDS,
    plShare, plOverlap: plOv, withLab: wLab, mbShare, mbOverlap: mbOv, withLabMob: wLabMob,
    brightMed, brightN: brightAll.length, darkMed, darkN: darkAll.length, contrastRatio,
    engP50, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      plShare: r.plShare, plOverlap: r.plOverlap, withLab: r.withLab,
      mbShare: r.mbShare, mbOverlap: r.mbOverlap, withLabMob: r.withLabMob,
      brightMed: r.brightMed, brightN: r.brightN, darkMed: r.darkMed, darkN: r.darkN, engP50: r.engP50 })),
  }, null, 1));
  log(`\n(자료 tmp/v197_read.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
