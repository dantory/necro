/* **로그가 반 줄로 잘리지 않는가** — 병수님 2026-08-13 "전투화면에서 메시지 하단부분도 짤리는데".
     node tools/log_qa.mjs [폭 높이]
   ★ 「넘침 0」으로는 못 잡는다 — overflow:hidden 상자는 잘라 놓고도 넘침을 0 으로 답한다.
     그래서 **상자 안쪽 키가 줄높이의 정수배인가**와 **마지막으로 보이는 줄이 통째로
     들어갔는가**(줄의 아래끝 ≤ 상자의 아래끝)를 직접 견준다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const W=+(process.argv[2]||360), H=+(process.argv[3]||800);
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));const ev=async e=>JSON.parse((await S("Runtime.evaluate",{returnByValue:true,expression:e})).result.value);
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:W<900});
await S("Page.navigate",{url:PAGE});await wait(5000);
/* 로그를 **가득 채운다** — 한 줄짜리 판에서는 무엇을 해도 안 잘린다(빈 표본은 통과가 아니다). */
await S("Runtime.evaluate",{expression:"window.__toDungeon(); window.S.speed=8"});await wait(9000);
await S("Runtime.evaluate",{expression:"window.S.speed=1"});await wait(600);
let bad=0;const say=(ok,s)=>{if(!ok)bad++;console.log(`${ok?"  ok":"FAIL"}  ${s}`);};
const o=await ev(`(()=>{const g=document.getElementById("log"),cs=getComputedStyle(g),gb=g.getBoundingClientRect();
  const lh=parseFloat(cs.lineHeight), pt=parseFloat(cs.paddingTop), pb=parseFloat(cs.paddingBottom);
  const inner=gb.height-pt-pb, rows=[...g.children].filter(e=>getComputedStyle(e).display!=="none");
  const bot=gb.bottom-pb; let 잘린줄=null, 접힌줄=0;
  for(const e of rows){const b=e.getBoundingClientRect();
    if(b.height>lh+1) 접힌줄++;
    if(b.top < bot-1 && b.bottom > bot+1) 잘린줄=e.textContent.trim().slice(0,28);}
  return JSON.stringify({줄높이:+lh.toFixed(2),안쪽키:+inner.toFixed(2),
    줄수:+(inner/lh).toFixed(2), 보이는줄:rows.length, 잘린줄, 접힌줄, 글자:cs.fontSize});})()`);
say(Math.abs(o.줄수-Math.round(o.줄수))<0.06, `안쪽 키가 줄 수로 딱 떨어진다 (${o.안쪽키}px / ${o.줄높이}px = ${o.줄수}줄)`);
say(o.잘린줄===null, `허리에서 잘린 줄이 없다 ${o.잘린줄?`→ "${o.잘린줄}…"`:""}`);
say(o.접힌줄===0, `두 줄로 접힌 덩이가 없다 (${o.접힌줄}개)`);
say(o.보이는줄>=2, `표본이 있다 — 보이는 줄 ${o.보이는줄} (한 줄뿐이면 무엇도 못 잡는다)`);
say(errs.length===0,`예외 없음 ${errs.length?"→ "+errs[0]:""}`);
console.log(bad?`\n✗ ${W}×${H}: ${bad}건 실패`:`\n✓ ${W}×${H} 로그: 전부 통과`);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(bad?1:0);
