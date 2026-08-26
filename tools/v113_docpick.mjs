/* V-113 자 — 편성 창의 「보는 칸」과 「세우는 편성」이 갈렸는가.
 *   node tools/v113_docpick.mjs        지금
 *   node tools/v113_docpick.mjs old    __DOCPICKOLD=1 (V-113 전 · 「아직」이 붙어도 눌리던 결)
 *     ★ `__DOCLOCKOLD`(V-104 전)가 아니다 — 그건 배지 자체를 지워서 «눌리는가»를 못 잰다.
 * 재는 것:
 *   ① 처음 켠 사람이 「아직」 칸을 눌렀을 때 **지금 편성이 바뀌는가**(바뀌면 안 된다)
 *   ② 발치(docNow)가 참말인가 — 참값은 화면이 아니라 META.doctrine 에서 읽는다
 *   ③ 넷이 결과가 같은 동안 그렇게 적는가
 *   ④ 막이 — 갖춘 사람(구울·골렘 다 찍음)에게는 넷 다 골라지고 옛 결 그대로여야 한다 */
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
const evj=async e=>JSON.parse(await ev(`JSON.stringify(${e})`));
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true}); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument",{source:"window.__DOCPICKOLD=1"});
await S("Page.reload",{ignoreCache:true}); await wait(2600);

const IDS=["balance","bone","flesh","wall"];
const snap = async (doc) => {
  await ev(`(()=>{const c=document.querySelector('[data-doc="${doc}"]');c&&c.click();return 1})()`);
  await wait(220);
  return await evj(`(()=>{const c=document.querySelector('[data-doc="${doc}"]');const g=document.getElementById("docGrid");return {
    lock:c.classList.contains("lock"), badge:!!c.querySelector(".docLock"),
    sel:c.classList.contains("sel"), pv:c.classList.contains("pv"),
    selN:g.querySelectorAll(".cell.sel").length,
    now:document.getElementById("docNow").textContent,
    truth:(window.__META||{}).doctrine||"balance",
    tip:document.getElementById("docTip").innerText.replace(/\\n/g," / ")}})()`);
};
/* 참값을 화면에서 되읽지 않는다 — META 를 창 밖으로 낸다([[silent-zero-is-not-an-observation]]) */
await ev(`(async()=>{const m=await import("./js/core.js");window.__META=m.META;return 1})()`);

const rows=[]; let bad=0;
const run = async (who, prep) => {
  await ev(prep); await wait(200);
  await ev(`window.__openWin("doctrine")`); await wait(500);
  /* ★ 참값은 **core.js 의 SKILLS** 에서 읽는다 — 화면에서 되읽으면 자가 제 고침을 되읽는다.
     (`JSON.stringify(async IIFE)` 는 «{}» 다 — 약속을 그대로 굳히면 자가 조용히 0 을 준다
      [[silent-zero-is-not-an-observation]]. 반드시 안에서 await 하고 나서 굳힌다.) */
  const shutTruth = JSON.parse(await ev(`(async()=>{const m=await import("./js/core.js");return JSON.stringify({ghoul:!m.SKILLS.some(s=>s.id==="ghoul"),golem:!m.SKILLS.some(s=>s.id==="golem")})})()`));
  for (const doc of IDS) {
    const o = await snap(doc);
    const shouldLock = !!({flesh:shutTruth.ghoul, wall:shutTruth.golem}[doc]);
    const errs=[];
    if (o.lock !== shouldLock) errs.push("잠금표시가 참값과 어긋남");
    if (shouldLock && o.truth === doc) errs.push("★ 잠긴 칸을 눌렀는데 지금 편성이 됐다");
    if (!shouldLock && o.truth !== doc) errs.push("★ 열린 칸을 눌렀는데 안 골라졌다");
    if (o.selN !== 1) errs.push("금테가 "+o.selN+"개");
    const NM = {balance:"균형", bone:"해골 위주", flesh:"구울 위주", wall:"골렘 벽"};
    const nowTruth = NM[o.truth];
    if (o.now !== nowTruth) errs.push("★ 발치가 거짓말 — 적힘 «"+o.now+"» 참값 «"+nowTruth+"»");
    if (errs.length) bad += errs.length;
    rows.push([who, doc, o.lock?"잠김":"열림", o.now, o.truth, errs.join(" · ")||"ok"]);
  }
};
await run("처음 켠 사람", `1`);
await run("갖춘 사람", `(async()=>{const m=await import("./js/core.js");m.META.lv=30;m.META.tree={ghoul:1,golem:1,raise:3};m.syncSkills();return 1})()`);

console.log("사람".padEnd(14)+"칸".padEnd(9)+"칸결".padEnd(7)+"발치".padEnd(9)+"참값".padEnd(9)+"판정");
for (const r of rows) console.log(r[0].padEnd(12)+r[1].padEnd(9)+r[2].padEnd(6)+r[3].padEnd(8)+r[4].padEnd(9)+r[5]);
/* ③ 넷이 같은 동안 그렇게 적는가 — 처음 켠 사람으로 다시 */
await ev(`(async()=>{const m=await import("./js/core.js");m.META.lv=1;m.META.tree={};m.syncSkills();return 1})()`);
await ev(`window.__openWin("doctrine")`); await wait(400);
const sameNote = await evj(`(()=>{const c=document.querySelector('[data-doc="bone"]');c.click();return {tip:document.getElementById("docTip").innerText.replace(/\\n/g," / ")}})()`);
const hasSame = /결과가 같다/.test(sameNote.tip);
console.log("\n③ 「결과가 같다」 적힘:", hasSame ? "예" : "아니오", OLD?"(옛 결에서는 아니오가 옳다)":"");
if (!OLD && !hasSame) bad++;
const {data}=await S("Page.captureScreenshot",{format:"png"});
fs.writeFileSync("tmp/v113_"+(OLD?"old":"now")+".png",Buffer.from(data,"base64"));
console.log("\n어긋난 자리:", bad, OLD?"(옛 결 — 울어야 옳다)":"(0 이어야 한다)");
console.log(bad === 0 ? "통과" : "미달 — 편성 창의 「보는 칸」과 「세우는 편성」이 갈리지 않았다");
console.log("  → tmp/v113_"+(OLD?"old":"now")+".png");
await S("Target.closeTarget",{targetId});
process.exit(0);
