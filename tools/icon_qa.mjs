/* **그림이 빠진 칸이 있는가** — 병수님 2026-08-13 18:30 "스킬 중 에셋 작업 안된거 있어 보이고".
     node tools/icon_qa.mjs
   ★ 파일 목록만 대조하면 「쓰이지도 않는 그림」까지 세게 된다. **게임이 실제로 부르는
     주소**를 DOM 에서 뽑아 그 파일이 진짜 뜨는지 본다(naturalWidth 로 확인) —
     background-image 는 404 여도 조용해서, 있는 줄 알고 넘어가기 딱 좋다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>JSON.parse((await S("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:e})).result.value);
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:414,height:900,deviceScaleFactor:2,mobile:true});
await wait(5200);
/* 트리를 다 열어 둔다 — 안 열린 노드도 그림은 있어야 한다(잠긴 칸이 빈칸이면 그게 더 나쁘다) */
await S("Runtime.evaluate",{expression:`(()=>{const M=window.META; M.lv=40;
  for(const k of Object.keys(window.__TREE_IDS||{})) M.tree[k]=1; window.saveMeta(); window.syncTest&&window.syncTest();})()`});
await S("Runtime.evaluate",{expression:`window.__toDungeon(); window.__openWin("tree")`});
await wait(900);
const r = await ev(`(async()=>{
  const urls=new Map();
  /* ★ 트리 칸은 <img src>, 벨트 칸은 background-image 다. background 만 보던 동안
       트리 15칸이 **한 칸도 안 세어졌다** — 「센 칸 6개」가 그 증거였는데 통과가 났다. */
  const push=(el,who)=>{ if(el.tagName==="IMG"){ const s=el.currentSrc||el.getAttribute("src");
      if(s) urls.set(new URL(s, location.href).href, who); return; }
    const bg=getComputedStyle(el).backgroundImage||"";
    const m=bg.match(/url\\("?([^")]+)"?\\)/); if(m) urls.set(m[1], who); };
  for (const el of document.querySelectorAll("#belt .slot i")) push(el, "벨트 "+(el.closest("[data-sk]")||{}).dataset?.sk);
  for (const el of document.querySelectorAll(".tIco")) push(el, "트리 "+(el.closest(".tNode")?.textContent||"").trim().slice(0,10));
  const out=[];
  for (const [u,who] of urls) {
    const ok = await new Promise(res=>{ const im=new Image(); im.onload=()=>res(im.naturalWidth>0); im.onerror=()=>res(false); im.src=u; });
    if(!ok) out.push(who+" ← "+u.split("/").pop());
  }
  return JSON.stringify({빠짐:out, 센칸:urls.size});})()`);
console.log(`검사한 칸 ${r.센칸}개`);
if (r.빠짐.length) { console.log(`FAIL  그림이 안 뜨는 칸 ${r.빠짐.length}개`); for(const x of r.빠짐) console.log("   ·",x); }
else console.log("  ok  빠진 칸 없음");
if (errs.length) console.log("예외:",errs[0]);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(r.빠짐.length?1:0);
