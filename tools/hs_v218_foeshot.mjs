/* V-218 「적 발사체 foeShots 가 아직 fillRect 주황 막대다」의 자. hs_v217_gold.mjs 를 본으로.
 *
 *   node tools/hs_v218_foeshot.mjs [초] [씨앗들]
 *   V218TAG=before V218_ASSET=0 node tools/hs_v218_foeshot.mjs 60 1   (고치기 전 — 옛 막대 강제)
 *   V218TAG=after                node tools/hs_v218_foeshot.mjs 60 1   (고친 뒤 — 에셋)
 *
 * ★ __FOESHOT_ASSET 손잡이(main.js drawWorld)로 전/후를 같은 코드에서 재현한다:
 *   V218_ASSET=0 이면 옛 fillRect 막대 폴백을 강제한다(= 고치기 전 그림 그대로).
 *   비우면 구운 에셋(assets/fx/foeshot.png)을 그린다(= 고친 뒤).
 * ★ main.js 가 관찰 계기를 남긴다(로직/연출 불변):
 *   window.__foeShotDraw {asset,bar,n,imw}  매 프레임 그린 수 · 에셋폭(로드확인)
 *   window.__foeShotRects                     매 프레임 화면사각
 *   METRIC.foeShot/foeHit                      쏜 화살 수 · 사람에게 맞힌 수(회귀: 전후 동일)
 * 눈금:
 *   ㉠ fillRect 로 그려진 발사체 수 → 0 (고친 뒤).
 *   ㉡ 화살이 화면에 있을 때 에셋이 로드·그려졌는가 → 100% (imw>0 · asset==그린수).
 *   ㉢ 회귀: 명중 판정(foeHit) 이 전후 같은 수 · 프레임 p95 ≤16.7ms · 콘솔오류 0.
 * ★ 관측 0(쏜 화살 0)을 통과로 읽지 않는다 — foeShot 표본 수를 함께 찍고 ≥30 을 요구한다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 60);
const SEEDS = (process.argv[3] || "1").split(",").map((s) => +s);
const TAG = process.env.V218TAG || "after";
const ASSET_ON = process.env.V218_ASSET !== "0";
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
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__RANGED_MOB = true;
globalThis.__FOESHOT_ASSET = ${ASSET_ON};`;

// ★ 약한 빌드 — 강빌드(str20·spear10)는 무리를 즉살해 원거리 몹이 재장전 전에 죽어 화살이 14발뿐이었다.
//   약하게 잡아 교전을 길게 끌어 원거리 몹이 반복해 쏘게 한다(그림만 재는 자라 밸런스와 무관).
const DEATH = { attr: { str: 3 }, skill: { spear: 2, nova: 0, curse: 0 }, grade: 0 };

// 자동조종 — 뼈창(q)으로 무리에 붙어 싸우게 한다(hs_v217_gold 의 AUTO 를 그대로 · 원거리 몹이 사람을 쏘게).
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

// 화면 안 화살 수 · 이번 프레임에 에셋/막대로 그린 수 · 에셋 로드폭.
const SAMPLE = `(() => {
  const G = window.G;
  const cam = window.cam, Z = window.HSZ;
  const VW = window.innerWidth, VH = window.innerHeight;
  const onScreen = (x, y) => { const sx = (x - cam.x) * Z, sy = (y - cam.y) * Z; return sx >= 0 && sx <= VW && sy >= 0 && sy <= VH; };
  let onS = 0;
  for (const sh of (G.foeShots || [])) if (onScreen(sh.x, sh.y)) onS++;
  const d = window.__foeShotDraw || { asset: 0, bar: 0, n: 0, imw: 0 };
  return { onS, total: (G.foeShots || []).length, asset: d.asset, bar: d.bar, n: d.n, imw: d.imw };
})()`;

const sum = a => a.reduce((s, v) => s + v, 0);
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
  const onCounts = [], drawAsset = [], drawBar = [], drawN = [];
  let imwSeen = 0, framesWithShots = 0, shotCap = false;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(400);
    const s = await ev(SAMPLE);
    if (s) {
      onCounts.push(s.onS);
      if (s.n > 0) { framesWithShots++; drawAsset.push(s.asset); drawBar.push(s.bar); drawN.push(s.n); }
      imwSeen = Math.max(imwSeen, s.imw || 0);
    }
    // ★ 컷은 «화살이 화면에 있는 순간»에만 뜬다 — 없는 컷은 증거가 아니다.
    if (shot && !shotCap && s && s.onS >= 1 && (Date.now() - t0) > 6000) {
      shotCap = true;
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/hs_v218_${TAG}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/hs_v218_${TAG}.png  (화면화살 ${s.onS} · 에셋그림 ${s.asset} · 막대그림 ${s.bar} · 에셋폭 ${s.imw})`);
    }
  }
  const foeShot = await ev(`(window.__hsMetric && window.__hsMetric.foeShot) || 0`);
  const foeHit = await ev(`(window.__hsMetric && window.__hsMetric.foeHit) || 0`);
  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  return { seed, n: onCounts.length, onCounts,
    asset: sum(drawAsset), bar: sum(drawBar), drawn: sum(drawN), framesWithShots, imwSeen,
    foeShot, foeHit, framep95 };
}

async function main() {
  log(`■ hs_v218_foeshot — 죽음형 · ${TAG}(에셋 ${ASSET_ON ? "켬" : "끔=옛 막대"}) · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  통과선: ㉠ 막대그림 0(에셋일 때) · ㉡ 화살 있을 때 에셋 100%(imw>0·asset==drawn)`);
  log(`  회귀: foeHit 표기(전후 동일) · frame p95 ≤16.7ms · 콘솔 오류 0 · foeShot 표본 ≥30\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const r = await runOne(SEEDS[i], i === 0);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: 표본 ${r.n}` +
      ` · 화면화살 중앙 ${median(r.onCounts)}·p95 ${p95(r.onCounts)}(최대 ${Math.max(0, ...r.onCounts)})` +
      ` · 그린수 ${r.drawn}(에셋 ${r.asset}·막대 ${r.bar})` +
      ` · 에셋폭 ${r.imwSeen}` +
      ` · 쏜화살 ${r.foeShot}·맞힘 ${r.foeHit}` +
      ` · frame p95 ${r1(r.framep95)}ms · 오류 ${r.errs}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const asset = sum(runs.map(r => r.asset));
  const bar = sum(runs.map(r => r.bar));
  const drawn = sum(runs.map(r => r.drawn));
  const foeShot = sum(runs.map(r => r.foeShot));
  const foeHit = sum(runs.map(r => r.foeHit));
  const imwSeen = Math.max(...runs.map(r => r.imwSeen));
  const fp95 = r1(Math.max(...runs.map(r => r.framep95)));
  const totErr = sum(runs.map(r => r.errs));
  const assetPct = drawn > 0 ? r1(asset / drawn * 100) : 0;

  const pass = {
    barZero: !ASSET_ON || bar === 0,
    assetFull: !ASSET_ON || (imwSeen > 0 && assetPct === 100),
    obs: foeShot >= 30,
    frame: fp95 <= 16.7,
    err: totErr === 0,
  };
  log(`\n▣ 통과선 판정 (씨앗 합산 · ${TAG})`);
  log(`  ㉠ 막대그림 ${bar} (에셋일 때 0 이어야) → ${pass.barZero ? "통과 ✔" : "미달 ✘"}`);
  log(`  ㉡ 에셋폭 ${imwSeen}px · 그린수 ${drawn} 중 에셋 ${asset}(${assetPct}%) → ${pass.assetFull ? "통과 ✔" : (ASSET_ON ? "미달 ✘" : "해당없음(옛막대)")}`);
  log(`  ㉢ (회귀) 쏜화살 ${foeShot}·맞힘 ${foeHit} · frame p95 ${fp95}ms ≤16.7 → ${pass.frame ? "통과 ✔" : "미달 ✘"} · 오류 ${totErr} → ${pass.err ? "통과 ✔" : "미달 ✘"}`);
  log(`  (분모) 쏜화살 표본 ${foeShot} ≥30 → ${pass.obs ? "통과 ✔" : "미달 ✘ — 관측 0 을 통과로 읽지 말 것"}`);
  const all = Object.values(pass).every(Boolean);
  log(`  ▶ ${all ? "다 규격 안 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync(`tmp/v218_foeshot_${TAG}.json`, JSON.stringify({
    TAG, ASSET_ON, SEC, SEEDS, asset, bar, drawn, assetPct, imwSeen, foeShot, foeHit, fp95, totErr, pass, all,
    runs: runs.map(r => ({ seed: r.seed, n: r.n, onMed: median(r.onCounts), onP95: p95(r.onCounts),
      asset: r.asset, bar: r.bar, drawn: r.drawn, imwSeen: r.imwSeen,
      foeShot: r.foeShot, foeHit: r.foeHit, framep95: r.framep95, errs: r.errs })),
  }, null, 1));
  log(`\n(자료 tmp/v218_foeshot_${TAG}.json)`);
  return all;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
