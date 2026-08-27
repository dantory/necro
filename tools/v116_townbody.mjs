/* V-116 자 — **마을이 보여 주는 몸이 «내려갈 때의 몸»인가.**
   `toTown` 이 글로 적어 둔 약속(「내려갈 때의 몸이 지금 보이는 몸이다」)을 그대로 잰다.
   재는 것:
     ① 마을에서 읽은 hpMax·mpMax·군세 상한이 **바로 다음 판 첫 프레임**의 그것과 같은가
     ② 구슬 글자(hpNum·mpNum)와 아래 줄(gArmy)이 같은 말을 하는가
     ③ 막이 — **판 안은 한 톨도 안 바뀌어야 한다**(층·몸·상한을 옛 결과 견준다)
   ★ 값은 화면 글자가 아니라 **core.js 에 직접 물어** 읽는다 — 화면에서 되읽으면
     자가 제 고침을 되읽는다([[silent-zero-is-not-an-observation]]).
   ★ 걷는 길은 사람이 걷는 길 그대로다 — 마을 → 입구 → 내려가기 → 놀다 → 나가기
     ([[probe-must-walk-the-real-path]]). `S.floor` 를 손으로 박지 않는다.
   문: `node tools/v116_townbody.mjs old` → `__TOWNBODYOLD` 로 고치기 «전»을 잰다. */
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
const shot=async n=>{const{data}=await S("Page.captureScreenshot",{format:"png"});fs.writeFileSync("tmp/"+n+".png",Buffer.from(data,"base64"));return "tmp/"+n+".png";};

await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true}); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload",{ignoreCache:true}); await wait(2600);
if (OLD) await ev(`window.__TOWNBODYOLD=1`);
/* core 를 직접 문다 — 화면이 아니라 참값을 읽는 길 */
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

const READ = `(()=>{const C=globalThis.__C, S=C.S, t=id=>{const e=document.getElementById(id);return e?e.textContent.trim():'?'};
  return JSON.stringify({ at:MODE.at, floor:S.floor|0, start:C.startFloor(),
    hpMax:Math.round(C.hpMaxOf()), mpMax:Math.round(C.mpMaxOf()), cap:C.armyCap(),
    hpTxt:t('hpNum'), mpTxt:t('mpNum'), armyTxt:t('gArmy'), lv:C.META.lv, gold:C.META.gold|0,
    up:JSON.stringify(C.META.up) })})()`;
/* ★ **처음 댄 자는 안 움직였다** — 귀퉁이의 「빨강−파랑」은 관문이든 아니든 23 이었다.
   마을 바닥이 원래 흙빛(빨강 > 파랑)이라 **그 상수를 재고 있었던 것**이다
   ([[floor-far-from-threshold]] · [[knob-that-does-nothing]]).
   그래서 문턱을 버리고 **견줌**으로 바꾼다: 같은 마을을 «관문 층 표»와 «관문 아닌 층 표»
   두 번 그려 캔버스를 통째로 견준다. 비네트가 뜨면 두 그림이 다르고, 안 뜨면 **바이트까지
   같다** — 문턱을 고를 일이 없다([[threshold-and-ruler-must-match]]). */
const SNAP = `(()=>{const c=document.querySelector('canvas#stage')||document.querySelector('canvas');
  const g=c.getContext('2d'); const d=g.getImageData(0,0,c.width,c.height).data;
  let h=2166136261; for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619)}
  /* 귀퉁이 넷의 붉기도 같이 준다 — 다를 때 «어느 쪽이 붉은가»를 말해야 한다 */
  const pts=[[6,6],[c.width-8,6],[6,c.height-8],[c.width-8,c.height-8]];
  let s=0; for(const [x,y] of pts){const p=g.getImageData(x,y,2,2).data; s+=(p[0]-p[2]);}
  return JSON.stringify({h:h>>>0, red:+(s/4).toFixed(1)})})()`;

/* ★ **판의 몸은 «걸어 들어간 그 순간»에 읽는다.** 처음엔 3.4초 뒤에 읽었는데, 그 사이에
   판이 진짜로 굴러서(레벨이 오르고 금이 탄다) 멀쩡한 고침이 두 자리 틀린 것으로 나왔다
   ([[same-seed-is-not-same-run]] 과 같은 병 — 벽시계가 값에 섞였다). 250ms 면 첫 프레임은
   섰고 auto() 의 첫 차례(0.35초)는 아직이다. */
const go=async(settle=2200)=>{ await ev(`(()=>{const g=document.getElementById('goGate')||[...document.querySelectorAll('.hBtn,button')].find(b=>/입구/.test(b.textContent));if(g)g.click();return 1})()`); await wait(700);
  await ev(`(()=>{const b=[...document.querySelectorAll('#winDive button')].find(e=>/내려가기/.test(e.textContent));if(b)b.click();return 1})()`); await wait(settle); };
