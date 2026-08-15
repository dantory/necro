/* 구슬 위 숫자판이 **늘 글자를 감싸는지** — 자릿수가 불어난 최악까지 본다. */
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0; const pend=new Map(); const errs=[];
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
  if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
  if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,120));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const out=[];
for(const [w,h] of [[414,860],[360,760],[900,900]]){
  await S("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:2,mobile:w<560});
  await S("Page.reload",{ignoreCache:true}); await wait(1800);
  for(const val of ['<b>100</b><i>/100</i>','<b>398.1k</b><i>/412.5k</i>']){
    const r=await ev(`(()=>{const o={};for(const id of ['hpNum','mpNum']){const n=document.getElementById(id);
      n.innerHTML=${JSON.stringify(val)};
      const nb=n.getBoundingClientRect(),b=n.querySelector('b').getBoundingClientRect(),i=n.querySelector('i').getBoundingClientRect();
      o[id]={plate:+nb.width.toFixed(1), pad:+Math.min(b.left-nb.left, nb.right-i.right).toFixed(1),
             offL:+nb.left.toFixed(1), offR:+(innerWidth-nb.right).toFixed(1)};}
      return o;})()`);
    out.push({w,val:val.includes('398')?'398.1k/412.5k':'100/100',...r});
  }
}
console.log(JSON.stringify(out,null,1)); console.log("errs",errs);
const bad=out.filter(o=>o.hpNum.pad<2||o.mpNum.pad<2||o.hpNum.offL<0||o.mpNum.offR<0);
console.log(bad.length? "FAIL "+JSON.stringify(bad) : "PASS — 판이 늘 글자를 감싸고(pad>=2) 화면 밖으로도 안 나간다");
await S("Target.closeTarget",{targetId}).catch(()=>{}); bws.close(); process.exit(bad.length?1:0);
