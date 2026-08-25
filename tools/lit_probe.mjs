/* V-60b 자 — 던전 소품의 «이름별 수»와 «판이 실제로 얼마나 밝은가»를 함께 잰다.
   ★ 화로를 줄이면 빛도 준다([[equilibrium-pushes-back]]) — 그래서 둘을 한 자로 본다.
   밝기는 stage 캔버스에서 직접 읽는다(스샷 왕복 없이). 몸이 움직이므로 여러 프레임을
   평균낸다 — 한 프레임은 표본 하나다. */
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/index.html";
const FLOORS=(process.argv[2]||"3,12,20").split(",").map(Number);
const ver=await(await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}))};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result)}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>{const r=await S("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||"eval 터짐");
  return r.result?.value};
const W=1512,H=863;
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true});await wait(2600);
if(!(await ev(`typeof window.__toDungeon==="function"`))) throw new Error("__toDungeon 없다");

/** 밝기 — stage 캔버스의 «판이 보이는 띠»만 본다(위 띠·아래 HUD 를 뺀다).
 *  ★ 평균만 재면 이 항목을 못 본다 — 불평은 「밝기가 **고르다**」이지 「어둡다」가 아니다.
 *  그래서 띠를 32x12 칸으로 잘라 **칸별 밝기의 퍼짐**(p90-p10 · 표준편차)을 함께 낸다.
 *  화소 단위로 재면 몸·글자가 잡음을 얹으므로 칸 평균으로 뭉갠다. */
const LIT=`(()=>{const cv=document.getElementById("stage");const g=cv.getContext("2d");
  const dpr=cv.width/cv.clientWidth;
  const y0=Math.round(70*dpr), y1=Math.round((cv.clientHeight-300)*dpr);
  const w=cv.width, h=y1-y0, d=g.getImageData(0,y0,w,h).data;
  const NX=32, NY=12, sum=new Float64Array(NX*NY), cnt=new Uint32Array(NX*NY);
  let all=0,warm=0,n=0;
  for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){
    const i=(y*w+x)*4, r=d[i],gg=d[i+1],b=d[i+2];
    const L=0.299*r+0.587*gg+0.114*b;
    const t=((y*NY/h)|0)*NX+((x*NX/w)|0); sum[t]+=L; cnt[t]++;
    all+=L; if(r-b>26&&r>52) warm++; n++;}
  const tiles=[]; for(let t=0;t<NX*NY;t++) if(cnt[t]) tiles.push(sum[t]/cnt[t]);
  tiles.sort((a,b)=>a-b);
  const q=f=>tiles[Math.min(tiles.length-1,Math.round(f*(tiles.length-1)))];
  const mu=tiles.reduce((a,b)=>a+b,0)/tiles.length;
  const sd=Math.sqrt(tiles.reduce((a,b)=>a+(b-mu)*(b-mu),0)/tiles.length);
  return {lum:all/n, warm:warm/n, p10:q(0.10), p50:q(0.50), p90:q(0.90), sd};})()`;

const out=[];
for(const f of FLOORS){
  await ev(`window.__toDungeon()`); await wait(1200);
  // 층을 맞춘다 — 있는 손잡이를 찾아 쓴다
  const ok=await ev(`(()=>{const S=window.S||window.__S; if(S&&typeof S.floor==="number"){S.floor=${f}; return true} return false})()`);
  await ev(`window.__scatterCount=1; window.__scatterHits=[]`);
  await S("Emulation.setDeviceMetricsOverride",{width:W,height:H-(f%2?1:2),deviceScaleFactor:2,mobile:false});
  await wait(1100);
  const hits=await ev(`(()=>{const h=window.__scatterHits||[];const by={};for(const p of h)by[p[2]]=(by[p[2]]||0)+1;return {total:h.length,by}})()`);
  const acc={lum:0,warm:0,p10:0,p50:0,p90:0,sd:0};const N=8;
  for(let k=0;k<N;k++){const r=await ev(LIT);for(const k2 in acc)acc[k2]+=r[k2];await wait(220)}
  for(const k2 in acc)acc[k2]/=N;
  out.push({f,ok,total:hits.total,by:hits.by,...acc});
  await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
  await wait(500);
}
for(const o of out){
  const top=Object.entries(o.by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(" · ");
  console.log(`${o.f}층  소품 ${o.total}  밝기 ${o.lum.toFixed(2)}  따뜻 ${(o.warm*100).toFixed(2)}%  · 칸 p10 ${o.p10.toFixed(1)} p50 ${o.p50.toFixed(1)} p90 ${o.p90.toFixed(1)} 퍼짐 ${(o.p90-o.p10).toFixed(1)} sd ${o.sd.toFixed(2)}`);
  console.log("      "+top);
}
const brz=out.reduce((s,o)=>s+(o.by.brazier||0),0), tot=out.reduce((s,o)=>s+o.total,0);
const av=k=>out.reduce((s,o)=>s+o[k],0)/out.length;
console.log(`합계  소품 ${tot} · 화로 ${brz} = ${(brz/tot*100).toFixed(1)}%  · 밝기 ${av("lum").toFixed(2)} · 퍼짐 ${(av("p90")-av("p10")).toFixed(1)} · sd ${av("sd").toFixed(2)}`);
await raw("Target.closeTarget",{targetId});process.exit(0);
