/* hs/ V-203 자 — 「어느 팔이 긴장을 만드는가」를 잰다.
 *
 *   node tools/hs_v203_arms.mjs [off|reach|ranged|charger] [최대층] [씨앗들]
 *   node tools/hs_v203_arms.mjs off                 (기본 — 지금 판 · 손잡이 다 꺼짐)
 *   node tools/hs_v203_arms.mjs ranged 5 1,2,3,4,5
 *
 * 왜 (ROADMAP V-203): V-202b 가 밸런스에 천장을 세웠지만 위험 지표가 0/0 이다 — hp 최저 98~100%.
 *   소환수 벽 뒤에 서 있기만 하면 죽을 일이 없다. 「벽을 느끼고 넘는다」(병수님 8-30)를 만들 팔은
 *   셋인데 취향이 갈린다. 그래서 하나를 골라 넣지 않고 «세 팔을 각각 켜서 재» 표로 내놓는다.
 *
 * 이 자는 V-202b 의 자(tools/hs_v202b_shape.mjs)와 같은 봇·같은 표본을 쓰되 둘만 더한다:
 *   ① 사람이 실제로 맞은 횟수/초 (window.__hsMetric.hitN — hurtPlayer 가 센다)
 *   ② hp 가 50% 밑으로 내려간 «층» 비율 · 그 층에서 죽은 «층» 비율
 * 그리고 팔별로 사람이 위험해진 순간의 컷을 한 장 남긴다(tmp/hs_v203_{reach,ranged,charger}.png).
 *
 * ★ 팔은 globalThis 손잡이로 켠다(기본값 꺼짐). off 는 아무 손잡이도 안 켠다 —
 *   off 행이 V-202b 값과 같아야 「판이 한 톨도 안 달라졌다」의 증거다([[silent-zero-is-not-an-observation]]).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const ARM = ["off", "reach", "ranged", "charger"].includes(process.argv[2]) ? process.argv[2] : "off";
const FLAG = { reach: "__ENEMY_REACH", ranged: "__RANGED_MOB", charger: "__CHARGER_MOB" }[ARM];
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

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const MINION = { attr: { int: 20, vit: 10, str: 10 }, skill: { slot: 8, grade: 2, mdmg: 10, mhp: 8, spear: 5 }, grade: 2 };

// 봇은 V-202b 와 같다 — 소환형 빌드로 자동조종한다(시체로 해골, 바닥 방울 줍기, clear 하면 계단 F).
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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a203 = A;
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

// 한 표본 — V-202b 와 같은 값에 hitN·deaths 를 더한다(위험을 «수»로 잡는다).
const SAMPLE = `(() => {
  const G = window.G, p = G.player, T = window.SKEL_TIERS, M = window.__hsMetric;
  let enem = 0, spawned = 0;
  for (const pk of G.packs) { spawned += pk.enemies.length; if (pk.awake) for (const m of pk.enemies) if (m.alive) enem++; }
  let used = 0; for (const m of G.minions) used += m.slot;
  const spearDmg = Math.round(42 * p.dmgMul * p.spearMul);
  const tier = Math.min(p.maxGrade, T.length - 1);
  const minionDmg = Math.round((34 + G.floor * 10) * T[tier].dmgMul * p.minionMul);
  return { floor: G.floor, level: p.level, kills: M.kills, spawned,
    enem, minions: G.minions.length, used,
    spearDmg, minionDmg, hpPct: Math.round(100 * p.hp / p.maxhp),
    hitN: M.hitN || 0, deaths: M.deaths || 0, foeShots: (G.foeShots || []).length };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed, shots) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  if (FLAG) await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.${FLAG} = true;` });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await sleep(700);
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0, grains:0, hitN:0 })`);

  const floors = {};
  let cur = null, curFloor = 0, floorStart = Date.now(), prevHp = 100;
  const startAll = Date.now();
  let dangerShot = false;

  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    if (s.floor !== curFloor) {
      if (cur) { cur.killEnd = s.kills; cur.t1 = Date.now(); cur.hitEnd = s.hitN; cur.deathEnd = s.deaths; }
      curFloor = s.floor;
      floorStart = Date.now();
      cur = floors[curFloor] = { floor: curFloor, samples: [], killStart: s.kills, hitStart: s.hitN, deathStart: s.deaths, t0: Date.now() };
      prevHp = s.hpPct;
      if (curFloor > MAXFLOOR) break;
    }
    cur.samples.push(s);
    prevHp = s.hpPct;

    // 컷 — 팔이 켜졌을 때, 사람이 처음 위험해진 순간(맞았거나 hp<90)을 한 장 남긴다.
    if (FLAG && !dangerShot && (s.hitN > 0 || s.hpPct < 90) && Date.now() - floorStart > 1500) {
      dangerShot = true;
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/hs_v203_${ARM}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/hs_v203_${ARM}.png  (층 ${s.floor} · hp ${s.hpPct}% · 맞은수 ${s.hitN} · 화살 ${s.foeShots})`);
    }

    if (Date.now() - floorStart > FLOORCAP * 1000) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (Date.now() - startAll > FLOORCAP * (MAXFLOOR + 1) * 1000) break;
  }
  if (cur && cur.killEnd == null) { const s = await ev(SAMPLE); if (s) { cur.killEnd = s.kills; cur.t1 = Date.now(); cur.hitEnd = s.hitN; cur.deathEnd = s.deaths; } }
  // 팔이 켜졌는데 아직 위험 컷을 못 잡았으면(reach 가 벽에 다 막힌 경우) 대표 교전 컷이라도 남긴다.
  if (FLAG && !dangerShot) {
    const r = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`tmp/hs_v203_${ARM}.png`, Buffer.from(r.data, "base64"));
    log(`  컷 tmp/hs_v203_${ARM}.png  (위험 순간 없음 — 대표 교전 컷)`);
  }
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const out = [];
  for (const f of Object.keys(floors).map(Number).sort((a, b) => a - b)) {
    if (f > MAXFLOOR) continue;
    const F = floors[f]; const S2 = F.samples;
    if (!S2.length) continue;
    const hpA = S2.map(x => x.hpPct);
    out.push({
      floor: f,
      spawned: Math.max(...S2.map(x => x.spawned)),
      kills: (F.killEnd ?? S2[S2.length - 1].kills) - F.killStart,
      sec: r1(((F.t1 ?? Date.now()) - F.t0) / 1000),
      hitN: (F.hitEnd ?? S2[S2.length - 1].hitN) - F.hitStart,
      died: ((F.deathEnd ?? S2[S2.length - 1].deaths) - F.deathStart) > 0 ? 1 : 0,
      hpMin: Math.min(...hpA),
      foeShotMax: Math.max(...S2.map(x => x.foeShots || 0)),
    });
  }
  return { seed, floors: out };
}

log(`\n■ hs_v203_arms — 팔 «${ARM}»${FLAG ? ` (globalThis.${FLAG}=true)` : " (손잡이 다 꺼짐)"} · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")}`);
log(`  재는 것: 맞은 횟수/초 · hp 최저 · hp<50% 층 비율 · 죽은 층 비율 · 층당 처치 · 완주 시간\n`);
const runs = [];
for (let i = 0; i < SEEDS.length; i++) {
  errs = [];
  const r = await runOne(SEEDS[i], i === 0);
  if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
  r.errs = errs.length; runs.push(r);
  for (const F of r.floors)
    log(`  씨앗 ${r.seed} 층${F.floor}: 놓인적 ${F.spawned} · ${F.sec}s간 처치 ${F.kills} · hp최저 ${F.hpMin}% · ` +
      `맞은수 ${F.hitN}${F.died ? " · 죽음" : ""}${F.foeShotMax ? ` · 화살max ${F.foeShotMax}` : ""}`);
  log(`    (오류 ${r.errs})`);
}
if (!runs.length) { log("판 없음"); bws.close(); process.exit(3); }

// 팔 하나의 표 한 줄 — 층을 씨앗 너머로 다 모아 낸다.
const allF = [];
for (const r of runs) for (const F of r.floors) allF.push(F);
const nF = allF.length;
const totHit = allF.reduce((s, x) => s + x.hitN, 0);
const totSec = allF.reduce((s, x) => s + x.sec, 0);
const hitsPerSec = totSec ? r1(totHit / totSec) : 0;
const hpMinMed = median(allF.map(x => x.hpMin));
const dip50Ratio = Math.round(100 * allF.filter(x => x.hpMin < 50).length / nF);
const diedRatio = Math.round(100 * allF.filter(x => x.died).length / nF);
const killsMed = median(allF.map(x => x.kills));
const clearSec = r1(totSec / SEEDS.length);
const totErr = runs.reduce((s, r) => s + r.errs, 0);

const row = { arm: ARM, flag: FLAG || null, floors: nF, hitsPerSec, hpMinMed, dip50Ratio, diedRatio, killsMed, clearSec, errs: totErr };
log(`\n▣ 팔 «${ARM}» 한 줄:`);
log(`  맞은수/초 ${hitsPerSec} · hp최저(중앙) ${hpMinMed}% · hp<50% 층 ${dip50Ratio}% · 죽은 층 ${diedRatio}% · ` +
  `층당 처치(중앙) ${killsMed} · 완주 ${clearSec}s · 오류 ${totErr}`);
fs.writeFileSync(`tmp/hs_v203_${ARM}.json`, JSON.stringify({ row, runs }, null, 2));
log(`  ▸ tmp/hs_v203_${ARM}.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
