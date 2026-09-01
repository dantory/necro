/* hs/ V-221 자 ①「가운데가 왜 없나」를 죽음마다 뜯어본다 (원인 판별 · 값은 안 민다).
 *
 *   node tools/hs_v221_forensic.mjs [foeDmg] [최대층] [씨앗들]
 *   node tools/hs_v221_forensic.mjs 16 5 1,2,3,4,5   (기본)
 *
 * 왜 (ROADMAP/NOW V-221): V-220 이 「교전층 hp최저에 4~65% 가 통째로 빈다」를 눈으로 봤다 — 멀쩡하거나
 *   죽거나 둘뿐. 값을 밀기 전에 «까닭»을 수로 가른다(cause-written-in-the-item-is-a-guess). main.js 의
 *   __DEATH_FORENSIC 이 죽는 순간 마지막 3초의 타격열(dt·피해·hp%)을 __deathForensic 에 남긴다.
 *   __MEASURE_REVIVE 로 죽어도 이어 걸어 표본을 25 층 셀에서 넉넉히 모은다.
 *
 * 세 가설을 이 수로 가른다:
 *   ① 단발 즉사   → 마무리 타격 하나가 maxhp 의 큰 몫(killFrac 큼) · nHits 작음
 *   ② 연쇄 몰림   → 짧은 창(descentSec 작음)에 여러 대(nHits 큼) · 타격 간격이 촘촘함
 *   ③ hp 곡선     → 중간 상태(hp 10~60%)를 밟는 죽음이 드묾 = 한두 대에 밴드를 건너뜀
 * 실행 가능한 수: 「직전 타격으로부터 0.4초 안에 온 타격」 비율 — 짧은 무적(i-frame)이 끊을 몫.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const FOE_DMG = +(process.argv[2] || 16);
const MAXFLOOR = +(process.argv[3] || 5);
const SEEDS = (process.argv[4] || "1,2,3,4,5").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;
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

const injectSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
globalThis.__FOE_DMG = ${FOE_DMG};
globalThis.__RANGED_MOB = true;
globalThis.__MEASURE_REVIVE = true;
globalThis.__DEATH_FORENSIC = true;`;

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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a221 = A;
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

const SAMPLE = `(() => { const G = window.G, p = G.player;
  return { floor: G.floor, hpPct: Math.round(100 * p.hp / p.maxhp) }; })()`;

async function runOne(seed) {
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
  await ev(`window.__deathForensic = []; window.__hitRing = []; Object.assign(window.__hsMetric, { deaths:0, kills:0 });`);

  let curFloor = 0;
  const startAll = Date.now();
  let floorStart = Date.now();
  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    if (s.floor !== curFloor) { curFloor = s.floor; floorStart = Date.now(); if (curFloor > MAXFLOOR) break; }
    if (Date.now() - floorStart > FLOORCAP * 1000) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (Date.now() - startAll > FLOORCAP * (MAXFLOOR + 1) * 1000) break;
  }
  const forensic = JSON.parse(await ev(`JSON.stringify(window.__deathForensic || [])`) || "[]");
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return { seed, deaths: forensic };
}

log(`\n■ hs_v221_forensic — 곱 ${FOE_DMG} · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")} · 죽음마다 마지막 3초 타격열`);
log(`  가르는 것: 단발 즉사(killFrac) · 연쇄 몰림(nHits·간격) · hp곡선(밴드 밟음) → i-frame 이 끊을 몫\n`);

const allDeaths = [];
for (const seed of SEEDS) {
  errs = [];
  const r = await runOne(seed);
  if (!r) continue;
  for (const d of r.deaths) allDeaths.push({ ...d, seed });
  log(`  씨앗 ${seed}: 죽음 ${r.deaths.length} · 오류 ${errs.length}`);
}
if (!allDeaths.length) { log("죽음 표본 없음 — 곱/봇 확인"); bws.close(); process.exit(3); }

// 죽음마다 파생값 — hits 는 시간순(오래된 것 먼저, 마지막이 마무리 타격 dt≈0).
const per = allDeaths.map((d) => {
  const h = d.hits;
  const nHits = h.length;
  const killFrac = nHits ? h[nHits - 1].fracMax : 0;
  const maxFrac = h.reduce((a, x) => Math.max(a, x.fracMax), 0);
  const descentSec = nHits ? h[0].dt : 0;   // 가장 오래된 타격의 dt = 만생명→죽음 하강 길이(링은 부활마다 비움).
  const visitedBand = h.some((x) => x.hpAfterPct >= 10 && x.hpAfterPct < 60);   // 중간 상태를 밟았나.
  const finishGap = nHits >= 2 ? +(h[nHits - 2].dt - h[nHits - 1].dt).toFixed(3) : null;   // 마무리 직전 타격과의 간격.
  return { ...d, nHits, killFrac, maxFrac, descentSec, visitedBand, finishGap };
});

// 타격 사이 간격 전부 모은다(연쇄 촘촘함 · i-frame 이 끊을 몫).
const gaps = [];
for (const d of allDeaths) { const h = d.hits;
  for (let i = 1; i < h.length; i++) gaps.push(+(h[i - 1].dt - h[i].dt).toFixed(3)); }

const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (n, d) => d ? Math.round(1000 * n / d) / 10 : 0;
const hist = (a, edges) => { const c = edges.map(() => 0); for (const v of a) { let k = edges.length - 1;
  for (let i = 0; i < edges.length; i++) if (v < edges[i]) { k = i; break; } c[k]++; } return c; };

const N = per.length;
const nHitsArr = per.map((p) => p.nHits);
const killFracArr = per.map((p) => p.killFrac);
const descentArr = per.map((p) => p.descentSec);
const singleShot = per.filter((p) => p.nHits <= 2 && p.killFrac >= 0.5).length;
const chain = per.filter((p) => p.nHits >= 4 && p.descentSec <= 0.6).length;
const bandVisited = per.filter((p) => p.visitedBand).length;
const gapsUnder = gaps.filter((g) => g <= 0.4).length;

log(`\n▣ 죽음 표본 ${N} (씨앗 ${SEEDS.length} · 곱 ${FOE_DMG})`);
log(`  타격수/죽음      : 중앙 ${med(nHitsArr)} · 평균 ${(nHitsArr.reduce((a, b) => a + b, 0) / N).toFixed(1)} · 최대 ${Math.max(...nHitsArr)}`);
log(`    분포 [1 · 2 · 3 · 4~6 · 7+]: ${hist(nHitsArr, [2, 3, 4, 7]).join(" · ")}`);
log(`  마무리 타격 몫   : 중앙 ${med(killFracArr)} (maxhp 대비) · killFrac≥0.5(단발급) ${pct(killFracArr.filter((x) => x >= 0.5).length, N)}%`);
log(`    분포 [<.15 · .15~.3 · .3~.5 · .5~.8 · ≥.8]: ${hist(killFracArr, [0.15, 0.3, 0.5, 0.8]).join(" · ")}`);
log(`  하강 길이(만생명→죽음): 중앙 ${med(descentArr)}s · ≤0.6s ${pct(descentArr.filter((x) => x <= 0.6).length, N)}%`);
log(`  중간 상태(hp 10~60%) 밟은 죽음: ${pct(bandVisited, N)}%   [낮을수록 ③ hp곡선이 밴드를 건너뜀]`);
log("");
log(`  ① 단발 즉사형 (≤2 대 · 마무리 ≥50%maxhp): ${pct(singleShot, N)}%`);
log(`  ② 연쇄 몰림형 (≥4 대 · ≤0.6s 안)        : ${pct(chain, N)}%`);
log("");
log(`  타격 간격 표본 ${gaps.length} · 중앙 ${med(gaps)}s`);
log(`    ≤0.4s 안에 온 타격(i-frame 이 끊을 몫): ${pct(gapsUnder, gaps.length)}%`);
log(`    분포 [<.15 · .15~.3 · .3~.5 · .5~1 · ≥1]: ${hist(gaps, [0.15, 0.3, 0.5, 1]).join(" · ")}`);

// 층별 maxhp — ③ 가설(층 깊이로 hp 가 커져 밴드가 순식간에 지나가는가).
const byFloor = {};
for (const d of allDeaths) (byFloor[d.floor] ||= []).push(d.maxhp);
log(`\n  층별 maxhp(죽은 표본 · 중앙): ${Object.keys(byFloor).sort((a, b) => a - b).map((f) => `B${f}:${med(byFloor[f])}`).join(" · ")}`);

fs.writeFileSync(`tmp/hs_v221_forensic_m${FOE_DMG}.json`, JSON.stringify({
  foeDmg: FOE_DMG, seeds: SEEDS, N, nHitsMed: med(nHitsArr), killFracMed: med(killFracArr),
  descentMed: med(descentArr), bandVisitedPct: pct(bandVisited, N), singleShotPct: pct(singleShot, N),
  chainPct: pct(chain, N), gapUnder04Pct: pct(gapsUnder, gaps.length), gapMed: med(gaps),
  per, gaps }, null, 2));
log(`\n  ▸ tmp/hs_v221_forensic_m${FOE_DMG}.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
