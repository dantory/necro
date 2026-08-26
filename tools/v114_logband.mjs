/* V-114 자 — **일지의 긴 줄이 메뉴 타일에 덮이는가.**
   `#log`(z 15)는 판 폭을 다 쓰고 `#hudMenu` 의 타일(z 29)이 그 한가운데 떠 있다.
   게임에서 가장 긴 줄은 레벨업 줄인데, 옛 글월이 1280 폭에서 타일 왼끝을 **9px** 넘었다.
   `node tools/v114_logband.mjs`

   ★★ **이 자는 두 번 틀렸다** — 남기는 까닭이 그것이다.
     ① 처음엔 `Range` 만 봤다. 줄에 `overflow:hidden` 이 걸리면 상자 밖은 **안 칠해지는데**
        Range 는 글자가 닿는 자리를 준다 — 「칠해진 것」을 재야 한다
        ([[threshold-and-ruler-must-match]]).
     ② 그다음엔 **가로만** 봤다. 타일 띠는 로그의 **아래쪽에만** 걸린다(1280 에서 로그
        326~409 · 타일 363~409) — 갓 뜬 맨 윗줄은 타일보다 **8px 위**라 아무리 길어도
        안 덮인다. 덮이는 것은 둘째·셋째 줄, 곧 **이미 흐려지는 중인 줄**이다.
        그래서 「덮임」은 **가로와 세로가 함께 겹칠 때만** 센다.
     ③ 그리고 흐르는 로그를 곁눈질로 재면 긴 줄이 안 걸려 **0 이 나온다**
        ([[silent-zero-is-not-an-observation]]) — 그래서 줄을 **손수 세워** 잰다. */
import fs from "node:fs";
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

/* 게임이 실제로 내는 줄. 「옛 결」은 **고치기 전** 글월이라 보정에 쓴다 — 자가 그것에서
   울지 않으면 자가 고장난 것이다([[pixel-verification-calibration]]). */
const LINES = [
  ["레벨업(지금)",     '<b style="color:#ffff64">레벨 12</b> 달성 · 스킬 점수 <b>3</b> — <b>T</b> 「스킬」에서 찍는다'],
  ["레벨업(옛 결)",    '<b style="color:#ffff64">레벨 12</b> 달성 · 체력·마나 회복 · 스킬 점수 <b>3</b> — <b>T</b> 「어둠의 길」에서 찍는다'],
  ["레벨업(배분)",     '<b style="color:#ffff64">레벨 12</b> 달성 · 체력·마나 회복 · 스킬 점수 <b>3</b> 배분'],
  ["레벨업(점수 없음)", '<b style="color:#ffff64">레벨 12</b> 달성 · 체력·마나 회복'],
  ["장비(방패)",       '<b>거느리는 나무 방패</b> 착용 — 방패 군세 상한 +1'],
  ["일지",             '<b style="color:#ffcf5a">일지</b> 「첫 무덤을 열다」 달성 · 유해 <b class="t3">+3</b>'],
  ["관문",             '<b>5층</b> · 관문 <b>역병술사</b>가 지키는 중'],
];

/* 세우는 자리(row) 를 골라 가며 잰다 — 0 은 갓 뜬 줄, 2 는 흐려지는 줄. */
const MEASURE = `(lines)=>{
  const L=document.getElementById('log'), M=document.getElementById('hudMenu');
  if(!L||!M) return {err:'no el'};
  const T=[...M.children].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
  if(!T.length) return {err:'no tile'};
  const band={l:Math.min(...T.map(r=>r.left)), r:Math.max(...T.map(r=>r.right)),
              t:Math.min(...T.map(r=>r.top)), b:Math.max(...T.map(r=>r.bottom))};
  const fm=(s)=>{const m=/^(\\s*<b\\b[^>]*>.*?<\\/b>)([\\s\\S]+)$/.exec(s);return m?m[1]+'<i class="d">'+m[2]+'</i>':s;};
  const painted=(el)=>{const g=document.createRange();g.selectNodeContents(el);
    const q=g.getBoundingClientRect(), b=el.getBoundingClientRect();
    return {l:q.left, r:Math.min(q.right,b.right), t:q.top, b:q.bottom};};   /* 칠해진 것만 */
  const out=[];
  for(const [n,h] of lines){
    for(const row of [0,1,2]){
      const keep=L.innerHTML; L.innerHTML='';
      for(let k=0;k<row;k++){const f=document.createElement('div');f.textContent='해골 전사 소환';L.appendChild(f);}
      const d=document.createElement('div'); d.innerHTML=fm(h); L.appendChild(d);
      const p=painted(d);
      const ovx=Math.round(Math.min(p.r,band.r)-Math.max(p.l,band.l));
      const ovy=Math.round(Math.min(p.b,band.b)-Math.max(p.t,band.t));
      out.push({n,row,ovx,ovy,covered:(ovx>0&&ovy>0)?ovx:0});
      L.innerHTML=keep;
    }
  }
  return {tileLeft:Math.round(band.l), out};
}`;

let bad=0, oldBad=0;
for (const [w,h] of [[1512,863],[1366,700],[1280,620]]) {
  await S("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:2,mobile:false});
  await S("Page.reload",{ignoreCache:true}); await wait(1200);
  await ev("(()=>{try{localStorage.clear()}catch(e){}return 1})()");
  await S("Page.reload",{ignoreCache:true}); await wait(2200);
  await ev("window.__openWin&&window.__openWin('dive')"); await wait(300);
  await ev("(()=>{const b=[...document.querySelectorAll('#winDive button,#winDive .cell')].find(e=>/내려가기/.test(e.textContent));if(b)b.click();return 1})()");
  await wait(2000);
  const m = JSON.parse(await ev(`JSON.stringify((${MEASURE})(${JSON.stringify(LINES)}))`));
  if (m.err) { console.log(m.err); continue; }
  console.log(`\n=== ${w}×${h} · 타일 왼끝 ${m.tileLeft} ===`);
  for (const x of m.out) {
    const 옛 = x.n.includes("옛 결");
    if (x.covered > 0) { if (옛) oldBad++; else bad++; }
    if (x.covered > 0 || x.row === 2)
      console.log(`  ${x.covered>0?"덮임 +"+x.covered+"px":"ok        "}  줄${x.row}  ${x.n}`);
  }
}
console.log(`\n덮인 줄 — 지금 글월 **${bad}건** · 옛 글월 ${oldBad}건(보정 · 여기서 울어야 자가 산 것이다)`);
fs.writeFileSync("tmp/v114_logband.json", JSON.stringify({bad,oldBad},null,1));
await S("Target.closeTarget",{targetId});
process.exit(0);
