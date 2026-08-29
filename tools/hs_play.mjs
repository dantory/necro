/* hs/ 를 «사람이 하는 대로» 몰아 본다 — 걷고, 팩을 찾아 치고, 떨어진 걸 밟는다.
   재는 것: 금이 실제로 지갑에 들어오는가 · 화면에서 새까만 칸이 몇 %인가 · 이름표가 겹치는가.
   node tools/hs_play.mjs   (tmp/hs_play_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
const key = async (k, code, down) => S("Input.dispatchKeyEvent", { type: down ? "keyDown" : "keyUp", key: k, code, windowsVirtualKeyCode: k.length===1?k.toUpperCase().charCodeAt(0):0, nativeVirtualKeyCode: k.length===1?k.toUpperCase().charCodeAt(0):0 });
const click = async (x, y, down) => S("Input.dispatchMouseEvent", { type: down ? "mousePressed" : "mouseReleased", x, y, button: "left", clickCount: 1, buttons: down?1:0 });
const move = async (x, y) => S("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });

const bail = async (why) => { console.log("BAIL:", why); try { await S("Target.closeTarget", { targetId }); } catch {} process.exit(3); };
process.on("uncaughtException", e => { console.log("BAIL:", e.message); raw("Target.closeTarget", { targetId }); setTimeout(()=>process.exit(3), 300); });

await wait(2500);
const boot = await ev("!!(window.G && G.player)");
if (!boot) { console.log("MISS: G/player 없음 — 부팅 실패"); console.log(errs.slice(0,5)); process.exit(2); }

/* 가장 가까운 팩으로 걸어간다 — 방향키를 실제로 눌러서. */
async function walkTo(tx, ty, ms) {
  const t0 = Date.now(); let held = new Set();
  const set = async (want) => {
    for (const k of held) if (!want.has(k)) { await key(k, "Key" + k.toUpperCase(), false); }
    for (const k of want) if (!held.has(k)) { await key(k, "Key" + k.toUpperCase(), true); }
    held = want;
  };
  while (Date.now() - t0 < ms) {
    const p = await ev("JSON.stringify({x:G.player.x,y:G.player.y})");
    const { x, y } = JSON.parse(p);
    const dx = tx - x, dy = ty - y;
    if (Math.hypot(dx, dy) < 90) break;
    const want = new Set();
    if (dx > 30) want.add("d"); else if (dx < -30) want.add("a");
    if (dy > 30) want.add("s"); else if (dy < -30) want.add("w");
    await set(want);
    await wait(160);
  }
  await set(new Set());
}
const tgt = await ev(`(()=>{const p=G.player;let b=null,bd=1e9;for(const pk of G.packs){if(pk.done)continue;const d=Math.hypot(pk.x-p.x,pk.y-p.y);if(d<bd){bd=d;b=pk;}}return b?JSON.stringify({x:b.x,y:b.y,d:bd}):null})()`);
const T = tgt ? JSON.parse(tgt) : null;
console.log("가장 가까운 적:", T ? `${T.d|0}px` : "없음");
if (T) await walkTo(T.x, T.y, 14000);
console.log("걷고 난 거리:", await ev(`(()=>{const p=G.player;return Math.hypot(p.x-${T?T.x:0},p.y-${T?T.y:0})|0})()`));

/* 마우스를 적 쪽으로 두고 눌러 둔다 — 뼈창 난사 + Q/E */
await move(756, 400);
await click(756, 400, true);
for (let i = 0; i < 16; i++) {
  await wait(500);
  if (i % 6 === 3) { await key("q","KeyQ",true); await wait(40); await key("q","KeyQ",false); }
  if (i % 6 === 5) { await key("e","KeyE",true); await wait(40); await key("e","KeyE",false); }
  const st = await ev(`JSON.stringify({en:G.packs.reduce((a,pk)=>a+pk.enemies.filter(e=>e.alive).length,0),g:G.golds.length,gold:G.gold,it:G.items.length,k:G.kills})`);
  const s = JSON.parse(st);
  if (i % 4 === 0) console.log(`  t=${(i*0.5).toFixed(1)}s 적${s.en} 금알갱이${s.g} 지갑${s.gold} 바닥템${s.it} 처치${s.k}`);
  if (s.en === 0) break;
}
await click(756, 400, false);
await shot("tmp/hs_play_fight.png");

/* 떨어진 것 위를 훑는다 — 금이 실제로 지갑에 들어오나 */
const before = await ev("G.gold");
const spot = await ev(`(()=>{if(!G.golds.length)return null;const g=G.golds[0];return JSON.stringify({x:g.x,y:g.y})})()`);
if (spot) { const s = JSON.parse(spot); await walkTo(s.x, s.y, 7000); await wait(600); }
const after = await ev("G.gold");
console.log(`금: 훑기 전 ${before} → 후 ${after}  (${after>before?"OK 들어온다":"MISS 안 들어온다"})`);
await shot("tmp/hs_play_loot.png");

/* 화면에서 «완전한 검정» 칸이 몇 %인가 — 캔버스만 본다 */
const dark = await ev(`(()=>{const cv=document.querySelector('canvas');const t=document.createElement('canvas');t.width=160;t.height=90;const c=t.getContext('2d');c.drawImage(cv,0,0,160,90);const d=c.getImageData(0,0,160,90).data;let blk=0,n=160*90;for(let i=0;i<d.length;i+=4){if(d[i]<14&&d[i+1]<14&&d[i+2]<14)blk++;}return Math.round(blk/n*100)})()`);
console.log(`캔버스에서 새까만 면적: ${dark}%`);

const lbl = await ev(`JSON.stringify({items:G.items.length})`);
console.log("바닥 이름표 수:", JSON.parse(lbl).items);
const st2 = await ev(`JSON.stringify({gold:G.gold,kills:G.kills,picks:G.picks,dmg:G.player.dmgMul,rooms:G.rooms.filter(r=>r.cleared).length+'/'+G.rooms.length})`);
console.log("판 상태:", st2);
console.log("콘솔 오류:", errs.length, errs.slice(0,4));
await S("Target.closeTarget", { targetId });
process.exit(0);
