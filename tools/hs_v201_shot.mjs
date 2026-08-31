/* V-201 컷 셋 — 「벽이 사람을 막는다」가 눈으로 읽히나. 1512×863 석 장 + 교전 한 장.
 *   tmp/hs_v201_wall.png     벽에 붙어 선 사람
 *   tmp/hs_v201_corridor.png 복도를 지나는 사람
 *   tmp/hs_v201_prop.png     기둥/석상에 막힌 사람
 *   tmp/hs_v201_fight.png    교전 한 장(적이 벽 안에서 제대로 붙나 눈으로 확인)
 * 자리를 직접 옮겨 찍는다(컷이라 이동 정확도 주장 아님) — 걸을 수 있는 자리에 세우고 카메라를 맞춘다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863, SEED = 1337;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WD"); process.exit(9); }, 90000);
await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("to " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: `Math.random=(()=>{let s=${SEED}>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();` });
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: URL });
for (let i = 0; i < 60; i++) { await sleep(300); if (await ev(`!!(window.G&&G.player&&window.HSZ&&document.getElementById('loading').style.display==='none')`)) break; }
await sleep(600);

const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸ " + out); };
// 사람을 (x,y)에 세우고 방향을 (dx,dy)로, 카메라를 사람 중심으로. 걸을 수 있는 자리로 살짝 빼낸다.
const place = (x, y, dx, dy) => `(()=>{const p=G.player,Z=window.HSZ;p.x=${x};p.y=${y};p.dx=${dx};p.dy=${dy};p.state='idle';
  if(window.__walkable && !window.__walkable(p.x,p.y)){for(let s=6;s<=120;s+=6)for(let a=0;a<12;a++){const an=a/12*6.2832,nx=p.x+Math.cos(an)*s,ny=p.y+Math.sin(an)*s;if(window.__walkable(nx,ny)){p.x=nx;p.y=ny;s=999;break;}}}
  cam.x=Math.max(0,Math.min(G.W-innerWidth/Z,p.x-innerWidth/(2*Z)));cam.y=Math.max(0,Math.min(G.H-innerHeight/Z,p.y-innerHeight/(2*Z)));
  return JSON.stringify({x:Math.round(p.x),y:Math.round(p.y)});})()`;

// 좋은 자리를 페이지에서 고른다.
const spots = JSON.parse(await ev(`(()=>{const r=window.__playerR||22;
  let room=G.rooms[1]||G.rooms[0];   // 방 하나 — 위쪽 벽에 붙일 것
  let lc=null,ll=0;for(const c of G.corridors){const len=c.horiz?c.w:c.h;if(len>ll){ll=len;lc=c;}}
  // 막는 소품 하나 — 기둥/석상 우선
  let prop=null;for(const pr of G.blockProps){if(/pillar|statue/.test(pr.img)){prop=pr;break;}}if(!prop)prop=G.blockProps[0]||null;
  const propR=prop?(window.__blockers().find(b=>b.x===prop.x&&b.y===prop.y)||{r:30}).r:0;
  return JSON.stringify({room:{cx:Math.round(room.cx),top:room.y},
    corridor:lc?{cx:Math.round(lc.x+lc.w/2),cy:Math.round(lc.y+lc.h/2),horiz:lc.horiz}:null,
    prop:prop?{x:Math.round(prop.x),y:Math.round(prop.y),r:Math.round(propR)}:null});})()`));

// ① 벽 컷 — 방 위쪽 벽에 바짝 붙여 위를 보게
await ev(place(spots.room.cx, spots.room.top + 22 + 4, 0, -1)); await sleep(200); await shot("tmp/hs_v201_wall.png");
// ② 복도 컷 — 가장 긴 복도 한가운데, 복도를 따라 보게
if (spots.corridor) { const c = spots.corridor; await ev(place(c.cx, c.cy, c.horiz ? 1 : 0, c.horiz ? 0 : 1)); await sleep(200); await shot("tmp/hs_v201_corridor.png"); }
// ③ 소품 컷 — 기둥 바로 아래(카메라 쪽)에 붙여 위를 보게
if (spots.prop) { const pr = spots.prop; await ev(place(pr.x, pr.y + pr.r + 22 + 3, 0, -1)); await sleep(200); await shot("tmp/hs_v201_prop.png"); }

// ④ 교전 컷 — 가장 가까운 산 적으로 가서 잠깐 싸우고 찍는다(적이 벽 안에서 붙나 눈으로)
const AUTO = `(()=>{const doc=document,cv=doc.getElementById('board');const kd=k=>doc.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));const ku=k=>doc.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));const held=new Set();window.__sk=w=>{for(const k of held)if(!w.has(k)){ku(k);held.delete(k);}for(const k of w)if(!held.has(k)){kd(k);held.add(k);}};window.__tap=k=>{kd(k);setTimeout(()=>ku(k),40);};window.__aim=(x,y)=>cv.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true}));cv.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:${VW}/2,clientY:${VH}/2,bubbles:true}));const p=G.player;p.attr={str:20,dex:0,int:0,sta:0,def:0,vit:0};p.skill={slot:0,grade:0,mdmg:0,mhp:0,spear:10,nova:6,curse:2};p.mult={dmg:1,body:1,minionDmg:1};p.buildSlots=0;p.attrPts=0;p.sklPts=0;window.recalc();p.hp=p.maxhp;p.mana=p.maxmana;return 1;})()`;
await ev(AUTO);
const drive = `(()=>{const p=G.player,Z=window.HSZ;let b=null,bd=1e18;for(const pk of G.packs)if(pk.awake)for(const m of pk.enemies)if(m.alive){const d=(m.x-p.x)**2+(m.y-p.y)**2;if(d<bd){bd=d;b=m;}}
  let pk2=null,pd=1e18;for(const q of G.packs){if(q.done)continue;const d=(q.x-p.x)**2+(q.y-p.y)**2;if(d<pd){pd=d;pk2=q;}}
  const tx=pk2?pk2.x:p.x,ty=pk2?pk2.y:p.y,dx=tx-p.x,dy=ty-p.y,w=new Set();
  if(Math.hypot(dx,dy)>120){if(dx>40)w.add('d');else if(dx<-40)w.add('a');if(dy>40)w.add('s');else if(dy<-40)w.add('w');}
  window.__sk(w);if(b){window.__aim((b.x-cam.x)*Z,(b.y-cam.y)*Z);}window.__tap('q');
  let on=0;for(const pk of G.packs)if(pk.awake)for(const m of pk.enemies)if(m.alive){const sx=(m.x-cam.x)*Z,sy=(m.y-cam.y)*Z;if(sx>=0&&sx<=${VW}&&sy>=0&&sy<=${VH})on++;}return on;})()`;
let best = 0;
for (let i = 0; i < 90; i++) { const on = await ev(drive); if (typeof on === "number" && on > best) best = on; await sleep(200); }
await ev(`window.__sk(new Set())`);
await sleep(200); await shot("tmp/hs_v201_fight.png");
log("  교전 컷 화면안 적 최대 " + best);

await raw("Target.closeTarget", { targetId }).catch(() => {});
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close(); process.exit(0);
