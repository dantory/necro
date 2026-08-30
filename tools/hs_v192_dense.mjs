/* V-192 「전투 화면 밀도」의 자. 직전 여섯 판이 성장 창만 팠다 — 축을 전투 화면으로 옮긴다.
 * HS_STYLE ②③ 이 레퍼런스에서 세어 적은 수(적 수십·이름표 6·알갱이 열)로 지금을 잰다.
 *
 *   node tools/hs_v192_dense.mjs [초] [씨앗들]
 *   node tools/hs_v192_dense.mjs 180 1,2     (기본 — 통과선이 요구하는 3분×씨앗 둘)
 *
 * ★ probe-must-walk-the-real-path — 지름길 금지. 게임 안 상태를 «카메라 사각»으로 걸러 센다:
 *   적 = G.packs[].enemies[] 중 alive, 이름표 = 그려진 window.__labels, 알갱이 = METRIC.grains.
 *   화면 좌표는 hs/main.js 와 같은 식 (world - cam)·Z. 월드 전체로 세지 않는다(지름길이면 빈 골이 안 잡힌다).
 * ★ 자동조종은 v190 의 죽음형(가장 잘 싸우는 빌드)을 그대로 쓴다 — 재기 판을 바꾸지 않는다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 180);
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
  const A = { lastQ: 0, lastE: 0 }; window.__a192 = A;
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

// 화면 사각에 걸러 세는 식 — hs/main.js 의 drawEnemy·drawItems 와 같은 (world-cam)·Z 좌표.
// 적/알갱이는 게임 안 실제 상태에서 걸러 세고, 이름표는 그려진 것(window.__labels)만 센다.
const SAMPLE = `(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ;
  const VW = window.innerWidth, VH = window.innerHeight;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let enem = 0;
  for (const pk of G.packs) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) enem++;
  let items = 0, r1 = 0;
  for (const it of G.items) if (onScreen(it.x, it.y)) { items++; const k = it.item.rarity ? it.item.rarity.key : (it.item.build || it.item.unique ? 'blue' : 'white'); if (k !== 'white') r1++; }
  let golds = 0;
  for (const g of G.golds) if (onScreen(g.x, g.y)) golds++;
  const labels = (window.__labels || []).length;
  const M = window.__hsMetric;
  return { floor: G.floor, level: G.player.level, kills: M.kills, grains: M.grains,
    enem, items, itemsRank1: r1, golds, labels };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
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
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0, grains:0 })`);
  const t0 = Date.now();
  const samples = [];
  const shotAt = shots ? new Set([20, 60, 120, 170]) : new Set();
  const shotDone = new Set();
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1000);
    const s = await ev(SAMPLE);
    if (s) samples.push({ t: (Date.now() - t0) / 1000, ...s });
    const el = Math.round((Date.now() - t0) / 1000);
    for (const T of shotAt) if (!shotDone.has(T) && el >= T) {
      shotDone.add(T);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v192_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v192_t${T}.png  (적 ${s?.enem} · 이름표 ${s?.labels} · 알갱이 ${s?.golds})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const last = samples[samples.length - 1] || { kills: 0, grains: 0 };
  const enemA = samples.map(x => x.enem), labA = samples.map(x => x.labels);
  const itemA = samples.map(x => x.items), r1A = samples.map(x => x.itemsRank1), goldA = samples.map(x => x.golds);
  const grainsPerKill = last.kills ? last.grains / last.kills : 0;
  return {
    seed, n: samples.length, framep95,
    enem:  { p50: median(enemA), mean: r1(mean(enemA)), p95: p95(enemA), max: Math.max(0, ...enemA) },
    label: { p50: median(labA),  mean: r1(mean(labA)),  p95: p95(labA),  max: Math.max(0, ...labA) },
    items: { p50: median(itemA), mean: r1(mean(itemA)), p95: p95(itemA), max: Math.max(0, ...itemA) },
    rank1: { p50: median(r1A),   mean: r1(mean(r1A)),   max: Math.max(0, ...r1A) },
    golds: { p50: median(goldA), mean: r1(mean(goldA)), p95: p95(goldA), max: Math.max(0, ...goldA) },
    kills: last.kills, grains: last.grains, grainsPerKill: r1(grainsPerKill),
    samples,
  };
}

async function main() {
  log(`■ hs_v192_dense — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠적 p50≥12 · ㉡이름표 p50≥3 · ㉢처치당 알갱이≥5\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n} · 적 p50 ${r.enem.p50}(mean ${r.enem.mean}·p95 ${r.enem.p95}·max ${r.enem.max})` +
      ` · 이름표 p50 ${r.label.p50}(max ${r.label.max}) · 물건 p50 ${r.items.p50}(등급1+ p50 ${r.rank1.p50})` +
      ` · 알갱이/처치 ${r.grainsPerKill}(처치 ${r.kills}·알갱이 ${r.grains}) · 화면알갱이 p50 ${r.golds.p50}` +
      ` · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  // 씨앗 합산 — 통과선은 씨앗을 합친 표본의 중앙값으로 판정한다.
  const allEnem = runs.flatMap(r => r.samples.map(s => s.enem));
  const allLab = runs.flatMap(r => r.samples.map(s => s.labels));
  const totKills = runs.reduce((s, r) => s + r.kills, 0);
  const totGrains = runs.reduce((s, r) => s + r.grains, 0);
  const gpk = totKills ? totGrains / totKills : 0;
  const enemP50 = median(allEnem), labP50 = median(allLab);
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = { enem: enemP50 >= 12, label: labP50 >= 3, grains: gpk >= 5 };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 화면 안 적 p50 ${enemP50} ≥ 12 → ${pass.enem ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 화면 안 이름표 p50 ${labP50} ≥ 3 → ${pass.label ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉢ 처치당 알갱이 ${r1(gpk)} ≥ 5 → ${pass.grains ? "통과 ✔" : "미달 ✘"}`);
  log(`  frame p95(최악 씨앗) ${fp95}ms (예산 16.7) · 콘솔 오류 ${totErr}`);
  const all = pass.enem && pass.label && pass.grains;
  log(`  ▶ ${all ? "세 축 다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v192_dense.json", JSON.stringify({ SEC, SEEDS, enemP50, labP50, gpk: r1(gpk), fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      enem: r.enem, label: r.label, items: r.items, rank1: r.rank1, golds: r.golds,
      kills: r.kills, grains: r.grains, grainsPerKill: r.grainsPerKill })) }, null, 1));
  log(`\n(자료 tmp/v192_dense.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
