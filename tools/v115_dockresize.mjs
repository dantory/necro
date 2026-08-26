/* V-115 — **능력치+가방 한 벌은 «열 때» 한 번만 판정한다.** 창 크기를 1200px 아래로
   줄이면 도킹 CSS(@media min-width:1200)는 꺼지는데 `body.charOpen` 은 그대로 남아,
   두 장이 통째로 겹쳐 선다. 여기서 재는 것:
     ① 두 프레임이 겹친 넓이 (작은 쪽의 %)
     ② 화면에 선 페이퍼 돌 수 (1 이어야 한다)
     ③ charOpen 표식이 matchMedia 판정과 어긋나는가
   문: `node tools/v115_dockresize.mjs old` → __DOCKOLD 로 고치기 «전»을 잰다. */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0; const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const size=async(w,h)=>{await S("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:2,mobile:false});await wait(700)};
const shot=async(n)=>{const {data}=await S("Page.captureScreenshot",{format:"png"});fs.writeFileSync("tmp/"+n+".png",Buffer.from(data,"base64"));return "tmp/"+n+".png"};

await size(1512,863);
await S("Page.reload",{ignoreCache:true}); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload",{ignoreCache:true}); await wait(2200);
if (OLD) await ev(`globalThis.__DOCKOLD=1`);

const READ = `(()=>{
  const on=(id)=>document.getElementById(id).classList.contains('on');
  const R=(id)=>{const f=document.querySelector('#'+id+' > .frame');if(!f||!on(id))return null;const r=f.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}};
  const a=R('winStat'), b=R('winBag');
  let lap=0, lapPct=0;
  if(a&&b){const ox=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
           const oy=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
           lap=Math.round(ox*oy); lapPct=+(100*lap/Math.min(a.w*a.h,b.w*b.h)).toFixed(1);}
  /* 눈에 보이는 페이퍼 돌 — display:none 인 것은 안 센다 */
  const dolls=[...document.querySelectorAll('.pdoll')].filter(e=>e.offsetParent).length;
  const feet =[...document.querySelectorAll('.winFoot')].filter(e=>e.offsetParent&&e.closest('#winStat,#winBag')).length;
  const cls=document.body.classList.contains('charOpen');
  const mq=matchMedia('(min-width: 1200px)').matches;
  return JSON.stringify({stat:!!a,bag:!!b,a,b,lap,lapPct,dolls,feet,cls,mq,mismatch:cls!==mq})
})()`;

const rows=[];
for (const step of [["연다 1512",1512,863],["줄인다 1100",1100,760],["줄인다 1199",1199,760],["늘린다 1512",1512,863],["줄인다 900",900,700]]) {
  const [label,w,h]=step;
  if (label.startsWith("연다")) { await ev(`window.__openWin('stat')`); await wait(500); }
  else { await size(w,h); await wait(500); }
  const r=JSON.parse(await ev(READ));
  rows.push([label,r]);
  console.log(`${label.padEnd(12)} (${w}×${h})  창 ${r.stat?'능력치':'—'}${r.bag?'+가방':''}  겹침 ${r.lap}px² (${r.lapPct}%)  페이퍼돌 ${r.dolls}  발치 ${r.feet}  charOpen ${r.cls} / mq ${r.mq}${r.mismatch?'  ★어긋남':''}`);
  if (w===1100) console.log("  " + await shot((OLD?"v115_old_":"v115_new_")+"1100"));
}
/* ══ 막이 ══ 「줄여서 된 한 장」이 «처음부터 좁게 연 한 장»과 같은가.
   같지 않으면 고침이 새로운 결을 하나 더 만든 것이다(과잉 수정). */
await ev(`window.__closeAll&&window.__closeAll()`); await wait(200);
await size(1100,760);
await ev(`window.__openWin('stat')`); await wait(600);
const fresh=JSON.parse(await ev(READ));
const resized=rows.find(([l])=>l==="줄인다 1100")[1];
const same = ["stat","bag","dolls","feet","cls"].every(k=>JSON.stringify(fresh[k])===JSON.stringify(resized[k]));
console.log(`\n막이 · 처음부터 1100 에서 연 한 장  창 ${fresh.stat?'능력치':'—'}${fresh.bag?'+가방':''} 페이퍼돌 ${fresh.dolls} 발치 ${fresh.feet} charOpen ${fresh.cls} → 줄여서 된 것과 ${same?'같다':'★다르다'}`);
const bad = rows.filter(([,r])=>r.mismatch).length;
const lapBad = rows.filter(([,r])=>r.lapPct>1).length;
const dollBad = rows.filter(([,r])=>r.dolls>1).length;
console.log(`\n판정: 표식 어긋남 ${bad}/${rows.length} · 겹친 자리 ${lapBad}/${rows.length} · 페이퍼돌 둘 ${dollBad}/${rows.length}`);
fs.writeFileSync("tmp/v115_dock_"+(OLD?"old":"new")+".json", JSON.stringify(rows,null,1));
await S("Target.closeTarget",{targetId});
process.exit(0);
