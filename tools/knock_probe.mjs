/* **맞을 때 얼마나 밀려 보이나** — 관문에 내려가 보스가 걸어오는 동안 프레임마다
   그려지는 뒤로 밀린 픽셀을 잰다. 밀림은 그리기만 하므로(x,y 는 안 움직인다)
   좌표를 봐서는 안 보이고, 이 자로만 보인다.

   병수님: "보스같은애가 걸어오면서 맞으면 뒤로 물러나고 ... 쭉 와서 공격해야하는거 아니냐"

     node tools/knock_probe.mjs [초] */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||12);
const ver=await(await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];
function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,120));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:14,deepest:16,runs:4,up:{hp:4,mp:3,dmg:3,army:2},equip:{},bag:[],tree:{bone:3,armor:3,legion:2}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4500));
await S("Runtime.evaluate",{expression:"window.__toDungeon&&window.__toDungeon()"});
await new Promise(r=>setTimeout(r,700));
/* 관문으로 바로 들어간다 — 보스가 있어야 잴 수 있다 */
await S("Runtime.evaluate",{awaitPromise:true,expression:
  `(async()=>{const B=await import("/js/battle.js"); B.enterFloor(15); return 1;})()`});
await new Promise(r=>setTimeout(r,6000));
await S("Runtime.evaluate",{expression:`(()=>{
  const S=window.__S; const R=window.__K={fr:[],t0:performance.now()};
  const snap=()=>{ const t=(performance.now()-R.t0)/1000;
    const G=window.__geo||{us:1};
    for(const m of S.mobs){
      const h=(m.h||48)*G.us;                      // 그려지는 키(화면px)
      const k=m.knock??1, f=m.flinch>0?m.flinch/0.18:0;
      R.fr.push({t:+t.toFixed(3), kind:m.kind, boss:!!m.boss,
        밀린px:+(Math.hypot((m.kx||0)*h*0.14,(m.ky||0)*h*0.07)*f*k).toFixed(2),
        키:+h.toFixed(0), 밀림중:f>0?1:0, hp:Math.round(m.hp), hpMax:Math.round(m.hpMax)});
    }
    if(t<${SEC}) requestAnimationFrame(snap); };
  requestAnimationFrame(snap); return "on";})()`});
await S("Runtime.evaluate",{awaitPromise:true,expression:
  `new Promise(r=>{const w=()=>(window.__K.fr.at(-1)?.t>=${SEC}-0.3)?r(1):setTimeout(w,300);w();})`});
const r=await S("Runtime.evaluate",{returnByValue:true,expression:`JSON.stringify(window.__K.fr)`});
const fr=JSON.parse(r.result.value);
const by={};
for(const f of fr){const k=f.boss?"층의 주인":f.kind; (by[k]=by[k]||[]).push(f);}
for(const [k,v] of Object.entries(by)){
  const px=v.map(x=>x.밀린px), on=v.filter(x=>x.밀림중).length;
  const big=px.filter(x=>x>2).length;
  console.log(`${k.padEnd(10)} 표본 ${String(v.length).padStart(5)} · 키 ${v[0].키} · 체력 ${v[0].hpMax}` +
    ` · 밀림중 ${(on/v.length*100).toFixed(0)}% · 뒤로 밀린 px 평균 ${(px.reduce((a,b)=>a+b,0)/px.length).toFixed(2)}` +
    ` 최대 ${Math.max(...px).toFixed(1)} · 2px 넘게 밀린 프레임 ${(big/v.length*100).toFixed(0)}%`);
}
console.log("errors:",errs.slice(0,3));
await raw("Target.closeTarget",{targetId});bws.close();
