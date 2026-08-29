/* hs/ 5차 자 (V-151) — «한 층을 끝까지 돌아 보는» 자. 짐작이 아니라 완주해 보고 잰다.
 *
 *   node tools/hs_p6_run.mjs [before|after]
 *     → tmp/hs_p6_run.json · tmp/hs_p6_run.log
 *     → 컷: tmp/hs_p6_{dungeon,corridor,chest,run_end}[_before].png
 *
 * 왜 (ROADMAP V-151): 여태 자는 전부 «장면을 세워 두고 한 컷»이었다. 아무도 이 게임을
 * 한 층 끝까지 해 본 적이 없다 — 재미의 구멍은 완주해 봐야 나온다. 그래서 이 자는
 * «사람이 하듯» 실제 입력(WASD 키·마우스 클릭/이동)만으로 판을 훑는다:
 *   미니맵의 안 친 무리로 이동 → 만나면 뼈창·소환으로 처리 → 조용해지면 다음 → 계단(F).
 * 내부 함수 직접 호출로 건너뛰지 않는다 — 지름길로 재면 그 길에 없는 결함은 안 잡힌다.
 * 씨앗은 Math.random 을 mulberry32 로 갈아 문서-시작 전에 고정한다(3개 · 재현 가능). */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const MODE = process.argv[2] === "before" ? "before" : "after";
const SUF = MODE === "before" ? "_before" : "";
const LOG = fs.createWriteStream("tmp/hs_p6_run.log", { flags: "a" });
const log = (...a) => { const s = a.join(" "); LOG.write(s + "\n"); process.stdout.write(s + "\n"); };
const HARD = setTimeout(() => { log("WATCHDOG 340s — 강제 종료"); process.exit(9); }, 340000);

const SEEDS = [1337, 4242, 9001];               // 고정 씨앗 셋
const VW = 1512, VH = 863;
const FLOOR_BUDGET = 58000;                       // 한 층에 최대 58초
const TICK = 110;                                 // 봇 제어 주기(ms · 페이싱)

await ensureChrome({ log, force: true });      // 깨끗한 브라우저로 시작(끊긴 eval 잔재 제거)
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── mulberry32 씨앗 심기(문서-시작 전에) + 프레임 시간 표본 ─────────────────
const INJECT = (seed) => `(()=>{
  let s = ${seed} >>> 0;
  Math.random = function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  window.__ft = [];
  (function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
    if(window.__ft.length>3000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now());
})();`;

