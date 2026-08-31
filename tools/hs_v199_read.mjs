/* V-199 「연출/에셋」 두 판째의 자. ㉠ 시체폭발이 «그림»인가(폭발 사각 안 고유색·폭·불투명) ·
 * ㉡ 뼈창 명중 이벤트 대비 임팩트가 «그려진 비율»(그린 사각 안 고유색). hs_v198_read.mjs 를 본으로.
 *
 *   node tools/hs_v199_read.mjs [초] [씨앗들]
 *   node tools/hs_v199_read.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 그린 사각을 그대로 본다 — main.js 가 매 프레임 window.__boomRects(그린 폭발 화면사각)·
 *   window.__hitRects(그린 명중 임팩트 화면사각)·window.__spearRects(회귀 V-198)·__labels/__silRects 를 남긴다.
 *   또 hurtEnemy 가 window.__spearHitN(뼈창 명중 이벤트 누계)·window.__hitDrawnN(임팩트 그린 누계)를 센다.
 *   ㉠ 폭발 사각 안 «밝은» 픽셀의 고유색 수(≥3px 담긴 칸만)·폭(가로/세로 최소)·불투명수. 주황 한 갈래면 미달.
 *   ㉡ 명중 대비 그린 비율 = __hitDrawnN / __spearHitN. 임팩트 사각 안 고유색도 함께 잰다.
 * ★ E(시체폭발)를 실제로 누르는지 먼저 본다 — 자동조종이 e 를 tap 하고, 폭발 관측 0 이면 「통과」라 안 적는다. */
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

// 자동조종 — 뼈창(q)으로 잡고, 시체가 생기면 E(e)로 폭발시킨다(둘 다 자가 봐야 하는 연출).
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
  const A = { lastQ: 0, lastE: 0, aimCorpse: 0 }; window.__a199 = A;
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
    // E(폭발)를 쓸 참이면 커서를 시체로 옮긴다(corpseNova 가 커서 근처 시체를 본다) — 아니면 적을 겨눈다.
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

