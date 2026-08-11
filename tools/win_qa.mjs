/* 마을 창들이 **제대로 그려지나** — 상인·대장간·상태창·트리를 열어 찍고 잰다.
     node tools/win_qa.mjs

   ★★ 이 자는 **두 번 틀린 뒤에** 지금 모양이 됐다(2026-08-12, 병수님
   「마을 상점이나 대장간 ui 제대로 그려지는지도 봐줘」):
     ① **뷰포트 밖으로 나간 것만** 봤다 — 대장간 칸(41×41)에 「어둠의 힘」이 세 줄
        (41×81)로 접혀 **제목과 겹쳐 있었는데** 창 안이라 0 이 나왔다.
        → **형제끼리 겹치는 것**을 잰다.
     ② `__openWin("tree")` 가 없던 이름이라 **아무 일도 안 났는데** 마을 화면을 찍고
        「이상 없음」을 냈다. → 창이 실제로 **열렸는지 먼저 확인**하고, 안 열렸으면
        INVALID 로 멈춘다. 빈 표본은 통과가 아니다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
const ver=await(await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[],netfail=[];
function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));
 if(m.method==="Network.loadingFailed")netfail.push(m.params.errorText);});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");await S("Network.enable");
await S("Emulation.setDeviceMetricsOverride",{width:414,height:860,deviceScaleFactor:3,mobile:true});
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
/* 중간쯤 자란 사람 — 빈 창은 어긋나도 안 보인다. 가방도 채운다. */
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:24500,lv:14,xp:30,deepest:18,runs:5,up:{hp:4,mp:3,dmg:3,army:2},equip:{},bag:[],tree:{bone:3,armor:3,legion:2,rot:1,harvest:1}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4500));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const C=await import("/js/core.js");
  C.META.equip.wand=C.mkItem("wand",3); C.META.equip.robe=C.mkItem("robe",4); C.META.equip.charm=C.mkItem("charm",2);
  C.META.bag=[C.mkItem("wand",2),C.mkItem("robe",3),C.mkItem("charm",4),C.mkItem("wand",4),C.mkItem("robe",1)];
  C.saveMeta(); return 1;})()`});
const wins=["shop","forge","stat","tree"];
for(const w of wins){
  await S("Runtime.evaluate",{expression:`window.__openWin && window.__openWin(${JSON.stringify(w)})`});
  await new Promise(r=>setTimeout(r,700));
  const s=await S("Page.captureScreenshot",{format:"png"});
  fs.writeFileSync(`/tmp/ui_${w}.png`,Buffer.from(s.data,"base64"));
  const r=await S("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
    const wins=[...document.querySelectorAll(".win")].filter(x=>!x.hidden && x.getBoundingClientRect().width>0);
    if(!wins.length) return JSON.stringify({INVALID:"창이 안 열렸다 — 이름이 틀렸거나 여는 길이 없다"});
    const bad=[]; const vw=innerWidth, vh=innerHeight;
    const W=wins[0];
    const els=[...W.querySelectorAll("*")].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.height>0;});
    for(const el of els){
      const b=el.getBoundingClientRect();
      if(b.right>vw+1||b.left<-1||b.bottom>vh+1||b.top<-1)
        bad.push({el:(el.className||el.tagName)+"", 화면밖:[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]});
      /* ★ 제 부모(칸) 밖으로 삐져나간 글자 — 대장간을 놓친 자리가 여기다 */
      const p=el.parentElement, pb=p&&p.getBoundingClientRect();
      if(pb && pb.width>0 && (b.top<pb.top-1||b.bottom>pb.bottom+1||b.left<pb.left-1||b.right>pb.right+1)
         && getComputedStyle(el).position==="absolute")
        bad.push({el:(el.className||el.tagName)+"", 글:(el.textContent||"").slice(0,8),
                  칸밖으로:[Math.round(pb.top-b.top),Math.round(b.bottom-pb.bottom)]});
    }
    return JSON.stringify({창:W.id, 요소:els.length, 문제:bad.slice(0,6)});})()`});
  console.log(w.padEnd(6), r.result.value);
  await S("Runtime.evaluate",{expression:`document.querySelector("[data-close]")?.click()`});
  await new Promise(r=>setTimeout(r,300));
}
console.log("errors:",errs.slice(0,4),"netfail:",netfail.slice(0,4));
await raw("Target.closeTarget",{targetId});bws.close();
