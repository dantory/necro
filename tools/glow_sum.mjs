/* V-61 자 — 빛 타일 하나의 «총량»과 «가장자리 계단»을 직접 잰다.
   바닥 굽기는 판마다 소품 수가 달라 밝기가 흔들린다(lit_probe 주석) — 그러니
   여기서는 판을 빼고 **타일 자체**를 견준다. 옛 계단 · 새 기울기 둘 다 여기서 굽는다. */
const CDP="http://127.0.0.1:9333";
const ver=await(await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}))};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result)}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:"about:blank"});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId); await S("Runtime.enable");
const ev=async e=>{const r=await S("Runtime.evaluate",{expression:e,returnByValue:true});
  if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));
  return r.result?.value};
const out = await ev(`(() => {
  const GLOW_PX=6, col="255,180,90", r=270, warm=1.55, squash=0.62;
  const K=1.0553;
  const RAMP=[[0,0.14],[0.14,0.14],[0.365,0.10],[0.535,0.068],[0.70,0.042],[0.85,0.022],[0.92,0],[1,0]].map(([d,a])=>[d,a*K]);
  const n=Math.ceil(r/GLOW_PX), half=(n+1)*GLOW_PX, halfY=Math.ceil((n+1)*GLOW_PX*squash)+2;
  const mk=()=>{const c=document.createElement("canvas");c.width=half*2;c.height=halfY*2;return c;};
  // 옛 길 — 여섯 계단
  const a1=mk(), g1=a1.getContext("2d");
  for(let iy=-n;iy<=n;iy++){const y0=Math.round(halfY+iy*GLOW_PX*squash),y1=Math.round(halfY+(iy+1)*GLOW_PX*squash);
    if(y1===y0)continue;
    for(let ix=-n;ix<=n;ix++){const dx=(ix*GLOW_PX)/r,dy=(iy*GLOW_PX)/r,d=Math.hypot(dx,dy);
      if(d>1)continue; const st=d<0.28?5:d<0.45?4:d<0.62?3:d<0.78?2:d<0.92?1:0; if(!st)continue;
      g1.fillStyle=\`rgba(\${col},\${[0,0.022,0.042,0.068,0.10,0.14][st]*warm})\`;
      g1.fillRect(half+ix*GLOW_PX,y0,GLOW_PX,y1-y0);}}
  // 새 길 — 이어지는 기울기
  const a2=mk(), g2=a2.getContext("2d");
  g2.save(); g2.translate(half,halfY); g2.scale(1,squash);
  const grd=g2.createRadialGradient(0,0,0,0,0,r);
  for(const [d,a] of RAMP) grd.addColorStop(d,\`rgba(\${col},\${(a*warm).toFixed(4)})\`);
  g2.fillStyle=grd; g2.beginPath(); g2.arc(0,0,r,0,Math.PI*2); g2.fill(); g2.restore();
  const stat=(c)=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    let sum=0; const row=[];
    for(let i=3;i<d.length;i+=4) sum+=d[i];
    // 가운데 가로줄의 알파를 훑어 «계단 수»를 센다(같은 값이 이어지다 뚝 떨어지는 자리)
    const y=halfY; let jumps=0, prev=-1, big=0;
    for(let x=0;x<c.width;x++){const a=d[((y*c.width)+x)*4+3];
      row.push(a); if(prev>=0 && Math.abs(a-prev)>=3) {jumps++; big=Math.max(big,Math.abs(a-prev));} prev=a;}
    return {sum, jumps, big, peak:Math.max(...row)};};
  const s1=stat(a1), s2=stat(a2);
  return {old:s1, neu:s2, ratio:+(s2.sum/s1.sum).toFixed(4)};
})()`);
console.log(JSON.stringify(out,null,1));
await raw("Target.closeTarget",{targetId});
process.exit(0);
