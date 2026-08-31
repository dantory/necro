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

const seedSrc = (seed) => `window.__rngN = 0; Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { window.__rngN++; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const MINION = { attr: { int: 20, vit: 10, str: 10 }, skill: { slot: 8, grade: 2, mdmg: 10, mhp: 8, spear: 5 }, grade: 2 };

const AUTO = `(SPEC => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup',   { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const gnow = () => window.__gameSec ? window.__gameSec() * 1000 : performance.now();
  const rel = [];
  const tap = k => { kd(k); rel.push([k, gnow() + 40]); };
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
  function step() {
    const G = window.G, cam = window.cam;
    window.__botN = (window.__botN || 0) + 1;
    for (let i = rel.length - 1; i >= 0; i--) if (gnow() >= rel[i][1]) { ku(rel[i][0]); rel.splice(i, 1); }
    if (!G || !G.player) return;
    if (G.dead) { tap('r'); return; }
    ensureBuild();
    const p = G.player;
    if (window.__lastFloor !== G.floor) { window.__lastFloor = G.floor; window.__floorEnterG = gnow(); }
    if (gnow() - (window.__floorEnterG || 0) > 12000) { p.x = G.stairs.x; p.y = G.stairs.y; p._f = false; tap('f'); }
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
    const now = gnow();
    if (now - A.lastQ > 380) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 700) { A.lastE = now; tap('e'); }
    if (now - A.lastPt > 500) { A.lastPt = now; tap('z'); tap('x'); }
  }
  window.__botStep = step;
  return 1;
})`;

const PROGRESS = `(() => ({ n: (window.__floorLog || []).length,
  g: (window.__gameSec ? window.__gameSec() : 0), dead: !!(window.G && window.G.dead) }))()`;

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
  await ev(`${seedSrc(seed)}
    window.__restart(1);
    Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0, grains:0, hitN:0 });
    window.__floorLogReset && window.__floorLogReset();
    window.__lastFloor = undefined; window.__botN = 0;`);

  const wallStart = Date.now();
  let startG = null;
  while (true) {
    await sleep(250);
    const s = await ev(PROGRESS);
    if (!s) break;
    if (startG == null) startG = s.g;
    if (s.n >= MAXFLOOR) break;
    if (s.g - startG > FLOORCAP * (MAXFLOOR + 1)) break;
    if (Date.now() - wallStart > WALL_SAFETY * FLOORCAP * (MAXFLOOR + 1) * 1000) { errs.push(`WALL_SAFETY abort seed=${seed}`); break; }
  }
  const floorLog = await ev(`JSON.stringify(window.__floorLog || [])`);
  const botN = await ev(`window.__botN || 0`);
  const rngN = await ev(`window.__rngN || 0`);
  const gameFrames = await ev(`Math.round((window.__gameSec ? window.__gameSec() : 0) * 60)`);
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  const parsed = (() => { try { return JSON.parse(floorLog || "[]"); } catch { return []; } })();
  log(`    (씨앗 ${seed} 판: 게임프레임 ${gameFrames} · 봇틱 ${botN} · rng호출 ${rngN})`);
  return { seed, floors: parsed.slice(0, MAXFLOOR), botN, gameFrames, rngN };
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
  const seedRep = { seed, floors: [], errs: errs.length };
  let seedMatch = true;
  if (a.floors.length !== b.floors.length) { log(`  씨앗 ${seed}: 기록 길이 다름 A ${a.floors.length} · B ${b.floors.length} → 불일치`); seedMatch = false; }
  const n = Math.max(a.floors.length, b.floors.length);
  for (let i = 0; i < n; i++) {
    const A = a.floors[i], B = b.floors[i];
    if (!A || !B) { log(`  씨앗 ${seed} 기록#${i}: 한 판에만 있음 (A ${!!A} · B ${!!B}) → 불일치`); seedMatch = false; seedRep.floors.push({ i, match: false, missing: true, A, B }); continue; }
    const diffs = [];
    for (const k of KEYS) if (A[k] !== B[k]) diffs.push(`${k} ${A[k]}≠${B[k]}`);
    if (A.floor !== B.floor) diffs.push(`floor ${A.floor}≠${B.floor}`);
    const secDiff = Math.abs(A.sec - B.sec);
    const match = diffs.length === 0;
    if (!match) seedMatch = false;
    seedRep.floors.push({ i, floor: A.floor, match, diffs, A, B, secDiff: r1(secDiff) });
    log(`  씨앗 ${seed} 기록#${i}(층${A.floor}): ${match ? "✓ 일치" : "✗ " + diffs.join(" · ")}` +
      `  [A kills ${A.kills}/hit ${A.hitN}/hpMin ${A.hpMin}/died ${A.died}/${A.sec}s` +
      ` · B kills ${B.kills}/hit ${B.hitN}/hpMin ${B.hpMin}/died ${B.died}/${B.sec}s · Δsec ${r1(secDiff)}]`);
  }
  if (!seedMatch) allMatch = false;
  seedRep.match = seedMatch;
  report.push(seedRep);
  log(`    → 씨앗 ${seed}: ${seedMatch ? "★ 결정적" : "비결정"} (오류 ${errs.length})\n`);
}

log(`\n▣ 판정: ${allMatch ? "★★ 결정적 — 같은 씨앗 2회가 프레임정확 기록으로 일치" : "✗ 비결정 — 위 불일치가 남은 원천"}`);
if (!allMatch) {
  log(`  기록은 프레임정확(__floorLog)이라 표본 잡음은 아니다. 남은 후보: 봇 입력이 아직 벽시계에 걸린 곳,`);
  log(`  rAF 두 루프의 프레임 어긋남, 비동기 에셋 로딩 순서, Math.random 미시딩. 위 Δ 큰 기록부터 본다.`);
}
fs.writeFileSync(`tmp/hs_v205_determinism.json`, JSON.stringify({ mul: MUL, maxfloor: MAXFLOOR, seeds: SEEDS, allMatch, report }, null, 2));
log(`  ▸ tmp/hs_v205_determinism.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(allMatch ? 0 : 1);
