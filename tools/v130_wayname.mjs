/* ══ V-130 자 ══ **한 물건에 이름은 하나여야 한다.**
   이 판의 「지나온 층을 골라 다시 들어가는 것」은 사람이 네 자리에서 만난다:
     ㉠ 마을에 선 물건의 **이름표**  ㉡ 정산 창의 **유일한 안내**(META.diveTold · 한 생 한 번)
     ㉢ 그 창(어디부터)의 **머리줄·잠긴 줄**  ㉣ 아직 못 열었을 때의 **마을 로그**
   ㉠ 이 이 판에서 사람이 **눌러야 하는 것**이므로 나머지 셋은 그 이름을 써야 한다.
   ★ 이름을 손으로 안 적는다 — **town.js 의 이름표에서 뽑아** 견준다. 이름표를 바꾸면
     자가 저절로 따라간다(둘을 따로 적으면 한쪽이 썩는다).
   ★ 곁들여 폭도 잰다 — 낱말이 길어졌으니(표 → 웨이포인트) 넘치면 고침이 제 값을 깎는다.
   문: `node tools/v130_wayname.mjs old` → `__WAYNAME_OLD` 로 옛 낱말을 다시 세워
       자가 정말 우는지 보정한다([[silent-zero-is-not-an-observation]]). */
import fs from "node:fs";
const OLD = process.argv.includes("old");
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const bad = [];

/* 방금 15층에 닿은 사람 — 그 순간이 이 기능이 열리는 자리다(DIVE_MIN_DEEPEST). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=18;M.xp=40;M.gold=9400;M.deepest=15;M.best=15;M.corpses=120;M.runs=6;
  M.diveTold=0;M.diveSet=0;M.dive=0;C.saveMeta();return C.diveMax()})()`;

const WIDTHS = [[1280, 620], [1366, 700], [1512, 863]];
let 이름표 = null, 쓰인이름 = new Set(), 넘침 = [];

for (const [w, h] of WIDTHS) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1100);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  await ev(SEED);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  if (OLD) await ev(`globalThis.__WAYNAME_OLD = 1`);

  /* ㉠ 마을 이름표 — **여기서 이름을 뽑는다** */
  const 표들 = await ev(`(async()=>{const T=await import('./js/town.js');
    return (T.townHits?T.townHits():[]).map(h=>({id:h.id,name:h.name}))})()`);
  const way = (표들 || []).find(t => t.id === "way");
  if (!way) { bad.push(`${w}px — 마을에 「way」 물건이 없다(자가 이름을 못 뽑는다)`); continue; }
  이름표 = way.name;

  /* ㉡ 정산 창의 안내 */
  await ev(`window.__openWin('end')`); await wait(600);
  const 안내 = await ev(`(()=>{const e=document.getElementById('endSub');if(!e)return null;
    const d=[...e.querySelectorAll('.eWhere')].pop(); return d?d.innerText.replace(/\\n/g,' / '):null})()`);
  const 안내폭 = await ev(`(()=>{const e=document.getElementById('endSub');if(!e)return 0;
    const d=[...e.querySelectorAll('.eWhere')].pop(); if(!d)return 0;
    return Math.max(0, Math.round(d.scrollWidth - d.clientWidth))})()`);
  if (안내폭 > 0) 넘침.push(`정산 안내 ${w}px · ${안내폭}px`);

  /* ㉢ 어디부터 창 */
  await ev(`window.__closeAll&&window.__closeAll()`);
  await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);
  await ev(`window.__openWin('dive')`); await wait(600);
  const 창 = await ev(`(()=>{const b=document.getElementById('diveBody');if(!b)return null;
    const head=b.querySelector('.tipStat'); const lock=[...b.querySelectorAll('.wayLock')];
    const over=e=>Math.max(0,Math.round(e.scrollWidth-e.clientWidth));
    return {머리:head?head.innerText:'', 머리넘침:head?over(head):0,
            잠김:lock.map(e=>e.innerText), 잠김넘침:Math.max(0,...lock.map(over),0)}})()`);
  if (창?.머리넘침 > 0) 넘침.push(`창 머리줄 ${w}px · ${창.머리넘침}px`);
  if (창?.잠김넘침 > 0) 넘침.push(`창 잠긴 줄 ${w}px · ${창.잠김넘침}px`);

  /* ㉣ 아직 못 연 사람이 그 물건을 눌렀을 때 나오는 마을 로그 — 실제로 누른다 */
  await ev(`window.__closeAll&&window.__closeAll()`);
  await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);
  const 로그 = await ev(`(()=>{const C=globalThis.__C;
    C.META.deepest=3;C.META.best=3;C.saveMeta();          // 아직 못 연 사람으로 되돌린다
    const S=C.S; S.log.length=0;
    const cv=document.getElementById('stage'), r=cv.getBoundingClientRect();
    /* 물건이 선 화면 자리를 town 이 아는 그대로 짚는다 — 자가 제 손으로 셈하지 않는다 */
    return import('./js/town.js').then(T=>{const h=(T.townHits?T.townHits():[]).find(x=>x.id==='way');
      if(!h) return null;
      cv.dispatchEvent(new MouseEvent('click',{clientX:r.left+h.x+h.w/2,clientY:r.top+h.y+h.h/2,bubbles:true}));
      return S.log.map(s=>String(s).replace(/<[^>]*>/g,'')).join(' | ')})})()`);

  const 글월 = [안내, 창?.머리, ...(창?.잠김 || []), 로그].filter(Boolean).join(" ");
  for (const n of ["웨이포인트", "표", "건너뛰기"]) {
    // 「표」는 「표적·드랍표」 같은 낱말의 조각일 수 있으니 홀로 선 것만 센다
    const re = n === "표" ? /(^|[\s·—(])표([가는를은이]|\s|$)/ : new RegExp(n);
    if (re.test(글월)) 쓰인이름.add(n);
  }
  console.log(`── ${w}×${h}`);
  console.log(`   ㉠ 이름표   「${이름표}」`);
  console.log(`   ㉡ 안내     ${안내 || "(없음)"}`);
  console.log(`   ㉢ 머리줄   ${창?.머리 || "(없음)"}`);
  console.log(`   ㉢ 잠긴 줄  ${(창?.잠김 || [])[0] || "(없음)"}`);
  console.log(`   ㉣ 로그     ${로그 || "(없음)"}`);
}

console.log(`쓰인 이름 ${쓰인이름.size}가지 — ${[...쓰인이름].map(n => "「" + n + "」").join(" · ")}`);
if (쓰인이름.size !== 1) bad.push(`한 물건을 ${쓰인이름.size}가지 이름으로 부른다 — ${[...쓰인이름].join(" · ")}`);
else if (!쓰인이름.has(이름표)) bad.push(`글월이 쓰는 이름(${[...쓰인이름][0]})이 마을 이름표(${이름표})와 다르다`);
console.log(`넘침 ${넘침.length}건${넘침.length ? " — " + 넘침.join(" · ") : ""}`);
for (const o of 넘침) bad.push("넘침 " + o);

console.log(bad.length ? "판정: 운다 " + bad.length + "건\n  " + bad.join("\n  ") : "판정: 통과");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad.length ? 1 : 0);