const out=async()=>{ await ev(`(()=>{const b=[...document.querySelectorAll('button,.hBtn')].find(e=>/나가기/.test(e.textContent));if(b)b.click();return 1})()`); await wait(1500);
  await ev(`(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.offsetParent).find(e=>/마을로|확인|닫기|계속/.test(e.textContent));if(b)b.click();return 1})()`); await wait(1800); };
const pick=async(f)=>{ await ev(`(()=>{const g=document.getElementById('goGate')||[...document.querySelectorAll('.hBtn,button')].find(b=>/입구/.test(b.textContent));if(g)g.click();return 1})()`); await wait(700);
  const got=await ev(`(()=>{const b=[...document.querySelectorAll('#winDive [data-dive]')].find(e=>+e.dataset.dive===${f});if(b){b.click();return b.textContent.trim()}return null})()`); await wait(400);
  await ev(`(()=>{const b=[...document.querySelectorAll('#winDive button')].find(e=>/그만두기/.test(e.textContent));if(b)b.click();return 1})()`); await wait(600);
  return got; };

console.log(OLD ? "── 옛 결(__TOWNBODYOLD) ──" : "── 지금 결 ──");
const rows=[];
/* 세 바퀴 — 노는 시간을 달리해 **나오는 층이 갈리게** 한다(같은 층만 보면 못 잡는다) */
let round=0;
for (const sec of [70, 55, 45]) {
  round++;
  await go(); await wait(sec*1000);
  const inRun = JSON.parse(await ev(READ));
  await out();
  const town = JSON.parse(await ev(READ));
  const red  = JSON.parse(await ev(SNAP)).red;
  await go(250);
  const next = JSON.parse(await ev(READ));
  /* ★ **내려가는 길에 금이 타면 몸이 커진다**(core.js autoForge — 판 안 auto() 가 부른다).
     그건 마을이 거짓말한 것이 아니라 **그 사이에 진짜로 일어난 일**이다. 둘을 안 가르면
     자가 멀쩡한 고침을 틀렸다고 운다([[cause-written-in-the-item-is-a-guess]]).
     그래서 강화가 갈린 바퀴는 **따로 적는다** — 판정에는 「층 때문에 갈린 것」만 센다. */
  const 금탐 = town.up !== next.up;
  const 어긋남 = 금탐 ? [] : ["hpMax","mpMax","cap"].filter(k=>town[k]!==next[k]);
  const 날것  = ["hpMax","mpMax","cap"].filter(k=>town[k]!==next[k]);
  const 글자어긋남 = (town.hpTxt!==next.hpTxt?1:0)+(town.armyTxt.replace(/\/.*/,'')!==next.armyTxt.replace(/.*\//,'')?0:0);
  rows.push({round, 나온층:inRun.floor, 마을:town, 다음판:next, 어긋남, 날것, 금탐, red});
  console.log(`${round}바퀴 · ${sec}초 · ${inRun.floor}층에서 나옴 → 마을 hp${town.hpMax} mp${town.mpMax} 군세${town.cap} 「${town.hpTxt}」`
    + `  /  다음 판(${next.floor}층) hp${next.hpMax} mp${next.mpMax} 군세${next.cap} 「${next.hpTxt}」`
    + (어긋남.length ? `  ★어긋남 ${어긋남.join("·")}`
       : 날것.length ? `  같다(${날것.join("·")}는 내려가며 금이 타서 갈림 — 강화 ${town.up}→${next.up})`
       : "  같다")
    + `  · 마을 붉기 ${red}`);
  await out();
}
/* ④ 는 **접었다** — 「마을 하늘에 관문 비네트가 뜬다」는 짐작이었고, 자를 두 번 고치고도
   옛 결에서조차 차이가 0 이었다. 코드를 열어 보니 `draw()` 는 마을에서 **그리기를 마치고
   돌아간다**(main.js 「drawTownLabels(ctx); return;」) — `drawArrive` 의 비네트 줄에는
   애초에 닿지 않는다. 그러니 거기 못을 박는 것은 **한 번도 안 도는 줄**을 더하는 것이다
   ([[cause-written-in-the-item-is-a-guess]] — 항목에 적은 원인이 또 짐작이었다).
   남기는 까닭: 다음에 같은 것을 의심하면 **자를 대기 전에 draw() 의 return 부터 본다.** */
console.log("  " + await shot("v116_town_"+(OLD?"old":"new")));
const bad = rows.reduce((a,r)=>a+r.어긋남.length,0);
console.log(`\n판정: 마을이 말한 몸과 다음 판의 몸이 어긋난 자리 **${bad}/${rows.length*3}**`);
fs.writeFileSync("tmp/v116_"+(OLD?"old":"new")+".json", JSON.stringify({rows},null,1));
await S("Target.closeTarget",{targetId});
process.exit(0);
