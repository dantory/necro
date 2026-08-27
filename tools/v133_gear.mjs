/* V-133 자 — **견줌 줄이 약속한 「끼면 이렇게 된다」와, 정말 껴 봤을 때의 수를 맞댄다.**
   V-132 가 마을의 강화 넷에서 한 것을 **장비 열 슬롯 · 옵션 열**로 옮긴다
   ([[carry-fixes-forward]]). 물건을 바꿀지는 이 줄 하나로 정한다.
   ㉠ 줄이 말한 「지금」 ≠ 끼기 «전» 의 실제 수
   ㉡ 줄이 말한 「끼면」 ≠ 끼기 «후» 의 실제 수
   ㉢ 값이 움직였는데 **줄이 아예 없는** 수치 (말 안 하고 바뀐 것)
   ★ 지름길로 안 잰다 — 가방 칸을 눌러 상자를 띄우고 **「끼기」를 눌러** 잰다
     ([[probe-must-walk-the-real-path]]).
   ★ 바닥에서 떼어 놓고 잰다 — Lv.30 · 강화 6/6/6/3 · 여섯 슬롯에 3등급 20층 장비.
     맨몸으로 재면 천장·바닥이 안 걸려 틀린 줄도 맞아떨어진다([[floor-far-from-threshold]]).
   ★ 문: `node tools/v133_gear.mjs old` → 고치기 «전» 뺄셈(__GEARFX_OLD)으로 다시 잰다. */
const OLD = process.argv[2] === "old";
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
const die = (m) => { console.log("  잴 수 없었다 — " + m); process.exit(1); };   /* 조용한 0 을 안 낸다 [[silent-zero-is-not-an-observation]] */

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  M.equip={}; for(const k of C.GEAR_KEYS) M.equip[k]={k,tier:3,af:[],v:0,il:20};
  M.bag=[]; M.plus={};
  C.saveMeta();return 1})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__GEARFX_OLD = 1;" });
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* 판이 쓰는 열두 수치를 **한 덩이로** 읽는다([[seed-the-probe]]) — 화면과 같은 자로 찍는다. */
const SNAP = `(()=>{const C=globalThis.__C;const o={};
  for(const st of C.GEAR_STATS) o[st.n]=C.gearStatShow(st.k, st.f()); return o})()`;
/* 능력치 창의 줄 — 견줌 줄과 **같은 글자**여야 한다(같은 수가 둘이면 안 된다). */
const WIN = `(()=>{const o={};for(const e of document.querySelectorAll('#winStat .tipStat')){
  const n=e.querySelector('.sN'), v=e.querySelector('b'); if(!n||!v) continue;
  o[n.textContent.trim()]=v.textContent.trim();} return o})()`;
const 창이름 = { "최대 체력":"체력", "최대 마나":"마나", "군세 상한":"군세",
                "마나 회복":"마나 회복", "소환수 피해":"소환수 피해", "금 획득":"금 획득" };

/* 무엇을 껴 보나 — 옵션 열 + 슬롯의 «대표 수»가 뛰는 갈아끼우기 셋 */
const CASES = [
  ...["hp","mp","dmg","mdmg","army","gold","corpse","nova","cd","xp"]
      .map(af => ({ 이름: "옵션 " + af, k: "robe",
                    it: { k:"robe", tier:3, af:[{ id:af, v: af==="mp"?1.5 : af==="army"?1 : af==="hp"?120 : 25 }], v:0, il:20 } })),
  { 이름: "망토 3→4등급", k:"robe",  it:{ k:"robe",  tier:4, af:[], v:0, il:20 } },
  { 이름: "부적 3→4등급", k:"charm", it:{ k:"charm", tier:4, af:[], v:0, il:20 } },
  { 이름: "신발 3→4등급", k:"boots", it:{ k:"boots", tier:4, af:[], v:0, il:20 } },
];

let 틀림 = 0, 빠짐 = 0, 창어긋남 = 0, 줄수 = 0;
console.log(OLD ? "── 옛 결(__GEARFX_OLD) ──" : "── 지금 ──");
for (const c of CASES) {
  await ev(`(()=>{const C=globalThis.__C,M=C.META;
    M.equip['${c.k}']={k:'${c.k}',tier:3,af:[],v:0,il:20};
    M.bag=[${JSON.stringify(c.it)}]; C.saveMeta(); return 1})()`);
  await ev(`(()=>{if(document.getElementById('winStat').classList.contains('on'))window.__openWin('stat');
    window.__openWin('stat');return 1})()`);
  await wait(150);
  if (!await ev(`(()=>{const e=document.querySelector('[data-bpick="0"]'); if(!e) return 0; e.click(); return 1})()`))
    die(`${c.이름} — 가방 칸이 없다`);
  await wait(120);
  /* 줄이 약속한 것 — 「이름 지금 → 끼면」 */
  const 약속 = await ev(`(()=>{const o={};
    for(const e of document.querySelectorAll('#ftip .tipCmp .tipStat')){
      const n=e.querySelector('.sN'), b=e.querySelector('b'); if(!n||!b) continue;
      const t=b.textContent.replace(/\\s+/g,' ').trim().split('→');
      if(t.length!==2) continue; o[n.textContent.trim()]=[t[0].trim(),t[1].trim()];}
    return o})()`);
  const 전 = await ev(SNAP);
  if (!await ev(`(()=>{const b=document.querySelector('#ftip [data-bagwear]'); if(!b) return 0; b.click(); return 1})()`))
    die(`${c.이름} — 「끼기」 단추가 없다`);
  await wait(150);
  const 후 = await ev(SNAP), 창 = await ev(WIN);
  const 움직인 = Object.keys(후).filter(n => 전[n] !== 후[n]);
  const 나쁨 = [];
  for (const n of 움직인) {
    줄수++;
    const p = 약속[n];
    if (!p) { 빠짐++; 나쁨.push(`${n} 줄없음(${전[n]}→${후[n]})`); continue; }
    if (p[0] !== 전[n] || p[1] !== 후[n]) { 틀림++; 나쁨.push(`${n} 적힘 ${p[0]}→${p[1]} 실제 ${전[n]}→${후[n]}`); }
    /* 능력치 창과 같은 글자인가 — 같은 수가 두 꼴이면 사람은 둘로 읽는다 */
    const w = 창이름[n];
    if (w && 창[w] !== undefined && 창[w] !== 후[n]) { 창어긋남++; 나쁨.push(`${n} 창은 ${창[w]} 상자는 ${후[n]}`); }
  }
  console.log(`  ${c.이름.padEnd(14)} 움직인 수치 ${String(움직인.length).padStart(2)}${나쁨.length ? "  ✗ " + 나쁨.join(" · ") : "  ok"}`);
}
if (!줄수) die("움직인 수치가 하나도 없다 — 심는 자리가 틀렸다");
console.log(`  ㉠㉡ 적힌 「지금→끼면」 ≠ 실제 : ${틀림}/${줄수}`);
console.log(`  ㉢ 움직였는데 줄이 없음        : ${빠짐}/${줄수}`);
console.log(`  ㉣ 능력치 창과 다른 꼴         : ${창어긋남}/${줄수}`);
const 걸림 = 틀림 + 빠짐 + 창어긋남;
console.log(`  판정: ${OLD ? "문(옛 결) — 우는 것이 옳다" : (걸림 ? "틀렸다" : "통과")} · 걸림 ${걸림}`);
await S("Target.closeTarget", { targetId });
process.exit(!OLD && 걸림 ? 1 : 0);
