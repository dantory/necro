/* **얼마나 빨라 보이나** — 걷는 속도를 **화면 픽셀**과 **제 몸 폭의 몇 배/초**로 잰다.
   여태 자들은 「걷는다/안 걷는다」만 봤지 빠르기를 안 쟀다 — 그래서 「제자리에만
   있다」(병수님 2026-08-12)를 못 잡았다. 사람 눈은 「초당 제 몸 몇 개를 가나」로 본다.
     node tools/speed_probe.mjs [초] */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||20);
const ver=await(await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];
function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");await S("Network.enable");
await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:16,deepest:14,runs:3,up:{hp:3,mp:2,dmg:2,army:2},equip:{},bag:[],tree:{bone:2,armor:3,legion:2}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4800));
await S("Runtime.evaluate",{expression:"window.__toDungeon&&window.__toDungeon()"});
await new Promise(r=>setTimeout(r,700));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");B.enterFloor(12);return 1;})()`});
await new Promise(r=>setTimeout(r,6000));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{
  const SP=await import("/js/sprite8.js"); const S=window.__S;
  const R=window.__V={t0:performance.now(),by:{},prev:{},last:performance.now()};
  const SQ=0.78;
  const snap=()=>{
    const G=window.__geo; const now=performance.now(); const dt=(now-R.last)/1000; R.last=now;
    if(dt>0 && dt<0.2 && G){
      const all=S.minions.filter(u=>u.rise<=0).map(u=>({u,side:"아군",art:"minion/"+u.kind}))
              .concat(S.mobs.map(u=>({u,side:"적",art:"mob/"+u.kind})));
      for(const {u,side,art} of all){
        const p=R.prev[u.id];
        if(p){ /* 화면 픽셀로 옮긴 거리 */
          const dx=(u.x-p.x)*G.sc, dy=(u.y-p.y)*G.sc*G.squash;
          const v=Math.hypot(dx,dy)/dt;
          if(v>2){ const fm=SP.footMetrics(art)||{bodyWidthFrac:.5};
            const bw=(u.h||48)*G.us*fm.bodyWidthFrac;      // 그려지는 몸 폭(화면px)
            const k=side+" "+u.kind; (R.by[k]=R.by[k]||[]).push([v, v/bw]); } }
        R.prev[u.id]={x:u.x,y:u.y};
      }
    }
    if((now-R.t0)/1000<${SEC}) requestAnimationFrame(snap);};
  requestAnimationFrame(snap); return "on";})()`});
await S("Runtime.evaluate",{awaitPromise:true,expression:`new Promise(r=>setTimeout(()=>r(1), ${SEC*1000+900}))`});
const r=await S("Runtime.evaluate",{returnByValue:true,expression:`(()=>{const R=window.__V;const o={};
 for(const k in R.by){const a=R.by[k]; const px=a.map(x=>x[0]).sort((x,y)=>x-y), bw=a.map(x=>x[1]).sort((x,y)=>x-y);
   o[k]={표본:a.length, 화면px초:+px[px.length>>1].toFixed(1), 제몸폭_초:+bw[bw.length>>1].toFixed(2)};}
 return JSON.stringify(o,null,1);})()`});
console.log(r.result.value);
console.log("   (사람이 걷는 느낌 = 초당 제 몸 폭의 1.2~2.0배. 0.7 아래면 「굼뜨다」로 읽힌다)");
console.log("errors:",errs.slice(0,3));
await raw("Target.closeTarget",{targetId});bws.close();
