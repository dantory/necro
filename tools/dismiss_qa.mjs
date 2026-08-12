/* **창 밖을 누르면 닫히는가** — 진짜 탭으로 확인한다(병수님 2026-08-13).
     node tools/dismiss_qa.mjs [폭 높이]
   ★ 정산(winEnd)만은 **안 닫혀야** 한다 — 다시 못 여는 보고라서 스친 손가락에 사라지면 안 된다.
   ★ 창을 닫는 그 한 번의 누름이 **마을 건물까지 눌러** 다른 창을 열면 안 된다(capture 로 삼킨다). */
const CDP="http://127.0.0.1:9333"; const W=+(process.argv[2]||1440), H=+(process.argv[3]||900);
const PAGE="http://127.0.0.1:8774/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));const ev=async e=>JSON.parse((await S("Runtime.evaluate",{returnByValue:true,expression:e})).result.value);
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url:PAGE});await wait(5000);
let bad=0; const say=(ok,s)=>{if(!ok)bad++;console.log(`${ok?"  ok":"FAIL"}  ${s}`);};
const tap=async(x,y)=>{await S("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",clickCount:1});
                       await S("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",clickCount:1});await wait(350);};
const open=async w=>{await S("Runtime.evaluate",{expression:`window.__openWin(${JSON.stringify(w)})`});await wait(400);};
const on=async w=>ev(`document.getElementById(${JSON.stringify(w)}).classList.contains("on")+""`).then(v=>v===true||v==="true");
const onOf=async w=>(await S("Runtime.evaluate",{returnByValue:true,expression:`document.getElementById(${JSON.stringify(w)}).classList.contains("on")`})).result.value;

/* ① 마을·던전 양쪽에서, 네 창이 바깥 클릭에 닫힌다 */
for (const where of ["마을","던전"]) {
  if (where==="던전") { await S("Runtime.evaluate",{expression:"window.__toDungeon()"}); await wait(1200); }
  for (const w of ["stat","tree","shop","forge"]) {
    if (where==="던전" && (w==="shop"||w==="forge")) continue;      // 상인·대장간은 마을 것
    await open(w);
    const id2 = {stat:"winStat",tree:"winTree",shop:"winShop",forge:"winForge"}[w];
    if (!await onOf(id2)) { say(false, `${where} ${w}: 열리지도 않았다`); continue; }
    /* **「바깥」을 자가 찾는다** — 좁은 화면에서는 창틀이 폭을 꽉 채워 오른쪽 여백이
       없다(폰에서 x=W-24 는 창 안이다). 창틀을 재서 위·아래·좌·우 중 실제로 비어 있는
       자리를 고른다. 자리를 못 찾으면 통과가 아니라 INVALID 다. */
    const sp = await ev(`(()=>{const f=document.querySelector("#"+${JSON.stringify(id2)}+" .frame").getBoundingClientRect();
      const cands=[[${W}-12, Math.round(f.top+f.height/2)], [12, Math.round(f.top+f.height/2)],
                   [Math.round(f.left+f.width/2), Math.max(4, Math.round(f.top-12))],
                   [Math.round(f.left+f.width/2), Math.min(${H}-4, Math.round(f.bottom+12))]];
      for (const [x,y] of cands) { const e=document.elementFromPoint(x,y);
        if (e && !e.closest(".frame")) return JSON.stringify({x,y,닿는것:e.id||e.className||e.tagName}); }
      return JSON.stringify(null);})()`);
    if (!sp) { say(false, `${where} ${w}: 창 바깥이 화면에 없다(잴 수 없음)`); continue; }
    await tap(sp.x, sp.y);
    const still = await onOf(id2);
    const other = await ev(`JSON.stringify([...document.querySelectorAll(".win.on")].map(e=>e.id))`);
    say(!still && other.length===0, `${where} ${w}: 바깥 클릭에 닫힌다 ${other.length?"(남음 "+other.join()+")":""}`);
  }
}
/* ② Esc 로도 닫힌다 */
await open("stat");
await S("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
await S("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
await wait(300);
say(!await onOf("winStat"), `Esc 로 닫힌다`);
/* ③ 같은 단추를 다시 부르면 토글로 닫힌다 */
await open("tree"); await open("tree");
say(!await onOf("winTree"), `같은 창을 다시 열면 닫힌다(토글)`);
/* ④ 정산은 **안 닫힌다** — 다시 못 여는 보고 */
await open("end");
await tap(W-24, Math.round(H*0.55));
say(await onOf("winEnd"), `정산은 바깥 클릭에 안 닫힌다`);
await S("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
await S("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
await wait(300);
say(await onOf("winEnd"), `정산은 Esc 로도 안 닫힌다`);
say(errs.length===0, `예외 없음 ${errs.length?"→ "+errs[0]:""}`);
console.log(bad?`\n✗ ${bad}건 실패`:`\n✓ 창 닫힘: 전부 통과`);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(bad?1:0);
