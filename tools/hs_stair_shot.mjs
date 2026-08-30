/* V-160 — 소품을 «눈으로» 보는 자. 병수님 2026-08-30 08:33:
 *   「에셋 픽셀랩 써서 제대로 뽑아라 · 맵에 오브젝트들 둥둥 떠 있는 거 조치하고」
 *
 *   node tools/hs_prop_shot.mjs  → tmp/hs_v164_stairs.png · tmp/hs_v160_zoom.png
 *
 * 소품 아홉을 넓은 방에 **한 줄로 세워** 색과 접지를 한 컷에 담는다. 필터는 이제 없다.
 * 접지는 눈만으로는 못 믿으니, 같은 자리에서 그림자 y 와 스프라이트 발끝 y 의 차이를
 * 페이지 안에서 재서 같이 뱉는다(매직넘버가 아니라 spriteFoot 이 낸 값).  */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG 150s"); process.exit(9); }, 150000);
const VW = 1512, VH = 863;
await ensureChrome({ log, force: false });
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
await wait(700);

const KEYS = ["pillar","column2","statue","coffin","urn","rubble","bones","bones2","chest","brazier"];
const LINE = `window.__line=function(keys){
  let br=G.rooms[0],a=0; for(const r of G.rooms){const ar=r.w*r.h; if(ar>a){a=ar;br=r;}}
  const cy=br.y+br.h/2, x0=br.x+br.w/2-(keys.length-1)*70/2;
  G.packs=[]; G.minions=[];
  G.props=keys.map((k,i)=>({ img:'decor/'+k+'.png', x:x0+i*70, y:cy, h:(k==='pillar'||k==='statue')?104:62,
                             brazier:k==='brazier' }));
  G.player.x=x0-90; G.player.y=cy; G.player.dx=1; G.player.dy=0; G.player.state='idle';
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, (x0+keys.length*70/2)-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, cy-innerHeight/(2*HSZ)-40));
  return G.props.length; };`;
await ev(LINE);
await ev(`__line(${JSON.stringify(KEYS)})`);
await ev(`(()=>{ let br=G.rooms[0],a=0; for(const r of G.rooms){const ar=r.w*r.h; if(ar>a){a=ar;br=r;}}
  const cx=br.x+br.w/2, cy=br.y+br.h/2;
  G.props=[]; G.decals=[];                       // 계단만 남긴다
  G.stairs.x=cx; G.stairs.y=cy;
  G.player.x=cx-140; G.player.y=cy+40;
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, cx-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, cy-innerHeight/(2*HSZ)));
  return 1; })()`);
await wait(1200);
await shot("tmp/hs_v164_stairs.png");

// ── 접지 자 ── 「제 바닥판을 달고 왔는가」를 **에셋에서** 잰다.
//   화면의 그림자는 spriteFoot 이 「보이는 밑변」에 놓는다. 그런데 에셋이 흐린 흙·풀을
//   아래에 달고 오면 **불투명 아래끝**이 그보다 더 내려가고, 그 차이만큼 물체가 떠 보인다.
//   ([[sprite-brings-its-own-ground]] — 땅이 아니라 그림을 재야 하는 까닭.)
const MEAS = `(async function(){
  const keys=${JSON.stringify(KEYS)}, out=[];
  for(const k of keys){
    const im=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);
      i.src='../assets/decor/'+k+'.png';});
    if(!im){out.push([k,null,null]);continue;}
    const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
    const d=g.getImageData(0,0,im.width,im.height).data;
    let yA=-1,yV=-1;
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i2=(y*im.width+x)*4;
      if(d[i2+3]>24){ if(y>yA)yA=y;
        if(0.299*d[i2]+0.587*d[i2+1]+0.114*d[i2+2]>50 && y>yV)yV=y; }}
    out.push([k, yA, yV, im.height, +(100*(yA-yV)/im.height).toFixed(1)]);
  } return out; })()`;
const m = await (async()=>{ const r=await S("Runtime.evaluate",{expression:MEAS,returnByValue:true,awaitPromise:true}); return r.result?.value; })();
log("\n접지 — 불투명 아래끝 vs «보이는» 아래끝 (벌어질수록 제 바닥판을 달고 온 것)");
for (const r of (m||[])) log("  " + String(r[0]).padEnd(10) + `알파밑 ${String(r[1]).padStart(3)}  보이는밑 ${String(r[2]).padStart(3)}  /${String(r[3]).padStart(3)}px   벌어짐 ${String(r[4]).padStart(5)}%`);
process.exit(0);
