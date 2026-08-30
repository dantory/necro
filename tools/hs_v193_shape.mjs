/* V-193 「적 무리의 배치 모양」의 자. V-192 로 화면 밀도는 규격 안에 들었으나(적 p50 14),
 * 컷을 눈으로 보니 깨어난 적들이 «완전한 행렬(격자)»로 서 있었다. 밀도를 수로만 재고
 * 모양을 안 재서 안 드러난 자리 — 이 판은 «배치의 모양»을 수로 잰다.
 *
 *   node tools/hs_v193_shape.mjs [초] [씨앗들]
 *   node tools/hs_v193_shape.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 자·자동조종·화면 사각 거르는 식은 tools/hs_v192_dense.mjs 에서 그대로 가져왔다(CDP 9333).
 * 표본마다 «화면 안 살아 있는 적 좌표»를 모아 두 모양 수를 낸다:
 *   ㉠ 최근접 이웃 거리의 변동계수 CV = std/mean  (완전 격자≈0 · 2D 무작위≈0.52 · 통과선 ≥0.35)
 *   ㉡ 축 정렬 비율 = 최근접 이웃으로 향하는 각이 0/90/180/270°±15° 안에 드는 비율 (무작위≈33% · 격자≈100% · 통과선 ≤50%)
 * 표본당 적 6마리 미만이면 그 표본은 버린다.
 * 원인 가르기(가/나): 같은 두 수를 «잠든 팩(awake=false)» 적과 «깨어난 팩» 적에 따로 내 비교한다.
 *   잠든 것부터 CV 낮으면 (가) 생성 격자 · 잠든 건 높은데 깨면 낮아지면 (나) 추격 중 간격 보존. */
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

// 자동조종 — v192 와 동일(재기 판을 바꾸지 않는다).
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
  const A = { lastQ: 0, lastE: 0 }; window.__a193 = A;
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
    if (now - A.lastQ > 550) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 450) { A.lastE = now; tap('e'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// 화면 사각에 걸러 «좌표»를 모은다 — hs/main.js 의 (world-cam)·Z 와 같은 식.
// all = 화면 안 살아 있는 적(통과선의 대상) · sleep = 그 중 잠든 팩 · awake = 그 중 깨어난 팩.
const SAMPLE = `(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ;
  const VW = window.innerWidth, VH = window.innerHeight;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  const all = [], sleep = [], awake = [];
  for (const pk of G.packs) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) {
    const pt = [m.x, m.y]; all.push(pt); (pk.awake ? awake : sleep).push(pt);
  }
  return { all, sleep, awake };
})()`;

// ── 모양 통계 ──────────────────────────────────────────────────────────
// pts: [[x,y],...] · 반환 { n, cv, axis } · n<6 이면 null.
function shape(pts) {
  const n = pts.length;
  if (n < 6) return null;
  const nn = [], ang = [];
  for (let i = 0; i < n; i++) {
    let bd = Infinity, bj = -1;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1], d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; bj = j; }
    }
    if (bj < 0) continue;
    nn.push(Math.sqrt(bd));
    // 최근접 이웃 방향의 각 → 0/90/180/270 에 얼마나 가까운가(±15° 축정렬)
    let a = Math.atan2(pts[bj][1] - pts[i][1], pts[bj][0] - pts[i][0]) * 180 / Math.PI;
    a = ((a % 90) + 90) % 90;             // 0..90 로 접는다(네 축이 90° 주기)
    const off = Math.min(a, 90 - a);      // 가장 가까운 축까지의 각차
    ang.push(off <= 15 ? 1 : 0);
  }
  const mean = nn.reduce((s, x) => s + x, 0) / nn.length;
  const varr = nn.reduce((s, x) => s + (x - mean) ** 2, 0) / nn.length;
  const cv = mean > 0 ? Math.sqrt(varr) / mean : 0;
  const axis = ang.reduce((s, x) => s + x, 0) / ang.length;
  return { n, cv, axis };
}

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
const r2 = n => Math.round(n * 100) / 100;
const r1 = n => Math.round(n * 10) / 10;

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
  const samples = [];      // 표본마다 { t, count, all:shape|null, sleep:shape|null, awake:shape|null }
  const shotAt = shots ? new Set([20, 60, 120]) : new Set();
  const shotDone = new Set();
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1000);
    const s = await ev(SAMPLE);
    if (s) samples.push({ t: (Date.now() - t0) / 1000, count: s.all.length,
      all: shape(s.all), sleep: shape(s.sleep), awake: shape(s.awake) });
    const el = Math.round((Date.now() - t0) / 1000);
    for (const T of shotAt) if (!shotDone.has(T) && el >= T) {
      shotDone.add(T);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v193_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v193_t${T}.png  (화면 안 적 ${s?.all.length})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  // 표본별 모양 수 → 유효 표본(n≥6)만 모은다.
  const validAll = samples.filter(s => s.all);
  const cvAll = validAll.map(s => s.all.cv), axAll = validAll.map(s => s.all.axis);
  const cvSleep = samples.filter(s => s.sleep).map(s => s.sleep.cv);
  const cvAwake = samples.filter(s => s.awake).map(s => s.awake.cv);
  const axSleep = samples.filter(s => s.sleep).map(s => s.sleep.axis);
  const axAwake = samples.filter(s => s.awake).map(s => s.awake.axis);
  const counts = samples.map(s => s.count);
  return {
    seed, n: samples.length, framep95, errs: errs.length,
    validN: validAll.length,
    cv:   { median: r2(median(cvAll)), mean: r2(mean(cvAll)) },
    axis: { median: r2(median(axAll)), mean: r2(mean(axAll)) },
    enemP50: median(counts), enemMean: r1(mean(counts)), enemP95: p95(counts),
    sleep: { nsamp: cvSleep.length, cvMedian: r2(median(cvSleep)), axMedian: r2(median(axSleep)) },
    awake: { nsamp: cvAwake.length, cvMedian: r2(median(cvAwake)), axMedian: r2(median(axAwake)) },
    cvAll, axAll,   // 씨앗 합산에 쓰려고 원 표본값을 남긴다
  };
}

