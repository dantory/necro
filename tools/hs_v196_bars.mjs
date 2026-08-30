/* V-196 「머리 위」의 자. 몹 머리 위 체력바가 몸에서 떠 있고, 바끼리 겹치고, 무리가
 * 같은 그림의 벽이다. hs_v195_hud.mjs 를 본으로, 축을 «머리 위»로 옮긴다.
 *
 *   node tools/hs_v196_bars.mjs [초] [씨앗들]
 *   node tools/hs_v196_bars.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 그린 사각을 그대로 본다 — drawEnemy 가 매 프레임 window.__barRects 에 «실제로 그린»
 *   체력바 사각(월드좌표) + 그 몹의 불투명 위끝(headTop) + anchorBottom(밀어내기 전 바 아래끝)을
 *   남긴다. 자는 그 배열만 읽는다. 자와 그림이 어긋나지 않는다.
 *   ㉠ 바 뜸 = (headTop - anchorBottom) × Z 화면px. 밀어내기 전 «머리에 건» 자리로 재므로
 *     ㉠(머리 앵커)과 ㉡(겹침 밀어내기)이 서로 안 섞인다.
 *   ㉡ 바끼리 겹침 = 동시에 그린 바 사각(밀어낸 뒤) 쌍 중 겹치는 쌍 비율.
 *   ㉢ 무리 단조로움 = 화면 안 적 중 «(base, dir, 색조갈래)» 최빈 조합 비율. dir 은 m.dx,m.dy 로
 *     dirName(sprite.js)을 그대로 다시 적어 계산, 색조갈래는 drawEnemy 가 얹은 m.__tb. */
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
  const A = { lastQ: 0, lastE: 0 }; window.__a196 = A;
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

