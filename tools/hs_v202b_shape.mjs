/* hs/ V-202b 자 — 「한 판이 어떤 모양인가」를 잰다 (밸런스).
 *
 *   node tools/hs_v202b_shape.mjs [before|after] [최대층] [씨앗들]
 *   node tools/hs_v202b_shape.mjs before               (기본 — 층 5까지 × 씨앗 다섯)
 *   node tools/hs_v202b_shape.mjs after 5 1,2,3,4,5
 *
 * 왜 (ROADMAP V-202b): 여태 만든 자는 전부 «그림»(겹침·색·접지·이펙트)만 봤다. 「한 판이
 *   어떤 모양인가」— 몇 마리를 죽이는지, 소환 자리가 몇까지 부는지, 피해가 몇 자리인지,
 *   사람이 죽을 뻔이나 하는지 — 를 재는 자가 하나도 없었다([[silent-zero-is-not-an-observation]]).
 *   그래서 소환 자리가 8→98 로 불고 한 층에서 이천을 죽이는 꼴이 닷새 동안 안 보였다.
 *
 * ★ probe-must-walk-the-real-path — 지름길 금지. 페이지 안 rAF 봇이 실제 키/마우스 이벤트로
 *   싸우고, 시체로 해골을 세우고, 바닥의 «빌드 방울»을 밟아 줍고, 층을 clear 하면 계단으로
 *   내려간다(F). 재기는 세는 것만 한다 — 게임 상태(G.packs/G.minions/G.player/__hsMetric)를
 *   0.25초마다 표본으로 뜬다. 한 판이 서는 규칙(층별 팩·drop·성장)은 손대지 않는다.
 * ★ 봇 빌드는 «소환형»(rep_v199 가 잡은 꼴) — 자리·등급·소환수 피해를 세우고, 바닥의 빌드
 *   방울(자리 +2 · 소환수 피해 ×1.3)을 주워 커진다. 이 방울들이 곧 8→98·피해 백만의 출처다.
 *
 * 재는 것 (전부 층별):
 *   층당 처치 · 소환 자리 상한(slotCap)·실제 쓴 칸(slotsUsed) · 소환수/산 적 마릿수(중앙값·p90)
 *   · 뼈창/소환수 한 방 피해 자릿수(중앙값·최대) · 층당 걸린 초 · 층당 얻은 렙
 *   · 사람 체력이 50%·25% 아래로 내려간 횟수(지금 0 이면 그게 「위험 없음」의 증거).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const MODE = process.argv[2] === "after" ? "after" : "before";
const MAXFLOOR = +(process.argv[3] || 5);
const SEEDS = (process.argv[4] || "1,2,3,4,5").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const FLOORCAP = 45;   // 층마다 이만큼 «싸우고» 계단으로 내려간다 — 층 총 적수(spawned)가 봇 실력에 안 흔들리게 고정 예산.
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

// 소환형 빌드 — 자리·등급·소환수 피해를 세운다(rep_v199 가 잡은 꼴). 여기서 «시작점»만 정하고,
// 바닥의 빌드 방울(자리 +2 · 소환수 피해 ×1.3)은 판 중에 주워 커진다 — 그 커짐이 곧 측정 대상이다.
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
  window.__prof && window.__prof.reset && window.__prof.reset();
  const A = { lastQ: 0, lastE: 0, lastPt: 0 }; window.__a202b = A;
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
    if (now - A.lastQ > 380) { A.lastQ = now; tap('q'); }       // 시체로 해골을 세운다(자리를 채운다)
    if (now - A.lastE > 700) { A.lastE = now; tap('e'); }       // 시체폭발
    if (now - A.lastPt > 500) { A.lastPt = now; tap('z'); tap('x'); }   // 번 점수를 자리/등급/소환수피해로
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// 한 표본 — 게임 안 실제 상태에서 층별 모양을 뜬다. 지름길 없이 월드 전체의 «산 적»을 센다.
const SAMPLE = `(() => {
  const G = window.G, p = G.player, T = window.SKEL_TIERS;
  let enem = 0, spawned = 0;                          // enem=깨어 산 적 · spawned=이 층에 놓인 적 총수(밀도의 참값)
  for (const pk of G.packs) { spawned += pk.enemies.length; if (pk.awake) for (const m of pk.enemies) if (m.alive) enem++; }
  let used = 0; for (const m of G.minions) used += m.slot;
  const cap = p.slots + (p.uniques && p.uniques.has && p.uniques.has('moreSkel') ? 4 : 0);
  // 한 방 피해 — floatDmg 가 찍는 그 수를 스탯에서 그대로 낸다(뼈창 · 최상위 소환수).
  const spearDmg = Math.round(42 * p.dmgMul * p.spearMul);
  const tier = Math.min(p.maxGrade, T.length - 1);
  const minionDmg = Math.round((34 + G.floor * 10) * T[tier].dmgMul * p.minionMul);
  return { floor: G.floor, level: p.level, kills: window.__hsMetric.kills, spawned,
    enem, minions: G.minions.length, used, cap,
    spearDmg, minionDmg, minionMul: +p.minionMul.toFixed(1), buildMul: +p.mult.minionDmg.toFixed(1),
    buildSlots: p.buildSlots, hpPct: Math.round(100 * p.hp / p.maxhp) };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p90 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))]; };
const r1 = n => Math.round(n * 10) / 10;

// 한 씨앗 — 층 1→MAXFLOOR 를 실제로 내려가며 층별로 표본을 모은다.
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
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await sleep(700);
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0, grains:0 })`);

  const floors = {};   // floor -> { samples:[], killStart, killEnd, lvlStart, lvlEnd, t0, t1, dip50, dip25 }
  const shotFloors = shots ? new Set([1, 3]) : new Set();
  const shotDone = new Set();
  let cur = null, curFloor = 0, floorStart = Date.now(), prevHp = 100;
  const startAll = Date.now();

  // MAXFLOOR 를 다 돌 때까지(또는 판당 안전 상한). 0.25초마다 표본.
  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    if (s.floor !== curFloor) {
      if (cur) { cur.killEnd = s.kills; cur.lvlEnd = s.level; cur.t1 = Date.now(); }
      curFloor = s.floor;
      floorStart = Date.now();
      cur = floors[curFloor] = { floor: curFloor, samples: [], killStart: s.kills, lvlStart: s.level,
        t0: Date.now(), dip50: 0, dip25: 0 };
      prevHp = s.hpPct;
      if (curFloor > MAXFLOOR) break;   // MAXFLOOR 를 다 채우고 다음 층에 발 디디면 멈춘다
    }
    cur.samples.push(s);
    // 위험 — 체력이 문턱을 «지나 내려간» 순간을 센다(가장자리 교차). 지금 0 이면 그게 결함.
    if (prevHp >= 50 && s.hpPct < 50) cur.dip50++;
    if (prevHp >= 25 && s.hpPct < 25) cur.dip25++;
    prevHp = s.hpPct;

    // 컷 — 첫 씨앗만, 층 1·3 에서 한 장씩(눈으로도 본다 ③).
    if (shotFloors.has(curFloor) && !shotDone.has(curFloor) && Date.now() - floorStart > 8000) {
      shotDone.add(curFloor);
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/hs_v202b_${MODE}_f${curFloor}.png`, Buffer.from(r.data, "base64"));
      log(`  컷 tmp/hs_v202b_${MODE}_f${curFloor}.png  (적 ${s.enem} · 소환 ${s.minions} · 자리 ${s.used}/${s.cap} · 소환수피해 ${s.minionDmg})`);
    }
    // 예산(FLOORCAP초)을 채우면 계단으로 순간이동해 내려간다 — 남은 팩은 두고 간다.
    // ★ «깨끗한» F 눌렀다 뗐다 + _f 걸쇠 초기화 — 안 그러면 keydown 만 남아 keys 에 'f' 가 박혀
    //   다음 층부터 계단이 영영 안 먹는다(초기 판에서 층2 가 179초로 늘어졌던 원인).
    if (Date.now() - floorStart > FLOORCAP * 1000) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (Date.now() - startAll > FLOORCAP * (MAXFLOOR + 1) * 1000) break;   // 총 상한 안전망
  }
  if (cur && cur.killEnd == null) { const s = await ev(SAMPLE); if (s) { cur.killEnd = s.kills; cur.lvlEnd = s.level; cur.t1 = Date.now(); } }
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  // 층별 요약
  const out = [];
  for (const f of Object.keys(floors).map(Number).sort((a, b) => a - b)) {
    if (f > MAXFLOOR) continue;
    const F = floors[f]; const S2 = F.samples;
    if (!S2.length) continue;
    const enemA = S2.map(x => x.enem), minA = S2.map(x => x.minions);
    const spA = S2.map(x => x.spearDmg), mdA = S2.map(x => x.minionDmg), hpA = S2.map(x => x.hpPct);
    out.push({
      floor: f,
      spawned: Math.max(...S2.map(x => x.spawned)),   // 이 층에 놓인 적 총수 — 밀도의 참값(봇 실력·예산에 안 흔들림)
      kills: (F.killEnd ?? S2[S2.length - 1].kills) - F.killStart,
      sec: r1(((F.t1 ?? Date.now()) - F.t0) / 1000),
      lvl: (F.lvlEnd ?? S2[S2.length - 1].level) - F.lvlStart,
      enem: { p50: median(enemA), p90: p90(enemA), max: Math.max(...enemA) },
      minions: { p50: median(minA), p90: p90(minA), max: Math.max(...minA) },
      capMax: Math.max(...S2.map(x => x.cap)), usedMax: Math.max(...S2.map(x => x.used)), usedP50: median(S2.map(x => x.used)),
      buildSlotsMax: Math.max(...S2.map(x => x.buildSlots)), buildMulMax: Math.max(...S2.map(x => x.buildMul)),
      spearDmg: { p50: median(spA), max: Math.max(...spA) },
      minionDmg: { p50: median(mdA), max: Math.max(...mdA) },
      hpMin: Math.min(...hpA), dip50: F.dip50, dip25: F.dip25,
    });
  }
  return { seed, floors: out };
}

log(`\n■ hs_v202b_shape (${MODE}) — 소환형 · 층 1→${MAXFLOOR} × 씨앗 ${SEEDS.join("/")} · 창 ${VW}×${VH}`);
log(`  재는 것: 층당 처치 · 자리 상한/쓴칸 · 소환/산적 마릿수 · 한방 피해 자릿수 · 층당 초·렙 · 위험(hp<50/25 횟수)\n`);
const runs = [];
for (let i = 0; i < SEEDS.length; i++) {
  errs = [];
  const r = await runOne(SEEDS[i], i === 0);
  if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
  r.errs = errs.length; runs.push(r);
  for (const F of r.floors)
    log(`  씨앗 ${r.seed} 층${F.floor}: 놓인적 ${F.spawned} · ${F.sec}s간 처치 ${F.kills} · +${F.lvl}렙 · 자리 ${F.usedMax}/${F.capMax}(빌드+${F.buildSlotsMax}) · ` +
      `산적 p50 ${F.enem.p50}(p90 ${F.enem.p90}·max ${F.enem.max}) · 소환 p50 ${F.minions.p50}(max ${F.minions.max}) · ` +
      `뼈창 ${F.spearDmg.p50}(max ${F.spearDmg.max}) · 소환수 ${F.minionDmg.p50}(max ${F.minionDmg.max}·빌드×${F.buildMulMax}) · ` +
      `hp최저 ${F.hpMin}% · 위험 <50:${F.dip50} <25:${F.dip25}`);
  log(`    (오류 ${r.errs})`);
}
if (!runs.length) { log("판 없음"); bws.close(); process.exit(3); }

// 씨앗 합산 — 층별로 씨앗을 모아 중앙값/최댓값을 낸다(통과선은 이 표로 판정).
const byFloor = {};
for (const r of runs) for (const F of r.floors) (byFloor[F.floor] ||= []).push(F);
const agg = [];
log(`\n▣ ${MODE} 층별 합산 (씨앗 ${runs.length}개):`);
for (const f of Object.keys(byFloor).map(Number).sort((a, b) => a - b)) {
  const L = byFloor[f];
  const A = {
    floor: f, seeds: L.length,
    spawnedMed: median(L.map(x => x.spawned)), spawnedMax: Math.max(...L.map(x => x.spawned)),
    killsMed: median(L.map(x => x.kills)), killsMax: Math.max(...L.map(x => x.kills)),
    secMed: r1(median(L.map(x => x.sec))),
    lvlMed: median(L.map(x => x.lvl)),
    capMax: Math.max(...L.map(x => x.capMax)), usedMax: Math.max(...L.map(x => x.usedMax)),
    buildSlotsMax: Math.max(...L.map(x => x.buildSlotsMax)),
    enemP50: median(L.map(x => x.enem.p50)), enemMax: Math.max(...L.map(x => x.enem.max)),
    minP50: median(L.map(x => x.minions.p50)),
    spearMax: Math.max(...L.map(x => x.spearDmg.max)),
    minionMax: Math.max(...L.map(x => x.minionDmg.max)),
    dip50: L.reduce((s, x) => s + x.dip50, 0), dip25: L.reduce((s, x) => s + x.dip25, 0),
    hpMin: Math.min(...L.map(x => x.hpMin)),
  };
  agg.push(A);
  log(`  층${f}: 놓인적 중앙 ${A.spawnedMed}(max ${A.spawnedMax}) · ${A.secMed}s간 처치 중앙 ${A.killsMed}(max ${A.killsMax}) · +${A.lvlMed}렙 · ` +
    `자리 상한 max ${A.capMax}(빌드+${A.buildSlotsMax}·쓴칸 ${A.usedMax}) · 산적 p50 ${A.enemP50}(max ${A.enemMax}) · ` +
    `소환 p50 ${A.minP50} · 뼈창 max ${A.spearMax} · 소환수 max ${A.minionMax} · hp최저 ${A.hpMin}% · 위험 <50:${A.dip50} <25:${A.dip25}`);
}

const totErr = runs.reduce((s, r) => s + r.errs, 0);
log(`\n  오류 합계 ${totErr}`);
fs.writeFileSync(`tmp/hs_v202b_${MODE}.json`, JSON.stringify({ mode: MODE, maxfloor: MAXFLOOR, seeds: SEEDS, agg, runs }, null, 2));
log(`  ▸ tmp/hs_v202b_${MODE}.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
