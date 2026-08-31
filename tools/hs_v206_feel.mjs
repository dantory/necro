/* hs/ V-206 자 — 「손맛 둘」을 수로 판정한다: 화면 공허 · 벽 밖 발사체.
 *
 *   node tools/hs_v206_feel.mjs [씨앗들] [최대층] [층당초]
 *   node tools/hs_v206_feel.mjs 1,2,3 3 30   (기본 — 씨앗 3 · 층 1~3 · 층당 30초)
 *
 * 무엇을 재나(before=고치기 전 · after=고친 뒤, 손잡이로 갈라 한 자로 잰다):
 *   ㉠ 검은 공허 비율 — 화면 격자점(48×27) 중 「방·복도 어디에도 안 드는」 비율. 매 프레임 쌓아 p50·p95.
 *      before 는 __CAM_CLAMP=false(옛 맵-전체 clamp), after 는 켠 채로. 끝: after p95 ≤ before p95 × 0.5.
 *   ㉡ 벽 밖 발사체 비율 — 매 프레임 살아 있는 spears+foeShots 중 !inFree 인 것의 비율. 끝: after 0%.
 *   ㉢ 콘솔 오류 0.
 * 컷(after 만): tmp/hs_v206_{corner,shot,room}.png — 방 벽에 붙은 순간 · 창이 벽에 맞는 순간 · 보통 교전.
 *
 * 자·봇 뼈대는 hs_v203b.mjs 와 같다(CDP 9333 · seed 주입 · AUTO 봇 · __FIXED_DT). chrome_guard 먼저 부른다.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const SEEDS = (process.argv[2] || "1,2,3").split(",").map((s) => +s);
const MAXFLOOR = +(process.argv[3] || 3);
const FLOORCAP = +(process.argv[4] || 30);
const VW = 1512, VH = 863;
const FIXED_DT = 1 / 60;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, 2600 * 1000);

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

// 매 프레임 화면 공허·벽밖 발사체를 쌓는 관찰 전용 계기(게임 로직 불변). document-start 에 심는다.
const PROBE = `(() => {
  const V = window.__v206 = { voids: [], bots: [], projTot: 0, projOut: 0, frames: 0, on: false };
  window.__v206reset = () => { V.voids = []; V.bots = []; V.projTot = 0; V.projOut = 0; V.frames = 0; };
  const inFreePt = (x, y) => { const G = window.G; if (!G || !G.rooms) return true;
    for (const rm of G.rooms) if (x >= rm.x && x <= rm.x + rm.w && y >= rm.y && y <= rm.y + rm.h) return true;
    for (const c of G.corridors) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    return false; };
  const GX = 48, GY = 27, TOT = GX * GY;
  function tick() {
    requestAnimationFrame(tick);
    const G = window.G, cam = window.cam, Z = window.HSZ, cv = document.getElementById('board');
    if (!V.on || !G || !G.player || !cam || !Z || !cv) return;
    const vw = cv.width / Z, vh = cv.height / Z;
    let voidN = 0, botN = 0, botTot = 0;
    const BOT0 = Math.floor(GY * 0.6);
    for (let iy = 0; iy < GY; iy++) for (let ix = 0; ix < GX; ix++) {
      const v = !inFreePt(cam.x + (ix + 0.5) / GX * vw, cam.y + (iy + 0.5) / GY * vh);
      if (v) voidN++;
      if (iy >= BOT0) { botTot++; if (v) botN++; }
    }
    V.voids.push(Math.round(1000 * voidN / TOT) / 10);
    V.bots.push(Math.round(1000 * botN / botTot) / 10);
    for (const sp of G.spears) { V.projTot++; if (!inFreePt(sp.x, sp.y)) V.projOut++; }
    for (const sh of G.foeShots) { V.projTot++; if (!inFreePt(sh.x, sh.y)) V.projOut++; }
    V.frames++;
  }
  requestAnimationFrame(tick);
})()`;

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
  const A = { lastQ: 0, lastE: 0, lastPt: 0 };
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
    for (let i = rel.length - 1; i >= 0; i--) if (gnow() >= rel[i][1]) { ku(rel[i][0]); rel.splice(i, 1); }
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
    const now = gnow();
    if (now - A.lastQ > 380) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 700) { A.lastE = now; tap('e'); }
    if (now - A.lastPt > 500) { A.lastPt = now; tap('z'); tap('x'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

// 컷 판정·상태를 한 번에 읽는다.
const SAMPLE = `(() => {
  const G = window.G, p = G.player;
  let enem = 0;
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) enem++;
  let inRoom = false, nearWall = false;
  for (const rm of G.rooms) if (p.x >= rm.x && p.x <= rm.x + rm.w && p.y >= rm.y && p.y <= rm.y + rm.h) {
    inRoom = true;
    if (Math.min(p.x - rm.x, rm.x + rm.w - p.x, p.y - rm.y, rm.y + rm.h - p.y) < 70) nearWall = true;
    break; }
  const inF = (x, y, r) => { for (const rm of G.rooms) if (x >= rm.x + r && x <= rm.x + rm.w - r && y >= rm.y + r && y <= rm.y + rm.h - r) return true;
    for (const c of G.corridors) if (x >= c.x + r && x <= c.x + c.w - r && y >= c.y + r && y <= c.y + c.h - r) return true; return false; };
  let spearNearWall = false;
  for (const sp of G.spears) if (!inF(sp.x + sp.vx * 0.1, sp.y + sp.vy * 0.1, 7)) { spearNearWall = true; break; }
  return { floor: G.floor, hpPct: Math.round(100 * p.hp / p.maxhp), enem, inRoom, nearWall, spearNearWall,
    gsec: (window.__gameSec ? window.__gameSec() : 0) };
})()`;

const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
const r1 = n => Math.round(n * 10) / 10;

const shot = { corner: false, shot: false, room: false };
async function capture(S, key, note) {
  if (shot[key]) return;
  shot[key] = true;
  const r = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`tmp/hs_v206_${key}.png`, Buffer.from(r.data, "base64"));
  log(`  컷 tmp/hs_v206_${key}.png  (${note})`);
}

async function runOne(cond, seed) {
  const after = cond === "after";
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__RANGED_MOB = true; globalThis.__FOE_DMG = 16;
    globalThis.__CAM_CLAMP = ${after}; globalThis.__PROJ_WALL = ${after};` });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__FIXED_DT = ${FIXED_DT};` });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  ${cond} 씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(MINION)})`);
  await sleep(700);
  await ev(`window.__v206reset(); window.__v206.on = true;`);

  let startG = null, curFloor = 0, floorStartG = 0;
  while (true) {
    await sleep(250);
    const s = await ev(SAMPLE);
    if (!s) break;
    if (startG == null) startG = s.gsec;
    if (s.floor !== curFloor) { curFloor = s.floor; floorStartG = s.gsec; if (curFloor > MAXFLOOR) break; }

    if (after) {
      if (s.spearNearWall) await capture(S, "shot", `층 ${s.floor} · 창이 벽에 맞기 직전`);
      if (s.nearWall && s.enem > 0) await capture(S, "corner", `층 ${s.floor} · 방 벽에 붙음 · 적 ${s.enem}`);
      if (s.inRoom && s.enem > 3 && s.hpPct > 50 && s.hpPct < 100) await capture(S, "room", `층 ${s.floor} · 교전 · 적 ${s.enem} · hp ${s.hpPct}%`);
    }

    if (s.gsec - floorStartG > FLOORCAP) {
      await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y; p._f = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
      await sleep(200);
    }
    if (s.gsec - startG > FLOORCAP * (MAXFLOOR + 1)) break;
  }
  const V = await ev(`window.__v206`);
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return V;
}

async function runCond(cond) {
  const voids = [], bots = []; let projTot = 0, projOut = 0, frames = 0, cerr = 0;
  for (const seed of SEEDS) {
    errs = [];
    const V = await runOne(cond, seed);
    if (!V) { cerr++; continue; }
    voids.push(...V.voids); bots.push(...V.bots); projTot += V.projTot; projOut += V.projOut; frames += V.frames; cerr += errs.length;
    log(`  ${cond} 씨앗 ${seed}: 프레임 ${V.frames} · 공허 p50 ${r1(pct(V.voids, 0.5))}% p95 ${r1(pct(V.voids, 0.95))}% · ` +
      `아래공허 p95 ${r1(pct(V.bots, 0.95))}% · 발사체 ${V.projTot}(벽밖 ${V.projOut}) · 오류 ${errs.length}`);
  }
  const projPct = projTot ? r1(100 * projOut / projTot) : 0;
  return { cond, voidP50: r1(pct(voids, 0.5)), voidP95: r1(pct(voids, 0.95)),
    botP50: r1(pct(bots, 0.5)), botP95: r1(pct(bots, 0.95)),
    projTot, projOut, projPct, frames, errs: cerr, n: voids.length };
}

log(`\n■ hs_v206_feel — 씨앗 ${SEEDS.join("/")} · 층 1→${MAXFLOOR} · 층당 ${FLOORCAP}s · __FOE_DMG=16`);
log(`  재는 것: 화면 공허(p50·p95) · 벽 밖 발사체 비율 · 콘솔 오류. before(옛 clamp·벽통과) vs after(고침).\n`);
const before = await runCond("before");
const after = await runCond("after");

log(`\n▣ before/after 한 줄:`);
log(`  before: 공허 p50 ${before.voidP50}% p95 ${before.voidP95}% · 아래공허 p50 ${before.botP50}% p95 ${before.botP95}% · 벽밖 발사체 ${before.projPct}% (${before.projOut}/${before.projTot}) · 오류 ${before.errs}`);
log(`  after : 공허 p50 ${after.voidP50}% p95 ${after.voidP95}% · 아래공허 p50 ${after.botP50}% p95 ${after.botP95}% · 벽밖 발사체 ${after.projPct}% (${after.projOut}/${after.projTot}) · 오류 ${after.errs}`);
const voidPass = after.voidP95 <= before.voidP95 * 0.5;
const botPass = after.botP95 <= before.botP95 * 0.5;
const projPass = after.projPct === 0;
const errPass = after.errs === 0;
log(`\n  끝 조건:`);
log(`   ㉠ 공허(전체) p95 절반 이하: after ${after.voidP95}% ≤ before ${before.voidP95}% × 0.5 = ${r1(before.voidP95 * 0.5)}%  → ${voidPass ? "★ 통과" : "미달"}`);
log(`   ㉠' 아래공허 p95 절반 이하(병수님이 본 것): after ${after.botP95}% ≤ before ${before.botP95}% × 0.5 = ${r1(before.botP95 * 0.5)}%  → ${botPass ? "★ 통과" : "미달"}`);
log(`   ㉡ 벽 밖 발사체 0%: after ${after.projPct}%  → ${projPass ? "★ 통과" : "미달"}`);
log(`   ㉢ 콘솔 오류 0: after ${after.errs}  → ${errPass ? "★ 통과" : "미달"}`);
log(`  ▣▣ 전체: ${(voidPass || botPass) && projPass && errPass ? "★ 통과" : "미달"}`);
log(`  컷: tmp/hs_v206_{corner,shot,room}.png`);
fs.writeFileSync(`tmp/hs_v206_feel.json`, JSON.stringify({ before, after, voidPass, botPass, projPass, errPass, seeds: SEEDS, maxfloor: MAXFLOOR, floorcap: FLOORCAP }, null, 2));
log(`  ▸ tmp/hs_v206_feel.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
