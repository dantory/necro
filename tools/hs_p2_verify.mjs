/* 실제 코드 경로 검증(주입 아님): 강한 해골이 팩을 썰면 시체가 쌓이고,
   dropLoot/dropBuild 가 돌아 빌드 토큰(+1 소환 자리 / 강화 +1)이 바닥에 떨어지나.
   node tools/hs_p2_verify.mjs */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/hs/index.html";
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
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const t = setTimeout(() => { console.log("WATCHDOG"); process.exit(9); }, 30000);

await wait(2600);
if (!await ev("!!(window.G && G.player)")) { console.log("MISS boot", errs.slice(0, 4)); process.exit(2); }

/* 강한 해골 6기를 팩 위에 얹고 팩을 깨운다. 페이지 루프가 스스로 전투를 돌린다. */
await ev(`(()=>{const p=G.player;let pk=null,bd=1e9;for(const q of G.packs){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;pk=q;}}
  p.x=pk.x;p.y=pk.y;cam.x=p.x-innerWidth/2;cam.y=p.y-innerHeight/2;pk.awake=true;pk.done=false;
  G.minions.length=0;
  for(let i=0;i<6;i++)G.minions.push({base:'minion/skel',x:pk.x+(i*30-75),y:pk.y+40,hp:9999,maxhp:9999,dmg:9999,spd:300,r:26,h:163,tier:2,slot:3,filt:null,dx:0,dy:-1,anim:0,state:'walk',atk:0,target:-1});
  return pk.enemies.length})()`);

let last = {};
for (let i = 0; i < 12; i++) {
  await wait(350);
  last = JSON.parse(await ev(`JSON.stringify({
    alive:G.packs.reduce((a,pk)=>a+pk.enemies.filter(e=>e.alive).length,0),
    kills:G.kills, corpses:G.corpses.length, items:G.items.length,
    builds:G.items.filter(it=>it.item&&it.item.build).length,
    slotTok:G.items.filter(it=>it.item&&it.item.build&&it.item.build.kind==='slot').length,
    enhTok:G.items.filter(it=>it.item&&it.item.build&&it.item.build.kind==='enhance').length,
    golds:G.golds.length })`));
  if (i % 3 === 0) console.log(`  t=${(i * .35).toFixed(1)}s 적${last.alive} 처치${last.kills} 시체${last.corpses} 바닥템${last.items}(빌드${last.builds}) 금${last.golds}`);
  if (last.alive === 0 && last.kills > 0) break;
}
console.log("결과:", JSON.stringify(last));
console.log("판정: 시체>0", last.corpses > 0, "· 처치>0", last.kills > 0, "· 빌드토큰>0", last.builds > 0, "(자리", last.slotTok, "강화", last.enhTok, ")");
console.log("콘솔 오류:", errs.length, errs.slice(0, 5));
await S("Target.closeTarget", { targetId });
process.exit(0);
