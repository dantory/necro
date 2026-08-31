/* V-205 ㉢ 결정성 자 — «같은 씨앗을 두 번 돌리면 층별 지표가 같은가».
 *
 *   node tools/hs_v205_determinism.mjs [mul] [최대층] [씨앗들]
 *   node tools/hs_v205_determinism.mjs 16 3 1,2,3   → 곱16·층1~3·씨앗 1,2,3 을 각각 2회
 *
 * 왜: V-203b 스윕이 씨앗을 고정해도 판이 갈렸다. 원천은 벽시계 dt(hs/main.js:2265)라
 *   짚었고, ㉠ 이 __FIXED_DT 로 dt 를 고정했다. 이 자가 그 고침이 «실제로» 결정적인지 잰다 —
 *   같은 씨앗 2회의 층별 kills·hitN·hpMin·died 가 일치하면 합격. 안 맞으면 남은 비결정
 *   원천을 그대로 적는다(대충 비슷은 불합격). __FIXED_DT 는 hs_v203b 와 같은 1/60 을 쓴다.
 *
 * 봇·자·표본은 hs_v203b 와 같다(ruler 만 게임시간). 스크린샷·끝조건 판정은 뺐다 — 여기선
 *   «두 판이 같은가»만 본다.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const MUL = +(process.argv[2] ?? 16);
const MAXFLOOR = +(process.argv[3] || 3);
const SEEDS = (process.argv[4] || "1,2,3").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;
const FIXED_DT = 1 / 60;
const WALL_SAFETY = 3;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (WALL_SAFETY * FLOORCAP * (MAXFLOOR + 1) * SEEDS.length * 2 + 1200) * 1000);

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
    const now = window.__gameSec ? window.__gameSec() * 1000 : performance.now();
    if (now - A.lastQ > 380) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 700) { A.lastE = now; tap('e'); }
    if (now - A.lastPt > 500) { A.lastPt = now; tap('z'); tap('x'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

const SAMPLE = `(() => {
  const G = window.G, p = G.player, M = window.__hsMetric;
  let spawned = 0; for (const pk of G.packs) spawned += pk.enemies.length;
  return { floor: G.floor, kills: M.kills, spawned,
    hpPct: Math.round(100 * p.hp / p.maxhp),
    hitN: M.hitN || 0, deaths: M.deaths || 0,
    gsec: (window.__gameSec ? window.__gameSec() : 0) };
})()`;

const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__RANGED_MOB = true; globalThis.__FOE_DMG = ${MUL};` });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__FIXED_DT = ${FIXED_DT};` });
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
  let cur = null, curFloor = 0, floorStartG = 0, startG = null;
  const wallStart = Date.now();

  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    if (startG == null) startG = s.gsec;
    if (s.floor !== curFloor) {
      if (cur) { cur.killEnd = s.kills; cur.t1 = s.gsec; cur.hitEnd = s.hitN; cur.deathEnd = s.deaths; }
      curFloor = s.floor;
      floorStartG = s.gsec;
      cur = floors[curFloor] = { floor: curFloor, samples: [], killStart: s.kills, hitStart: s.hitN, deathStart: s.deaths, t0: s.gsec };
      if (curFloor > MAXFLOOR) break;
    }
    cur.samples.push(s);

    if (s.gsec - floorStartG > FLOORCAP) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (s.gsec - startG > FLOORCAP * (MAXFLOOR + 1)) break;
    if (Date.now() - wallStart > WALL_SAFETY * FLOORCAP * (MAXFLOOR + 1) * 1000) { errs.push(`WALL_SAFETY abort seed=${seed}`); break; }
  }
  if (cur && cur.killEnd == null) { const s = await ev(SAMPLE); if (s) { cur.killEnd = s.kills; cur.t1 = s.gsec; cur.hitEnd = s.hitN; cur.deathEnd = s.deaths; } }
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  const out = [];
  for (const f of Object.keys(floors).map(Number).sort((a, b) => a - b)) {
    if (f > MAXFLOOR) continue;
    const F = floors[f]; const S2 = F.samples;
    if (!S2.length) continue;
    out.push({
      floor: f,
      kills: (F.killEnd ?? S2[S2.length - 1].kills) - F.killStart,
      hitN: (F.hitEnd ?? S2[S2.length - 1].hitN) - F.hitStart,
      died: ((F.deathEnd ?? S2[S2.length - 1].deaths) - F.deathStart) > 0 ? 1 : 0,
      hpMin: Math.min(...S2.map(x => x.hpPct)),
      sec: r1((F.t1 ?? S2[S2.length - 1].gsec) - F.t0),
      nSamp: S2.length,
    });
  }
  return { seed, floors: out };
}

log(`\n■ hs_v205_determinism — 곱 ${MUL} · 층 1→${MAXFLOOR} · 씨앗 ${SEEDS.join("/")} 를 각 2회`);
log(`  __FIXED_DT=1/${Math.round(1 / FIXED_DT)} · 합격 = 같은 씨앗 2회의 층별 kills·hitN·hpMin·died 일치 (sec 은 ±0.5 게임초 허용)\n`);

const KEYS = ["kills", "hitN", "hpMin", "died"];
const report = [];
let allMatch = true;

for (const seed of SEEDS) {
  errs = [];
  const a = await runOne(seed);
  const b = await runOne(seed);
  if (!a || !b) { log(`  씨앗 ${seed} — 부팅 실패, 건너뜀`); allMatch = false; continue; }
  const fa = new Map(a.floors.map(F => [F.floor, F]));
  const fb = new Map(b.floors.map(F => [F.floor, F]));
  const floorSet = [...new Set([...fa.keys(), ...fb.keys()])].sort((x, y) => x - y);
  const seedRep = { seed, floors: [], errs: errs.length };
  let seedMatch = true;
  for (const f of floorSet) {
    const A = fa.get(f), B = fb.get(f);
    if (!A || !B) { log(`  씨앗 ${seed} 층${f}: 한 판에만 있음 (A ${!!A} · B ${!!B}) → 불일치`); seedMatch = false; seedRep.floors.push({ floor: f, match: false, missing: true }); continue; }
    const diffs = [];
    for (const k of KEYS) if (A[k] !== B[k]) diffs.push(`${k} ${A[k]}≠${B[k]}`);
    const secDiff = Math.abs(A.sec - B.sec);
    const match = diffs.length === 0;
    if (!match) seedMatch = false;
    seedRep.floors.push({ floor: f, match, diffs, A, B, secDiff: r1(secDiff) });
    log(`  씨앗 ${seed} 층${f}: ${match ? "✓ 일치" : "✗ " + diffs.join(" · ")}` +
      `  [A kills ${A.kills}/hit ${A.hitN}/hpMin ${A.hpMin}/died ${A.died}/${A.sec}s/${A.nSamp}표본` +
      ` · B kills ${B.kills}/hit ${B.hitN}/hpMin ${B.hpMin}/died ${B.died}/${B.sec}s/${B.nSamp}표본` +
      ` · Δsec ${r1(secDiff)}]`);
  }
  if (!seedMatch) allMatch = false;
  seedRep.match = seedMatch;
  report.push(seedRep);
  log(`    → 씨앗 ${seed}: ${seedMatch ? "★ 결정적" : "비결정"} (오류 ${errs.length})\n`);
}

log(`\n▣ 판정: ${allMatch ? "★★ 결정적 — 같은 씨앗 2회가 층별로 일치" : "✗ 비결정 — 아래 불일치가 남은 원천"}`);
if (!allMatch) {
  log(`  남은 비결정 원천 후보: 표본이 벽시계(250ms)라 층 경계에서 프레임이 어긋나면 kills/hitN 가 몇 개 샌다;`);
  log(`  rAF 프레임 수 차이 · 비동기 에셋 로딩 순서 · Math.random 미시딩 부분. 위 Δ가 큰 층부터 본다.`);
}
fs.writeFileSync(`tmp/hs_v205_determinism.json`, JSON.stringify({ mul: MUL, maxfloor: MAXFLOOR, seeds: SEEDS, allMatch, report }, null, 2));
log(`  ▸ tmp/hs_v205_determinism.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(allMatch ? 0 : 1);