// 봇의 «눈» — 판 상태를 읽어(읽기는 지름길이 아니다) 다음 수를 정하게 해 준다.
const BOT_DEF = `window.__bot = function(){
  const p=G.player, Z=window.HSZ;
  let pack=null,pd=1e18;
  for(const pk of G.packs){ if(pk.done)continue; if(!pk.enemies.some(e=>e.alive))continue;
    const d=(pk.x-p.x)**2+(pk.y-p.y)**2; if(d<pd){pd=d;pack=pk;} }
  let en=null,ed=1e18;
  for(const pk of G.packs){ if(!pk.awake)continue; for(const e of pk.enemies){ if(!e.alive)continue;
    const d=(e.x-p.x)**2+(e.y-p.y)**2; if(d<ed){ed=d;en=e;} } }
  let awakeNear=0; for(const pk of G.packs){ if(!pk.awake)continue; for(const e of pk.enemies){ if(!e.alive)continue;
    if((e.x-p.x)**2+(e.y-p.y)**2 < 700*700) awakeNear++; } }
  let corpses=0; for(const c of G.corpses) if(!c.used) corpses++;
  let su=0; for(const m of G.minions) su+=m.slot;
  let es=null; if(en){ let x=(en.x-cam.x)*Z, y=(en.y-cam.y)*Z-en.h*Z*0.5;
    x=Math.max(6,Math.min(${VW}-6,x)); y=Math.max(6,Math.min(${VH}-6,y)); es=[Math.round(x),Math.round(y)]; }
  let cleared=0; for(const r of G.rooms) if(r.cleared) cleared++;
  let woke=0; for(const pk of G.packs) if(pk.awake) woke++;
  let co=0; for(const ch of G.chests) if(ch.opened) co++;
  return JSON.stringify({ px:p.x, py:p.y, floor:G.floor, dead:G.dead,
    pack: pack?{x:Math.round(pack.x),y:Math.round(pack.y)}:null,
    enemyD: en?Math.round(Math.sqrt(ed)):1e9, enemyScreen:es, awakeNear:awakeNear,
    corpses:corpses, slotsUsed:su, slots:p.slots, lp:p.levelPoints,
    cleared:cleared, roomsTotal:G.rooms.length-1, woke:woke, packsTotal:G.packs.length,
    chestsOpened:co, chestsTotal:G.chests.length, itemsGround:G.items.length, kills:G.kills, picks:G.picks,
    stairs:{x:G.stairs.x,y:G.stairs.y,d:Math.round(Math.hypot(p.x-G.stairs.x,p.y-G.stairs.y))} });
};
window.__frame = function(wx,wy){ const p=G.player; p.x=wx; p.y=wy; p.dx=0; p.dy=1; p.state='idle';
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, wx-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, wy-innerHeight/(2*HSZ))); };
window.__spots = function(){ let br=G.rooms[0],a=0; for(const r of G.rooms){const ar=r.w*r.h; if(ar>a){a=ar;br=r;}}
  let lc=null,ll=0; for(const c of G.corridors){ const len=c.horiz?c.w:c.h; if(len>ll){ll=len;lc=c;} }
  const ch=G.chests[0]||null;
  return JSON.stringify({ room:{x:br.x+br.w*0.28,y:br.y+br.h*0.24},
    corridor: lc?{x:lc.x+lc.w/2,y:lc.y+lc.h/2}:null, chest: ch?{x:ch.x,y:ch.y+120}:null }); };
// ★ 입력을 «DOM 이벤트»로 준다 — CDP Input 을 키 누른 채 쓰면 evaluate 왕복이 초 단위로
//   밀린다(헤드리스 크롬 151). 게임의 실제 리스너(keydown/mousedown)가 그대로 발화하므로
//   내부 함수를 부르는 «지름길»이 아니다. tap 은 한 버스트 눌렀다 다음 버스트에 떼 상승엣지 1회.
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

// ── 한 세션(한 씨앗) 띄우기 ────────────────────────────────────────────────
async function open(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  const errs = [], neterr = [];
  bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.sessionId !== sessionId) return;
    if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) neterr.push(m.params.response.status + " " + m.params.response.url);
    if (m.method === "Network.loadingFailed" && !/net::ERR_ABORTED/.test(m.params.errorText || "")) neterr.push("FAIL " + m.params.errorText); });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: INJECT(seed) });
  await S("Page.navigate", { url: URL });
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸", out); };
  const key = (k, down) => S("Input.dispatchKeyEvent", { type: down ? "keyDown" : "keyUp", key: k,
    code: "Key" + k.toUpperCase(), windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: k.toUpperCase().charCodeAt(0) });
  const tap = async k => { await key(k, true); await wait(45); await key(k, false); };
  const mouse = (x, y, type, btn) => S("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, buttons: btn });
  // 부팅 대기
  for (let i = 0; i < 24; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
  if (!await ev("!!(window.G && G.player)")) { log("MISS 부팅 실패", errs.slice(0, 4)); await S("Target.closeTarget", { targetId }); return null; }
  await wait(500);                               // 부팅 직후 남은 에셋 응답까지 404 확인
  await S("Network.disable");                    // ★ 스윕 중엔 끈다 — 스프라이트 지연로딩이 Network 이벤트로
  //   WS 를 메워 evaluate 왕복이 초 단위로 밀렸다(진단으로 확인). 404 는 부팅 때 다 드러난다.
  await ev(BOT_DEF);
  return { targetId, sessionId, S, ev, shot, key, tap, mouse, errs, neterr, close: () => raw("Target.closeTarget", { targetId }) };
}

// ── 한 층을 «사람이 하듯» 훑는다 ───────────────────────────────────────────
async function runFloor(sess, seed, floor) {
  const { ev, key, tap, mouse } = sess;
  // 이 층이 실제로 올라올 때까지
  for (let i = 0; i < 30 && (await ev("G.floor")) !== floor; i++) await wait(120);
  await ev("window.__ft.length=0");
  const info = JSON.parse(await ev(`JSON.stringify({W:G.W,H:G.H,rooms:G.rooms.length-1,chests:G.chests.length,packs:G.packs.length})`));
  const picksStart = await ev("G.picks");
  const t0 = Date.now();
  let prev = null, walkDist = 0, fightTime = 0, moveTime = 0, descended = false, lastQ = 0, lastZX = 0, zx = 0;
  // 한 버스트마다 «한 번» __act(입력+감지)를 부른다 — 그 사이엔 evaluate 를 안 던진다.
  const BURST = 360;
  let b = JSON.parse(await ev("window.__bot()"));
  let snap = b;                                            // 계단을 내려가기 «전» 마지막 상태를 붙든다
  while (Date.now() - t0 < FLOOR_BUDGET) {
    try {
      if (prev) walkDist += Math.hypot(b.px - prev.x, b.py - prev.y);
      prev = { x: b.px, y: b.py };
      if (b.floor === floor) snap = b;
      if (b.dead) break;
      if (b.floor > floor) { descended = true; break; }
      if (b.awakeNear > 0) fightTime += BURST / 1000;
      const goal = b.pack || b.stairs;                       // 안 친 무리 → 없으면 계단
      const closeFight = b.awakeNear > 0 && b.enemyD < 230;   // 붙으면 서서 싼다
      const hold = [];
      if (!closeFight) {
        const dx = goal.x - b.px, dy = goal.y - b.py;
        if (Math.hypot(dx, dy) > 66) {
          if (dx > 28) hold.push("d"); else if (dx < -28) hold.push("a");
          if (dy > 28) hold.push("s"); else if (dy < -28) hold.push("w");
        }
      }
      if (hold.length) moveTime += BURST / 1000;
      const tapk = [];
      const now = Date.now();
      if (b.corpses > 0 && b.slotsUsed < b.slots && now - lastQ > 700) { tapk.push("q"); lastQ = now; }
      if (b.lp > 0 && now - lastZX > 900) { tapk.push(zx++ % 2 ? "x" : "z"); lastZX = now; }
      if (!b.pack && b.stairs.d < 62) tapk.push("f");
      const fire = b.awakeNear > 0 && !!b.enemyScreen;
      const fx = fire ? b.enemyScreen[0] : 0, fy = fire ? b.enemyScreen[1] : 0;
      b = JSON.parse(await ev(`window.__act(${JSON.stringify(hold)},${JSON.stringify(tapk)},${fx},${fy},${fire})`));
    } catch (e) { log("  ! 틱 오류(넘어감):", ("" + e.message).slice(0, 80)); try { b = JSON.parse(await ev("window.__bot()")); } catch {} }
    await wait(BURST);
  }
  await ev("window.__act([],[],0,0,false)").catch(() => {});   // 입력 놓기
  for (let i = 0; i < 5 && !descended; i++) {
    const s = JSON.parse(await ev("window.__bot()"));
    if (s.floor > floor) { descended = true; break; }
    if (!s.pack && s.stairs.d < 72) { await ev("window.__act([],['f'],0,0,false)"); await wait(220); }
    else break;
  }
  const ft = JSON.parse(await ev("JSON.stringify(window.__ft)")).sort((a, b) => a - b);
  const p95 = ft.length ? ft[Math.floor(ft.length * 0.95)] : 0;
  const picked = snap.picks - picksStart;
  const tSec = (Date.now() - t0) / 1000;
  const rec = {
    seed, floor, t: +tSec.toFixed(1), descended, died: snap.dead,
    rooms: `${snap.cleared}/${info.rooms}`, roomsCleared: snap.cleared, roomsTotal: info.rooms,
    woke: snap.woke, packsTotal: info.packs,
    picked, dropped: picked + snap.itemsGround, chests: `${snap.chestsOpened}/${info.chests}`,
    kills: snap.kills, walkDist: Math.round(walkDist), fightTime: +fightTime.toFixed(1),
    moveTime: +moveTime.toFixed(1), fightPerKpx: +(fightTime / Math.max(0.1, walkDist / 1000)).toFixed(2),
    fp95: +p95.toFixed(1),
  };
  log(`  [씨앗 ${seed} · B${floor}] ${rec.t}s · 방 ${rec.rooms} · 깨움 ${rec.woke}/${rec.packsTotal} · ` +
    `주움 ${rec.picked}/${rec.dropped} · 상자 ${rec.chests} · 처치 ${rec.kills} · ${rec.descended ? "내려감" : rec.died ? "죽음" : "예산끝"} · ` +
    `걸음 ${rec.walkDist}px · 싸움 ${rec.fightTime}s(비 ${rec.fightPerKpx}) · fp95 ${rec.fp95}ms`);
  return rec;
}

// ── 대표 컷 넉 장(같은 씨앗 · 판 그대로) ────────────────────────────────────
async function framingShots(sess) {
  const { ev, shot } = sess;
  const sp = JSON.parse(await ev("window.__spots()"));
  if (sp.room) { await ev(`__frame(${sp.room.x},${sp.room.y})`); await wait(260); await shot(`tmp/hs_p6_dungeon${SUF}.png`); }
  if (sp.corridor) { await ev(`__frame(${sp.corridor.x},${sp.corridor.y})`); await wait(260); await shot(`tmp/hs_p6_corridor${SUF}.png`); }
  if (sp.chest) { await ev(`__frame(${sp.chest.x},${sp.chest.y})`); await wait(260); await shot(`tmp/hs_p6_chest${SUF}.png`); }
}

// ── 돌린다 ─────────────────────────────────────────────────────────────────
log(`\n== hs_p6_run (${MODE}) ${new Date().toISOString()} ==`);
const records = [];
let allErr = 0, allNet = 0;

// 컷은 첫 씨앗의 «막 부팅한» 깨끗한 판에서 먼저 뜬다(입력 전).
{
  const sess = await open(SEEDS[0]);
  if (sess) {
    await framingShots(sess);
    // 이어서 이 판을 실제로 완주(B1) + 보스층(B2) 한 번
    records.push(await runFloor(sess, SEEDS[0], 1));
    await sess.shot(`tmp/hs_p6_run_end${SUF}.png`);
    if (records[records.length - 1].descended) records.push(await runFloor(sess, SEEDS[0], 2));
    allErr += sess.errs.length; allNet += sess.neterr.length;
    if (sess.errs.length) log("  콘솔오류:", sess.errs.slice(0, 4));
    if (sess.neterr.length) log("  네트워크오류:", sess.neterr.slice(0, 4));
    await sess.close();
  }
}
// 나머지 씨앗은 B1 완주만
for (const seed of SEEDS.slice(1)) {
  const sess = await open(seed);
  if (!sess) continue;
  records.push(await runFloor(sess, seed, 1));
  allErr += sess.errs.length; allNet += sess.neterr.length;
  if (sess.errs.length) log("  콘솔오류:", sess.errs.slice(0, 4));
  if (sess.neterr.length) log("  네트워크오류:", sess.neterr.slice(0, 4));
  await sess.close();
}

const b1 = records.filter(r => r.floor === 1);
const avg = (k) => +(b1.reduce((s, r) => s + r[k], 0) / b1.length).toFixed(1);
const summary = {
  mode: MODE, seeds: SEEDS, floorsMeasured: records.length,
  b1_avg: { t: avg("t"), roomsCleared: avg("roomsCleared"), roomsTotal: b1[0]?.roomsTotal,
    picked: avg("picked"), dropped: avg("dropped"), pickRate: +(avg("picked") / Math.max(1, avg("dropped"))).toFixed(2),
    woke: avg("woke"), kills: avg("kills"), walkDist: avg("walkDist"), fightTime: avg("fightTime"),
    fightPerKpx: avg("fightPerKpx"), fp95: avg("fp95") },
  consoleErrors: allErr, networkErrors: allNet,
};
log("\n-- B1 평균 --");
log(`  완주 ${summary.b1_avg.t}s · 방 ${summary.b1_avg.roomsCleared}/${summary.b1_avg.roomsTotal} · ` +
  `주움비 ${summary.b1_avg.pickRate}(${summary.b1_avg.picked}/${summary.b1_avg.dropped}) · 깨움 ${summary.b1_avg.woke} · ` +
  `처치 ${summary.b1_avg.kills} · 걸음 ${summary.b1_avg.walkDist}px · 싸움 ${summary.b1_avg.fightTime}s · ` +
  `비 ${summary.b1_avg.fightPerKpx} · fp95 ${summary.b1_avg.fp95}ms`);
log(`  콘솔오류 ${allErr} · 네트워크오류 ${allNet}`);
fs.writeFileSync("tmp/hs_p6_run.json", JSON.stringify({ summary, records }, null, 2));
log("  ▸ tmp/hs_p6_run.json");

// CDP 탭 전부 닫기
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
log("CDP 남은 탭 정리 완료");
clearTimeout(HARD);
process.exit(0);