async function main() {
  log(`■ hs_v193_shape — 배치 모양 · 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 최근접이웃 CV ≥ 0.35 · ㉡ 축정렬 비율 ≤ 0.50 (표본당 적 6마리 미만 버림)`);
  log(`  회귀선(깨면 실패): 화면 안 적 p50 ≥ 12\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    runs.push(r);
    log(`  씨앗 ${r.seed}: 표본 ${r.n}(유효 ${r.validN}) · CV p50 ${r.cv.median}(mean ${r.cv.mean}) · 축정렬 p50 ${r.axis.median}` +
      ` · 화면 적 p50 ${r.enemP50}(mean ${r.enemMean}·p95 ${r.enemP95}) · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
    log(`      [원인] 잠든: 표본 ${r.sleep.nsamp} CV ${r.sleep.cvMedian} 축 ${r.sleep.axMedian}` +
      ` | 깨어난: 표본 ${r.awake.nsamp} CV ${r.awake.cvMedian} 축 ${r.awake.axMedian}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  // 씨앗 합산 — 통과선은 씨앗을 합친 표본의 중앙값으로 판정한다.
  const allCv = runs.flatMap(r => r.cvAll), allAx = runs.flatMap(r => r.axAll);
  const cvP50 = r2(median(allCv)), axP50 = r2(median(allAx));
  const enemP50 = median(runs.flatMap(r => Array(r.n).fill(0).map((_, i) => r.enemP50)));  // 근사: 씨앗 p50 의 중앙값
  const enemP50comb = median(runs.map(r => r.enemP50));
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = { cv: cvP50 >= 0.35, axis: axP50 <= 0.50 };
  log(`\n▣ 통과선 판정 (씨앗 합산 표본 중앙값)`);
  log(`  ㉠ 최근접이웃 CV ${cvP50} ≥ 0.35 → ${pass.cv ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 축정렬 비율 ${axP50} ≤ 0.50 → ${pass.axis ? "통과 ✔" : "미달 ✘"}`);
  log(`  회귀선 화면 안 적 p50(씨앗별 중앙값의 중앙값) ${enemP50comb} ≥ 12 → ${enemP50comb >= 12 ? "지킴 ✔" : "깨짐 ✘"}`);
  log(`  frame p95(최악 씨앗) ${fp95}ms (예산 16.7) · 콘솔 오류 ${totErr}`);
  const all = pass.cv && pass.axis;
  log(`  ▶ ${all ? "두 모양 축 다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v193_shape.json", JSON.stringify({ SEC, SEEDS, cvP50, axP50, enemP50: enemP50comb, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, validN: r.validN, framep95: r.framep95, errs: r.errs,
      cv: r.cv, axis: r.axis, enemP50: r.enemP50, enemMean: r.enemMean, enemP95: r.enemP95,
      sleep: r.sleep, awake: r.awake })) }, null, 1));
  log(`\n(자료 tmp/v193_shape.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
