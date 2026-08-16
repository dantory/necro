/* 새 이펙트를 **눈으로 본다** — 자가 「표에 있다」고 해도 화면에서 읽히는지는 다른 문제다.
   저주·벽·태우기·제물을 한 장씩 찍는다. node tools/fx_shot.mjs */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await ev2(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:20,deepest:14,runs:3,up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1,rot:1,harvest:1}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev2(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(10);return 1;})()`, true);
await wait(2500);
/* 그림이 **먼저 붙게** 한 번 불러 둔다 — sprite() 는 처음 부를 때 null 을 돌려주므로,
   찍자마자 찍으면 아직 안 붙은 그림을 「없다」로 오해한다. */
await ev2(`["fx/curse","fx/bonewall","fx/burnfx","fx/offerfx","fx/raise"].forEach(p=>window.sprite&&window.sprite(p))`);
await wait(1200);
/* ★ 소환(raise)은 **한복판**을 찍어야 보인다 — 솟는 혼은 앞머리에 옅고 중간에 제일 진하다.
   0.05 초만 굴리고 찍으면 알파 0.45 짜리 첫 프레임이라 「거의 안 보인다」로 오해한다. */
for (const [id2, name, extra] of [["amp","curse",0], ["wall","wall",0], ["burn","burn",0],
                                  ["offer","offer",0], ["raise","raise",0.22]]) {
  await ev2(`(async()=>{const B=await import("/js/battle.js"),C=await import("/js/core.js");
    S.speed=0; S.fx.length=0; if(S.walls)S.walls.length=0; S.mobs.length=0; S.piles.length=0;
    S.corpses=40; S.mp=C.mpMaxOf()*10; for(const k in S.cd) delete S.cd[k];
    for(let i=0;i<5;i++) S.mobs.push({id:900+i,kind:"zombie",x:120+i*22,y:-30+i*22,hp:9e9,hpMax:9e9,dmg:5,spd:20,h:50,r:20,atk:1,born:0});
    ${id2 === "offer" ? `S.mobs.push({id:990,kind:"boss",boss:true,x:150,y:0,hp:9e9,hpMax:9e9,dmg:9,spd:12,h:90,r:40,atk:1,born:0,lord:{n:"주인",col:"#d0702c"}});` : ""}
    B.addCorpse(12,8,"small",4,400); B.addCorpse(140,-10,"small",4,400);
    B.cast("${id2}"); B.step(0.05); ${extra ? `B.step(${extra});` : ""} return 1;})()`, true);
  await wait(260);
  const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`tmp/fx_${name}.png`, Buffer.from(s.data, "base64"));
  console.log("wrote tmp/fx_" + name + ".png");
}
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
