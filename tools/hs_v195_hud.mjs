/* V-195 「화면 아래」의 자. 밀도 축은 닫혔다 — 축을 «보이는 것»(떠오르는 글자·하단 UI)으로 옮긴다.
 * 감시가 tmp/v194_t60.png 를 눈으로 세어 적은 결함 넷을 게임 안 좌표로 다시 잰다(그림 짐작 금지).
 *
 *   node tools/hs_v195_hud.mjs [초] [씨앗들]
 *   node tools/hs_v195_hud.mjs 120 1,2     (기본 — 통과선이 요구하는 120초×씨앗 둘)
 *
 * ★ 그린 사각을 그대로 본다 — drawFloats 가 매 프레임 window.__floatRects 에 «실제로 그린»
 *   사각(x0,y0,x1,y1)을 남긴다. 자는 그 배열만 읽는다. 고치기 전이든 후든 «화면에 찍힌 것»을
 *   재므로 자와 그림이 어긋나지 않는다. 하단 UI 띠는 #bl(스킬바 기둥)·#hint(도움말) 의
 *   getBoundingClientRect 합집합 — 게임과 자가 같은 두 사각을 본다.
 * ★ 자동조종은 v192 의 죽음형을 그대로 쓴다 — 재기 판을 바꾸지 않는다. */
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
  const A = { lastQ: 0, lastE: 0 }; window.__a195 = A;
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

