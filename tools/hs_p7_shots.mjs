/* hs/ 6차 컷 (V-154) — 소환수 대형과 상자를 «눈으로» 확인하는 자.
 *
 *   node tools/hs_p7_shots.mjs
 *     → tmp/hs_p7_summon_3.png · _8.png · _21.png  (대형: 셋·여덟·스물하나)
 *     → tmp/hs_p7_chest.png                        (키운 상자 + 빛기둥, 좀비에 가려도 보이나)
 *
 * 씨앗 1337 고정. 소환수·좌표는 화면 확인용으로 페이지 안에서 직접 세운다(게임 지표가
 * 아니라 «보이는가»를 재는 컷이라 지름길이어도 무방하다). 상자 컷은 좀비를 상자 위에
 * 세워 «가려도 위치 표식이 뜨는가»를 본다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const HARD = setTimeout(() => { log("WATCHDOG 120s — 강제 종료"); process.exit(9); }, 120000);
const VW = 1512, VH = 863;

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

const INJECT = `(()=>{ let s=1337>>>0; Math.random=function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s);
  t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; })();`;

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
await S("Page.navigate", { url: URL });
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸", out); };
for (let i = 0; i < 24; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
await wait(600);

// 소환수 N마리를 플레이어에 세우는 헬퍼 — 넓은 방 가운데로 옮기고 적을 치운다.
const SETUP = `window.__setup=function(n){
  let br=G.rooms[0],a=0; for(const r of G.rooms){const ar=r.w*r.h; if(ar>a){a=ar;br=r;}}
  const cx=br.x+br.w/2, cy=br.y+br.h/2;
  G.player.x=cx; G.player.y=cy; G.player.dx=0; G.player.dy=1; G.player.state='idle';
  G.packs=[];
  G.minions=Array.from({length:n},()=>({ base:'minion/skel', x:cx+(Math.random()*24-12), y:cy+(Math.random()*24-12),
    hp:100,maxhp:100,dmg:10,spd:250,atkCd:0.6,r:15,h:96,tier:0,slot:1,cleave:0,ring:2.5,ringCol:'#3d78c8',
    shake:0,filt:null,dx:0,dy:1,anim:0,state:'idle',atk:0,target:-1 }));
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, cx-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, cy-innerHeight/(2*HSZ)));
  return G.minions.length; };`;
await ev(SETUP);

for (const n of [3, 8, 21]) {
  await ev(`__setup(${n})`);
  await wait(2000);                       // 대형이 자리잡을 시간(따르기+separation 수렴)
  await shot(`tmp/hs_p7_summon_${n}.png`);
}

// 상자 컷 — 상자 하나를 골라 좀비를 그 위에 세우고, 플레이어를 옆에 둔다.
const CHEST = `window.__chest=function(){
  const ch=G.chests[0]; if(!ch) return 'no-chest';
  ch.opened=false;
  G.player.x=ch.x-120; G.player.y=ch.y+56; G.player.dx=1; G.player.dy=0; G.player.state='idle';
  G.minions=[];
  G.packs=[{x:ch.x,y:ch.y,awake:true,done:false,room:0,enemies:[{ id:9001, base:'mob/zombie', x:ch.x, y:ch.y+2,
    hp:44,maxhp:44,dmg:9,spd:0,h:129,r:23,gold:[5,11],dx:0,dy:1,elite:false,hit:0,kb:{x:0,y:0},atk:0,anim:0,alive:true }]}];
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, ch.x-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, ch.y-innerHeight/(2*HSZ)));
  return {x:ch.x,y:ch.y}; };`;
await ev(CHEST);
const c = await ev("JSON.stringify(__chest())");
log("  chest:", c);
await wait(700);
await shot("tmp/hs_p7_chest.png");

// 계단 컷 — 계단 옆에 플레이어를 세운다(V-156: 초록 네모였던 자리).
const STAIRS = `window.__stairs=function(){
  const s=G.stairs; if(!s) return 'no-stairs';
  G.player.x=s.x-110; G.player.y=s.y+60; G.player.dx=1; G.player.dy=0; G.player.state='idle';
  G.minions=[]; G.packs=[];
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, s.x-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, s.y-innerHeight/(2*HSZ)));
  return {x:s.x,y:s.y}; };`;
await ev(STAIRS);
log("  stairs:", await ev("JSON.stringify(__stairs())"));
await wait(700);
await shot("tmp/hs_p7_stairs.png");

await raw("Target.closeTarget", { targetId });
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
clearTimeout(HARD);
log("done");
process.exit(0);