// window.__barRects(그린 바 사각) 과 화면 안 적을 게임 안 좌표로 걸러 센다.
const SAMPLE = `(() => {
  const cam = window.cam, Z = window.HSZ, G = window.G;
  const VW = window.innerWidth, VH = window.innerHeight;
  const DIRS = ["east","south-east","south","south-west","west","north-west","north","north-east"];
  const dirName = (dx, dy) => DIRS[(((Math.round(Math.atan2(dy, dx) / (Math.PI/4)) % 8) + 8) % 8)];
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  const bars = window.__barRects || [];
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  // ㉠ 바 뜸(화면px) — 각 바의 «머리에 건» 아래끝(anchorBottom)과 불투명 위끝(headTop) 사이.
  const gaps = bars.map(b => (b.headTop - b.anchorBottom) * Z);
  // ㉡ 바끼리 겹침 — 그린 사각 쌍 중 겹치는 쌍.
  let pairs = 0, pov = 0;
  for (let i = 0; i < bars.length; i++) for (let j = i + 1; j < bars.length; j++) { pairs++; if (ov(bars[i], bars[j])) pov++; }
  // ㉢ 무리 단조로움 — 화면 안 적의 (base, dir, 색조갈래) 최빈 조합 비율.
  const combo = {}; let tot = 0;
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) {
    const k = m.base + '|' + dirName(m.dx || 0, m.dy || 1) + '|' + (m.__tb === undefined ? '?' : m.__tb);
    combo[k] = (combo[k] || 0) + 1; tot++;
  }
  let modal = 0; for (const k in combo) if (combo[k] > modal) modal = combo[k];
  const monoShare = tot ? modal / tot : 0;
  // 회귀: 교전중 화면 안 적 수
  let enem = 0;
  for (const pk of G.packs) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) enem++;
  return { nbar: bars.length, gaps, pairs, pov, monoShare: Math.round(monoShare * 1000) / 1000, ntot: tot, enem };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
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
  const t0 = Date.now();
  const samples = [];
  const shotAt = shots ? new Set([20, 60, 120]) : new Set();
  const shotDone = new Set();
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1000);
    const s = await ev(SAMPLE);
    if (s) samples.push({ t: (Date.now() - t0) / 1000, ...s });
    const el = Math.round((Date.now() - t0) / 1000);
    for (const T of shotAt) if (!shotDone.has(T) && el >= T) {
      shotDone.add(T);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v196_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v196_t${T}.png  (바 ${s?.nbar} · 겹침 ${s?.pov}/${s?.pairs} · 단조 ${((s?.monoShare||0)*100).toFixed(0)}% · 적 ${s?.enem})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const gapAll = samples.flatMap(x => x.gaps || []);
  const pairTot = samples.reduce((s, x) => s + x.pairs, 0);
  const povTot = samples.reduce((s, x) => s + x.pov, 0);
  const monoAll = samples.filter(x => x.ntot >= 6).map(x => x.monoShare);
  const enemA = samples.map(x => x.enem);
  const engaged = enemA.filter(v => v >= 1);
  return {
    seed, n: samples.length, framep95,
    gapP50: r1(median(gapAll)), gapP95: r1(p95(gapAll)), gapN: gapAll.length,
    pairs: pairTot, pov: povTot, pairShare: pairTot ? Math.round((povTot / pairTot) * 1000) / 1000 : 0,
    monoP50: Math.round(median(monoAll) * 1000) / 1000, monoN: monoAll.length,
    engP50: median(engaged), engN: engaged.length,
    errs: 0, samples,
  };
}

async function main() {
  log(`■ hs_v196_bars — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 바 뜸 p95 ≤ 6px · ㉡ 바끼리 겹침 ≤ 8% · ㉢ 무리 단조 (전값 재고 확정)`);
  log(`  회귀: 교전중 적 p50 ≥12 · frame p95 ≤16.7ms · 콘솔 오류 0\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n} · 바 ${r.gapN}` +
      ` · ㉠뜸 p50 ${r.gapP50} p95 ${r.gapP95}px · ㉡겹침 ${(r.pairShare * 100).toFixed(1)}%(${r.pov}/${r.pairs})` +
      ` · ㉢단조 p50 ${(r.monoP50 * 100).toFixed(0)}%(표본 ${r.monoN})` +
      ` · 교전중 적 p50 ${r.engP50}(표본 ${r.engN}) · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const gapAll = runs.flatMap(r => r.samples.flatMap(s => s.gaps || []));
  const gapP50 = r1(median(gapAll)), gapP95v = r1(p95(gapAll));
  const pairTot = runs.reduce((s, r) => s + r.pairs, 0);
  const povTot = runs.reduce((s, r) => s + r.pov, 0);
  const pairShare = pairTot ? povTot / pairTot : 0;
  const monoAll = runs.flatMap(r => r.samples.filter(s => s.ntot >= 6).map(s => s.monoShare));
  const monoP50 = median(monoAll);
  const allEng = runs.flatMap(r => r.samples.map(s => s.enem)).filter(v => v >= 1);
  const engP50 = median(allEng);
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = {
    gap: gapP95v <= 6,
    pair: pairShare <= 0.08,
    eng: engP50 >= 12,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 바 뜸 p50 ${gapP50} · p95 ${gapP95v}px ≤ 6 → ${pass.gap ? "통과 ✔" : "미달 ✘"} (바 ${gapAll.length})`);
  log(`  ㉡ 바끼리 겹침 ${(pairShare * 100).toFixed(1)}%(${povTot}/${pairTot}) ≤ 8% → ${pass.pair ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉢ 무리 단조 p50 ${(monoP50 * 100).toFixed(0)}%(표본 ${monoAll.length}) — 전/후 비교값`);
  log(`  (회귀) 교전중 적 p50 ${engP50} ≥ 12 → ${pass.eng ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) frame p95 ${fp95}ms ≤ 16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 콘솔 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "㉠㉡·회귀 다 규격 안 ✅" : "미달 있음 ❌"} (㉢ 은 전/후 비교로 판단)`);

  fs.writeFileSync("tmp/v196_bars.json", JSON.stringify({
    SEC, SEEDS, gapP50, gapP95: gapP95v, gapN: gapAll.length,
    pairShare: Math.round(pairShare * 1000) / 1000, pov: povTot, pairs: pairTot,
    monoP50: Math.round(monoP50 * 1000) / 1000, monoN: monoAll.length,
    engP50, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      gapP50: r.gapP50, gapP95: r.gapP95, gapN: r.gapN, pairShare: r.pairShare, pov: r.pov, pairs: r.pairs,
      monoP50: r.monoP50, monoN: r.monoN, engP50: r.engP50 })),
  }, null, 1));
  log(`\n(자료 tmp/v196_bars.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
