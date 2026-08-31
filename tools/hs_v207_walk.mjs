/* V-207 자 — 걸으며 «동시에 깨어 있는 적·무리»를 잰다. 순간이동 없이 실제 키 입력으로 훑는다.
 *
 *   node tools/hs_v207_walk.mjs
 *     → tmp/hs_v207_walk.json  (WAKE 3000 vs 820 나란히: 동시 적/무리 p50·p95·max)
 *     → tmp/hs_v207_walk{1,2,3,4}.png  (820 판을 걷는 도중: 빈 복도·방 진입·교전·처치 후)
 *     → tmp/hs_v207_walk.log
 *
 * p6_run(V-151) 의 걷기·감지 machinery 를 그대로 쓴다(새 자를 만들지 않는다). 더한 것:
 *   ㉠ __bot 에 «지금 살아서 깨어 있는» 적 수·무리 수를 붙였다(woke 는 누적이라 동시 수가 아니다).
 *   ㉡ WAKE 를 globalThis.__WAKE 로 3000/820 두 번 돌려 나란히 잰다(같은 씨앗·같은 층).
 *   ㉢ 걷는 도중 네 순간에 컷을 찍는다 — 장면을 세우지 않는다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const LOG = fs.createWriteStream("tmp/hs_v207_walk.log", { flags: "a" });
const log = (...a) => { const s = a.join(" "); LOG.write(s + "\n"); process.stdout.write(s + "\n"); };
const HARD = setTimeout(() => { log("WATCHDOG 600s — 강제 종료"); process.exit(9); }, 600000);

const SEED = +(process.env.SEED || 1337);
const VW = 1512, VH = 863;
const FLOOR_BUDGET = +(process.env.FLOOR_BUDGET || 62000);
const BURST = 360;

await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

const INJECT = (seed, wake) => `(()=>{
  let s = ${seed} >>> 0;
  Math.random = function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  globalThis.__WAKE = ${wake};
  window.__ft = [];
  (function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
    if(window.__ft.length>3000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());
})();`;

const BOT_DEF = `window.__bot = function(){
  const p=G.player, Z=window.HSZ;
  let pack=null,pd=1e18;
  for(const pk of G.packs){ if(pk.done)continue; if(!pk.enemies.some(e=>e.alive))continue;
    const d=(pk.x-p.x)**2+(pk.y-p.y)**2; if(d<pd){pd=d;pack=pk;} }
  let en=null,ed=1e18;
  for(const pk of G.packs){ if(!pk.awake)continue; for(const e of pk.enemies){ if(!e.alive)continue;
    const d=(e.x-p.x)**2+(e.y-p.y)**2; if(d<ed){ed=d;en=e;} } }
  let awakeAlive=0, awakePacks=0, awakeNear=0;
  for(const pk of G.packs){ if(!pk.awake||pk.done)continue; let live=0;
    for(const e of pk.enemies){ if(!e.alive)continue; live++;
      if((e.x-p.x)**2+(e.y-p.y)**2 < 700*700) awakeNear++; }
    if(live>0){ awakePacks++; awakeAlive+=live; } }
  let corpses=0; for(const c of G.corpses) if(!c.used) corpses++;
  let su=0; for(const m of G.minions) su+=m.slot;
  let es=null; if(en){ let x=(en.x-cam.x)*Z, y=(en.y-cam.y)*Z-en.h*Z*0.5;
    x=Math.max(6,Math.min(${VW}-6,x)); y=Math.max(6,Math.min(${VH}-6,y)); es=[Math.round(x),Math.round(y)]; }
  let cleared=0; for(const r of G.rooms) if(r.cleared) cleared++;
  const oob = window.__walkable ? !window.__walkable(p.x,p.y) : false;
  return JSON.stringify({ px:p.x, py:p.y, floor:G.floor, dead:G.dead,
    pack: pack?{x:Math.round(pack.x),y:Math.round(pack.y)}:null,
    enemyD: en?Math.round(Math.sqrt(ed)):1e9, enemyScreen:es,
    awakeAlive:awakeAlive, awakePacks:awakePacks, awakeNear:awakeNear, oob:oob,
    corpses:corpses, slotsUsed:su, slots:p.slots, lp:p.levelPoints,
    cleared:cleared, roomsTotal:G.rooms.length-1, packsTotal:G.packs.length, kills:G.kills, picks:G.picks,
    stairs:{x:G.stairs.x,y:G.stairs.y,d:Math.round(Math.hypot(p.x-G.stairs.x,p.y-G.stairs.y))} });
};
window.__cur=new Set(); window.__ptaps=[]; window.__md=false;
window.__act=function(hold,tap,fx,fy,fire){ const cv=document.getElementById('board');
  for(const k of window.__ptaps) window.dispatchEvent(new KeyboardEvent('keyup',{key:k})); window.__ptaps=[];
  const want=new Set(hold);
  for(const k of [...window.__cur]) if(!want.has(k)){ window.dispatchEvent(new KeyboardEvent('keyup',{key:k})); window.__cur.delete(k); }
  for(const k of want) if(!window.__cur.has(k)){ window.dispatchEvent(new KeyboardEvent('keydown',{key:k})); window.__cur.add(k); }
  for(const k of (tap||[])){ window.dispatchEvent(new KeyboardEvent('keydown',{key:k})); window.__ptaps.push(k); }
  if(fire){ cv.dispatchEvent(new MouseEvent('mousemove',{clientX:fx,clientY:fy,bubbles:true}));
    if(!window.__md){ cv.dispatchEvent(new MouseEvent('mousedown',{button:0,buttons:1,clientX:fx,clientY:fy,bubbles:true})); window.__md=true; } }
  else if(window.__md){ window.dispatchEvent(new MouseEvent('mouseup',{button:0,clientX:fx||0,clientY:fy||0,bubbles:true})); window.__md=false; }
  return window.__bot(); };
true`;

async function open(seed, wake) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  const errs = [];
  bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.sessionId !== sessionId) return;
    if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: INJECT(seed, wake) });
  await S("Page.navigate", { url: URL });
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸", out); };
  for (let i = 0; i < 24; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
  if (!await ev("!!(window.G && G.player)")) { log("MISS 부팅 실패", errs.slice(0, 4)); await S("Target.closeTarget", { targetId }); return null; }
  await wait(500);
  await S("Network.disable");
  await ev(BOT_DEF);
  return { targetId, S, ev, shot, errs, close: () => raw("Target.closeTarget", { targetId }) };
}

const pct = (arr, q) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * q))]; };

async function runFloor(sess, seed, wake, takeCuts) {
  const { ev, shot } = sess;
  for (let i = 0; i < 30 && (await ev("G.floor")) !== 1; i++) await wait(120);
  await ev("window.__ft.length=0;");
  const info = JSON.parse(await ev(`JSON.stringify({W:G.W,H:G.H,rooms:G.rooms.length-1,packs:G.packs.length})`));
  const t0 = Date.now();
  let prev = null, walkDist = 0, descended = false, lastQ = 0, lastZX = 0, zx = 0, oobHits = 0, samples = 0;
  const enemySeries = [], packSeries = [];
  // 컷 상태기계: 각 순간을 «처음» 맞출 때 한 번만 찍는다. 장면을 세우지 않는다.
  const cut = { corridor: false, enter: false, engage: false, cleared: false };
  let sawFight = false, prevCleared = 0;
  let b = JSON.parse(await ev("window.__bot()"));
  while (Date.now() - t0 < FLOOR_BUDGET) {
    try {
      if (prev) walkDist += Math.hypot(b.px - prev.x, b.py - prev.y);
      prev = { x: b.px, y: b.py };
      if (b.dead) break;
      if (b.floor > 1) { descended = true; break; }
      samples++; if (b.oob) oobHits++;
      enemySeries.push(b.awakeAlive); packSeries.push(b.awakePacks);
      const goal = b.pack || b.stairs;
      const closeFight = b.awakeAlive > 0 && b.enemyD < 230;
      if (b.awakeAlive > 0) sawFight = true;
      if (takeCuts) {
        if (!cut.corridor && b.awakeAlive === 0 && (Date.now() - t0) > 2500 && (goal && Math.hypot(goal.x - b.px, goal.y - b.py) > 120)) {
          await shot("tmp/hs_v207_walk1.png"); cut.corridor = true; log(`  컷1 빈 복도 — 동시적 ${b.awakeAlive}·무리 ${b.awakePacks}`);
        }
        if (!cut.enter && b.awakePacks >= 1 && b.enemyD < 620 && b.enemyD > 240) {
          await shot("tmp/hs_v207_walk2.png"); cut.enter = true; log(`  컷2 방 진입 — 동시적 ${b.awakeAlive}·무리 ${b.awakePacks}·최근적 ${b.enemyD}`);
        }
        if (!cut.engage && closeFight) {
          await shot("tmp/hs_v207_walk3.png"); cut.engage = true; log(`  컷3 교전 — 동시적 ${b.awakeAlive}·무리 ${b.awakePacks}·최근적 ${b.enemyD}`);
        }
        if (!cut.cleared && sawFight && b.awakeAlive === 0 && b.cleared > prevCleared && cut.engage) {
          await shot("tmp/hs_v207_walk4.png"); cut.cleared = true; log(`  컷4 처치 후 — 동시적 ${b.awakeAlive}·무리 ${b.awakePacks}·방 ${b.cleared}/${info.rooms}`);
        }
      }
      prevCleared = b.cleared;
      const hold = [];
      if (!closeFight) {
        const dx = goal.x - b.px, dy = goal.y - b.py;
        if (Math.hypot(dx, dy) > 66) {
          if (dx > 28) hold.push("d"); else if (dx < -28) hold.push("a");
          if (dy > 28) hold.push("s"); else if (dy < -28) hold.push("w");
        }
      }
      const tapk = []; const now = Date.now();
      if (b.corpses > 0 && b.slotsUsed < b.slots && now - lastQ > 700) { tapk.push("q"); lastQ = now; }
      if (b.lp > 0 && now - lastZX > 900) { tapk.push(zx++ % 2 ? "x" : "z"); lastZX = now; }
      if (!b.pack && b.stairs.d < 62) tapk.push("f");
      const fire = b.awakeAlive > 0 && !!b.enemyScreen;
      const fx = fire ? b.enemyScreen[0] : 0, fy = fire ? b.enemyScreen[1] : 0;
      b = JSON.parse(await ev(`window.__act(${JSON.stringify(hold)},${JSON.stringify(tapk)},${fx},${fy},${fire})`));
    } catch (e) { log("  ! 틱 오류(넘어감):", ("" + e.message).slice(0, 80)); try { b = JSON.parse(await ev("window.__bot()")); } catch {} }
    await wait(BURST);
  }
  await ev("window.__act([],[],0,0,false)").catch(() => {});
  const ft = JSON.parse(await ev("JSON.stringify(window.__ft)")).sort((a, b) => a - b);
  const fp95 = ft.length ? +ft[Math.floor(ft.length * 0.95)].toFixed(1) : 0;
  const rec = {
    wake, seed, tSec: +((Date.now() - t0) / 1000).toFixed(1), descended, died: b.dead,
    cleared: b.cleared, roomsTotal: info.rooms, packsTotal: info.packs, kills: b.kills, walkDist: Math.round(walkDist),
    enemy: { p50: pct(enemySeries, 0.5), p95: pct(enemySeries, 0.95), max: Math.max(0, ...enemySeries) },
    packs: { p50: pct(packSeries, 0.5), p95: pct(packSeries, 0.95), max: Math.max(0, ...packSeries) },
    oobPct: samples ? +(100 * oobHits / samples).toFixed(2) : 0, fp95, samples, consoleErrors: sess.errs.length,
  };
  log(`  [WAKE ${wake}] ${rec.tSec}s · 방 ${rec.cleared}/${rec.roomsTotal} · 처치 ${rec.kills} · ` +
    `동시적 p50 ${rec.enemy.p50}/p95 ${rec.enemy.p95}/max ${rec.enemy.max} · ` +
    `동시무리 p50 ${rec.packs.p50}/p95 ${rec.packs.p95}/max ${rec.packs.max} · ` +
    `${rec.descended ? "내려감" : rec.died ? "죽음" : "예산끝"} · 벽밖 ${rec.oobPct}% · fp95 ${rec.fp95}ms · 오류 ${rec.consoleErrors}`);
  return rec;
}

const WAKES = (process.env.WAKES || "3000,820").split(",").map(Number);
const CUT_WAKE = Number(process.env.CUT_WAKE || 820);
log(`\n== hs_v207_walk ${new Date().toISOString()} == seed ${SEED} · wakes ${WAKES.join("/")}`);
const records = [];
for (const wake of WAKES) {
  const sess = await open(SEED, wake);
  if (!sess) { log(`WAKE ${wake} 세션 실패`); continue; }
  records.push(await runFloor(sess, SEED, wake, wake === CUT_WAKE));
  if (sess.errs.length) log("  콘솔오류:", sess.errs.slice(0, 4));
  await sess.close();
}
fs.writeFileSync("tmp/hs_v207_walk.json", JSON.stringify({ seed: SEED, records }, null, 2));
log("  ▸ tmp/hs_v207_walk.json");
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
clearTimeout(HARD);
process.exit(0);