// 그린 사각(window.__floatRects) + 하단 UI 띠(#bl∪#hint) 를 게임 안 좌표로 걸러 센다.
const SAMPLE = `(() => {
  const cam = window.cam, Z = window.HSZ;
  const VW = window.innerWidth, VH = window.innerHeight;
  const rects = window.__floatRects || [];
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  // 하단 UI 예약 띠 = #bl(스킬바 기둥) ∪ #hint(도움말) 의 그린 사각
  let band = null;
  for (const id of ['bl','hint']) { const e = document.getElementById(id); if (!e) continue;
    const r = e.getBoundingClientRect(); if (!(r.width && r.height)) continue;
    const b = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    band = band ? { x0: Math.min(band.x0, b.x0), y0: Math.min(band.y0, b.y0), x1: Math.max(band.x1, b.x1), y1: Math.max(band.y1, b.y1) } : b; }
  // ㉠ 잘린 글자 — 사각이 캔버스 경계를 넘는 것(여백 0.5 로 반올림 오차 흡수)
  let cut = 0;
  for (const r of rects) if (r.x0 < -0.5 || r.x1 > VW + 0.5 || r.y0 < -0.5 || r.y1 > VH + 0.5) cut++;
  // ㉡ 하단 UI 겹침 — 이 표본에서 글자 사각이 띠와 겹치면 1
  let bandHit = 0;
  if (band) for (const r of rects) if (ov(r, band)) { bandHit = 1; break; }
  // ㉢ 글자끼리 겹침 — 동시에 뜬 사각 쌍 중 겹치는 쌍
  let pairs = 0, pov = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { pairs++; if (ov(rects[i], rects[j])) pov++; }
  // ㉣ 소수점 노출 — 장비/스탯 줄에 «네 자리 이상 정수 + 소수점» 이 있으면 1 (2403409.25 꼴 날것)
  const statLines = ['mult','enh','gear','army','slots'].map(id => { const e = document.getElementById(id); return e ? e.textContent : ''; }).join(' | ');
  const decM = statLines.match(/\\d{4,}\\.\\d/);
  const dec = decM ? 1 : 0;
  const decSample = dec ? (statLines.match(/[×xX]?\\s?\\d{4,}\\.\\d+/) || [''])[0] : '';
  // 회귀: 교전중 화면 안 적 수
  const G = window.G;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let enem = 0;
  for (const pk of G.packs) for (const m of pk.enemies) if (m.alive && onScreen(m.x, m.y)) enem++;
  return { nfloat: rects.length, cut, bandHit, pairs, pov, dec, decSample, enem, band: band ? [Math.round(band.x0), Math.round(band.y0), Math.round(band.x1), Math.round(band.y1)] : null };
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
      fs.writeFileSync(`tmp/v195_t${T}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/v195_t${T}.png  (글자 ${s?.nfloat} · 잘림 ${s?.cut} · 띠겹침 ${s?.bandHit} · 쌍겹침 ${s?.pov}/${s?.pairs})`);
    }
  }
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const cutTot = samples.reduce((s, x) => s + x.cut, 0);
  const bandShare = samples.length ? samples.filter(x => x.bandHit).length / samples.length : 0;
  const pairTot = samples.reduce((s, x) => s + x.pairs, 0);
  const povTot = samples.reduce((s, x) => s + x.pov, 0);
  const decEver = samples.some(x => x.dec) ? 1 : 0;
  const decSample = (samples.find(x => x.dec) || {}).decSample || "";
  const enemA = samples.map(x => x.enem);
  const engaged = enemA.filter(v => v >= 1);
  const band = (samples.find(x => x.band) || {}).band || null;
  return {
    seed, n: samples.length, framep95,
    cut: cutTot, bandShare: Math.round(bandShare * 1000) / 1000,
    pairs: pairTot, pov: povTot, pairShare: pairTot ? Math.round((povTot / pairTot) * 1000) / 1000 : 0,
    dec: decEver, decSample,
    engP50: median(engaged), engN: engaged.length, enemP50: median(enemA),
    band, errs: 0, samples,
  };
}

async function main() {
  log(`■ hs_v195_hud — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠잘린 글자 0 · ㉡하단 UI 겹침 0% · ㉢글자끼리 겹침 ≤10% · ㉣소수점 노출 0`);
  log(`  회귀: 교전중 적 p50 ≥12 · frame p95 ≤16.7ms · 콘솔 오류 0\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n} · 띠 ${r.band ? r.band.join(",") : "?"}` +
      ` · ㉠잘림 ${r.cut} · ㉡띠겹침 ${(r.bandShare * 100).toFixed(1)}% · ㉢쌍겹침 ${(r.pairShare * 100).toFixed(1)}%(${r.pov}/${r.pairs})` +
      ` · ㉣소수점 ${r.dec}${r.decSample ? " «" + r.decSample + "»" : ""}` +
      ` · 교전중 적 p50 ${r.engP50}(표본 ${r.engN}) · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  // 씨앗 합산 판정
  const cutTot = runs.reduce((s, r) => s + r.cut, 0);
  const allBand = runs.flatMap(r => r.samples.map(s => (s.bandHit ? 1 : 0)));
  const bandShare = allBand.length ? allBand.reduce((s, x) => s + x, 0) / allBand.length : 0;
  const pairTot = runs.reduce((s, r) => s + r.pairs, 0);
  const povTot = runs.reduce((s, r) => s + r.pov, 0);
  const pairShare = pairTot ? povTot / pairTot : 0;
  const decEver = runs.some(r => r.dec) ? 1 : 0;
  const decSample = (runs.find(r => r.decSample) || {}).decSample || "";
  const allEng = runs.flatMap(r => r.samples.map(s => s.enem)).filter(v => v >= 1);
  const engP50 = median(allEng);
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);

  const pass = {
    cut: cutTot === 0,
    band: bandShare === 0,
    pair: pairShare <= 0.10,
    dec: decEver === 0,
    eng: engP50 >= 12,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산)`);
  log(`  ㉠ 잘린 글자 ${cutTot} = 0 → ${pass.cut ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 하단 UI 겹침 ${(bandShare * 100).toFixed(1)}% = 0% → ${pass.band ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉢ 글자끼리 겹침 ${(pairShare * 100).toFixed(1)}%(${povTot}/${pairTot}) ≤ 10% → ${pass.pair ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉣ 소수점 노출 ${decEver}${decSample ? " «" + decSample + "»" : ""} = 0 → ${pass.dec ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) 교전중 적 p50 ${engP50} ≥ 12 → ${pass.eng ? "통과 ✔" : "미달 ✘"}`);
  log(`  (회귀) frame p95 ${fp95}ms ≤ 16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 콘솔 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v195_hud.json", JSON.stringify({
    SEC, SEEDS, cut: cutTot, bandShare: Math.round(bandShare * 1000) / 1000,
    pairShare: Math.round(pairShare * 1000) / 1000, pov: povTot, pairs: pairTot,
    dec: decEver, decSample, engP50, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, framep95: r.framep95, errs: r.errs,
      cut: r.cut, bandShare: r.bandShare, pairShare: r.pairShare, pov: r.pov, pairs: r.pairs,
      dec: r.dec, decSample: r.decSample, engP50: r.engP50, enemP50: r.enemP50, band: r.band })),
  }, null, 1));
  log(`\n(자료 tmp/v195_hud.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