// __boomRects(㉠)·__hitRects(㉡)·__spearRects(회귀 V-198)·__labels/__silRects(회귀 V-197) 와 캔버스 픽셀을 읽는다.
const SAMPLE = `(() => {
  const G = window.G;
  const VW = window.innerWidth, VH = window.innerHeight;
  const g = document.getElementById('board').getContext('2d', { willReadFrequently: true });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 사각 안 «밝은» 픽셀의 고유색 수(≥3px 담긴 칸만)·폭(가로/세로 최소)·불투명(밝은) 수.
  function measure(r) {
    const x0 = clamp(Math.round(r.x0), 0, VW), x1 = clamp(Math.round(r.x1), 0, VW);
    const y0 = clamp(Math.round(r.y0), 0, VH), y1 = clamp(Math.round(r.y1), 0, VH);
    const w = x1 - x0, h = y1 - y0; if (w <= 1 || h <= 1) return null;
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
    if (lit < 4) return null;
    let nColor = 0; for (const c of buckets.values()) if (c >= 3) nColor++;
    let maxCol = 0, maxRow = 0;
    for (let px = 0; px < w; px++) if (cols[px] > maxCol) maxCol = cols[px];
    for (let py = 0; py < h; py++) if (rows[py] > maxRow) maxRow = rows[py];
    return { nColor, width: Math.min(maxCol, maxRow), lit };
  }

  const boomObs = [];
  for (const r of (window.__boomRects || [])) { const o = measure(r); if (o) boomObs.push(o); }
  const hitObs = [];
  for (const r of (window.__hitRects || [])) { const o = measure(r); if (o) hitObs.push(o); }

  // 회귀 V-198 ㉠ — 뼈창 발사체 고유색·폭.
  const spearObs = [];
  for (const r of (window.__spearRects || [])) { const o = measure(r); if (o) spearObs.push(o); }

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

  const fr = (window.__floatRects || []).filter(r => r.dmg);
  let ovDmg = 0;
  for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (ov(fr[i], fr[j])) ovDmg++;
  const byName = new Map();
  for (const L of labels) { const n = L.it && L.it.item ? L.it.item.name : '?'; byName.set(n, (byName.get(n) || 0) + 1); }
  let maxSameLabel = 0; for (const c of byName.values()) if (c > maxSameLabel) maxSameLabel = c;
  const els = window.__eliteLabels || [], brs = window.__boomRects || [];
  let labelOnBoom = 0;
  for (const L of els) if (L.drawn) for (const b of brs) if (ov(L, b)) { labelOnBoom++; break; }

  return { nboom: (window.__boomRects || []).length, boomObs,
    nhit: (window.__hitRects || []).length, hitObs,
    spearHitN: window.__spearHitN || 0, hitDrawnN: window.__hitDrawnN || 0,
    spearObs,
    nlab: labels.length, nplayer: players.length, nmob: mobs.length, plHit, mbHit, enem,
    v211: { ovDmg, nDmg: fr.length, maxSameLabel, labelOnBoom, nElite: els.length } };
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
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) + `;globalThis.__V211=${process.env.V211 !== "off"};` });
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
  const TAG = process.env.V211TAG || "", worst = { a: -1, b: -1, c: -1 };
  const grabWorst = async (key, val) => {
    if (!TAG || val <= worst[key]) return;
    worst[key] = val;
    const r = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`tmp/hs_v211_${TAG}_${key}.png`, Buffer.from(r.data, "base64"));
  };
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(500);
    const s = await ev(SAMPLE);
    if (s) { samples.push({ t: (Date.now() - t0) / 1000, ...s });
      if (s.v211) { await grabWorst("a", s.v211.ovDmg); await grabWorst("b", s.v211.maxSameLabel); await grabWorst("c", s.v211.labelOnBoom); } }
    const el = Math.round((Date.now() - t0) / 1000);
    // 컷은 «폭발이 살아있는 그 프레임»을 잡아야 한다 — 폭발 수명은 0.55초라 500ms 표본과 어긋난다.
    //   촘촘히(60ms) 폭발을 살펴 하나라도 뜨는 즉시 찍는다(최대 5초 기다린다).
    for (const T of shotAt) if (!shotDone.has(T) && el >= T) {
      shotDone.add(T);
      let grabbed = false;
      for (let k = 0; k < 80 && !grabbed; k++) {
        const nb = await ev(`(window.__boomRects || []).length`);
        if (nb >= 1) {
          const r = await S("Page.captureScreenshot", { format: "png" });
          fs.writeFileSync(`tmp/v199_t${T}.png`, Buffer.from(r.data, "base64"));
          const nh = await ev(`(window.__hitRects || []).length`);
          log(`  컷 tmp/v199_t${T}.png  (폭발 ${nb} · 명중임팩트 ${nh})`);
          grabbed = true;
        } else await sleep(60);
      }
      if (!grabbed) log(`  컷 tmp/v199_t${T}.png — 폭발 프레임을 못 잡았다(5초 안에 폭발 없음)`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  const spearHitN = await ev(`window.__spearHitN || 0`);
  const hitDrawnN = await ev(`window.__hitDrawnN || 0`);
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const boomObs = samples.flatMap(x => x.boomObs || []);
  const hitObs = samples.flatMap(x => x.hitObs || []);
  const spObs = samples.flatMap(x => x.spearObs || []);
  const withLab = samples.filter(x => x.nlab >= 1);
  const withLabMob = samples.filter(x => x.nlab >= 1 && x.nmob >= 1);
  const enemA = samples.map(x => x.enem);
  const engaged = enemA.filter(v => v >= 1);
  const v = samples.map(x => x.v211).filter(Boolean);
  const v211 = {
    ovDmgMax: Math.max(0, ...v.map(x => x.ovDmg)),
    sameLabelMax: Math.max(0, ...v.map(x => x.maxSameLabel)),
    labelOnBoomFrames: v.filter(x => x.labelOnBoom > 0).length,
    eliteFrames: v.filter(x => x.nElite > 0).length,
  };
  return {
    seed, n: samples.length, framep95, spearHitN, hitDrawnN, v211,
    boomN: boomObs.length,
    boomColorMed: median(boomObs.map(o => o.nColor)),
    boomWidthMed: median(boomObs.map(o => o.width)),
    boomLitMed: median(boomObs.map(o => o.lit)),
    hitN: hitObs.length,
    hitColorMed: median(hitObs.map(o => o.nColor)),
    spColorMed: median(spObs.map(o => o.nColor)),
    spWidthMed: median(spObs.map(o => o.width)),
    spN: spObs.length,
    withLab: withLab.length, plOverlap: withLab.filter(x => x.plHit).length,
    withLabMob: withLabMob.length, mbOverlap: withLabMob.filter(x => x.mbHit).length,
    engP50: median(engaged), engN: engaged.length,
    errs: 0, boomObs, hitObs, spObs,
  };
}

async function main() {
  log(`■ hs_v199_read — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 폭발 고유색 ≥8 · 폭발 사각 안 쪼그라들지 않음(폭 ≥30px)`);
  log(`         ㉡ 명중 대비 임팩트 그린 비율 ≥90% · 임팩트 사각 안 고유색 ≥6`);
  log(`  회귀: 교전중 적 p50 ≥12 · frame p95 ≤16.7ms · 콘솔 오류 0 · V-198 뼈창 색 ≥6·폭 ≥10px · V-197 주인공 ≤3%·몹 ≤15%\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  [V-211] ㉠겹친피해수쌍 max ${r.v211.ovDmgMax} · ㉡같은이름표 max ${r.v211.sameLabelMax} · ㉢폭발위이름표 ${r.v211.labelOnBoomFrames}/${r.v211.eliteFrames}프레임`);
    const ratio = pct(r.hitDrawnN, r.spearHitN);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n}` +
      ` · ㉠폭발 색 ${r.boomColorMed}·폭 ${r.boomWidthMed}px·불투명 ${r.boomLitMed}(관측 ${r.boomN})` +
      ` · ㉡명중그린 ${ratio}%(${r.hitDrawnN}/${r.spearHitN})·임팩트색 ${r.hitColorMed}(관측 ${r.hitN})` +
      ` · (V-198)뼈창 색 ${r.spColorMed}·폭 ${r.spWidthMed}px` +
      ` · (V-197)주인공 ${pct(r.plOverlap, r.withLab)}%·몹 ${pct(r.mbOverlap, r.withLabMob)}%` +
      ` · 교전중 적 p50 ${r.engP50} · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const boomObs = runs.flatMap(r => r.boomObs);
  const boomColorMed = median(boomObs.map(o => o.nColor));
  const boomWidthMed = median(boomObs.map(o => o.width));
  const boomLitMed = median(boomObs.map(o => o.lit));
  const hitObs = runs.flatMap(r => r.hitObs);
  const hitColorMed = median(hitObs.map(o => o.nColor));
  const spObs = runs.flatMap(r => r.spObs);
  const spColorMed = median(spObs.map(o => o.nColor));
  const spWidthMed = median(spObs.map(o => o.width));
  const spearHitN = runs.reduce((s, r) => s + r.spearHitN, 0);
  const hitDrawnN = runs.reduce((s, r) => s + r.hitDrawnN, 0);
  const hitRatio = pct(hitDrawnN, spearHitN);
  const wLab = runs.reduce((s, r) => s + r.withLab, 0), plOv = runs.reduce((s, r) => s + r.plOverlap, 0);
  const wLabMob = runs.reduce((s, r) => s + r.withLabMob, 0), mbOv = runs.reduce((s, r) => s + r.mbOverlap, 0);
  const plShare = pct(plOv, wLab), mbShare = pct(mbOv, wLabMob);
  const engP50 = median(runs.map(r => r.engP50).filter(v => v >= 1)) || median(runs.map(r => r.engP50));
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = {
    boomColor: boomColorMed >= 8,
    boomWidth: boomWidthMed >= 30,
    boomSeen: boomObs.length >= 1,
    hitRatio: hitRatio >= 90,
    hitColor: hitColorMed >= 6,
    spV198c: spColorMed >= 6,
    spV198w: spWidthMed >= 10,
    plV197: plShare <= 3,
    mbV197: mbShare <= 15,
    eng: engP50 >= 12,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 폭발 고유색 ${boomColorMed}(관측 ${boomObs.length}) ≥ 8 → ${pass.boomColor ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉠ 폭발 사각 폭 ${boomWidthMed}px(불투명중앙 ${boomLitMed}) ≥ 30 → ${pass.boomWidth ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉠ 폭발 관측 ${boomObs.length}개 ≥ 1 → ${pass.boomSeen ? "통과 ✔" : "미달 ✘ (E 를 못 눌렀다)"}`);
  log(`  ㉡ 명중 대비 임팩트 그린 비율 ${hitRatio}%(${hitDrawnN}/${spearHitN}) ≥ 90 → ${pass.hitRatio ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 임팩트 사각 고유색 ${hitColorMed}(관측 ${hitObs.length}) ≥ 6 → ${pass.hitColor ? "통과 ✔" : "미달 ✘"}`);
  log(`  (V-198) 뼈창 고유색 ${spColorMed} ≥6 → ${pass.spV198c ? "통과 ✔" : "미달 ✘"} · 폭 ${spWidthMed}px ≥10 → ${pass.spV198w ? "통과 ✔" : "미달 ✘"}`);
  log(`  (V-197) 주인공 겹침 ${plShare}%(${plOv}/${wLab}) ≤3 → ${pass.plV197 ? "통과 ✔" : "미달 ✘"} · 몹 ${mbShare}%(${mbOv}/${wLabMob}) ≤15 → ${pass.mbV197 ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) 교전중 적 p50 ${engP50} ≥12 → ${pass.eng ? "통과 ✔" : "미달 ✘"} · frame p95 ${fp95}ms ≤16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v199_read.json", JSON.stringify({
    SEC, SEEDS,
    boomColorMed, boomWidthMed, boomLitMed, boomN: boomObs.length,
    hitRatio, hitDrawnN, spearHitN, hitColorMed, hitN: hitObs.length,
    spColorMed, spWidthMed, spN: spObs.length,
    plShare, plOv, wLab, mbShare, mbOv, wLabMob,
    engP50, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      boomColorMed: r.boomColorMed, boomWidthMed: r.boomWidthMed, boomN: r.boomN,
      hitDrawnN: r.hitDrawnN, spearHitN: r.spearHitN, hitColorMed: r.hitColorMed, hitN: r.hitN,
      spColorMed: r.spColorMed, spWidthMed: r.spWidthMed, engP50: r.engP50,
      plShare: pct(r.plOverlap, r.withLab), mbShare: pct(r.mbOverlap, r.withLabMob) })),
  }, null, 1));
  log(`\n(자료 tmp/v199_read.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
