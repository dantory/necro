/* V-133 탐색 — **장비 옵션이 약속한 몫과, 실제로 껴 봤을 때 오른 몫을 맞댄다.**
   V-132 가 마을의 강화 넷에서 찾아낸 것(「+25」인데 실제로는 16 · 「+8%」인데 3.4%)을
   **장비 옵션 열**로 옮긴다([[carry-fixes-forward]]). 옵션은 강화보다 훨씬 자주 읽히는
   자리다 — 물건을 바꿀지 말지를 그 줄 하나로 정한다.
   ★ 지름길로 안 잰다 — 실제로 「끼기」를 눌러 능력치 창의 수를 앞뒤로 읽는다
     ([[probe-must-walk-the-real-path]]).
   ★ 바닥에서 떼어 놓고 잰다 — Lv.30 · 강화 6/6/6/3 · 여섯 슬롯에 **옵션 없는 3등급**을
     끼워 두고, 바꿔 끼는 물건은 **같은 등급·같은 깊이에 옵션 하나만** 더한 것이다.
     그래야 대표 수 차이가 0 이라 «옵션의 몫»만 남는다([[floor-far-from-threshold]]). */
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

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  M.equip={}; for(const k of C.GEAR_KEYS) M.equip[k]={k,tier:3,af:[],v:0,il:20};
  M.bag=[]; M.plus={};
  C.saveMeta();return C.GEAR_KEYS.join(",")})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("슬롯 " + await ev(SEED));
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__GEARFX_OLD = 1;" });
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* 능력치 창의 줄을 «한 덩이로» 읽는다([[seed-the-probe]]). */
const READ = `(()=>{const o={};for(const e of document.querySelectorAll('#winStat .tipStat')){
  const n=e.querySelector('.sN'), v=e.querySelector('b'); if(!n||!v) continue;
  o[n.textContent.trim()]=v.textContent.trim();} return o})()`;
const numOf = s => { if (s == null) return null; const m = String(s).replace(/,/g,"").match(/-?[\d.]+/); return m ? +m[0] : null; };

/* 옵션 열 — 값은 3등급·20층에서 실제로 나올 만한 몫으로 잡는다. */
const CASES = [
  { af: "hp",     v: 120, 줄: "체력" },
  { af: "mp",     v: 1.5, 줄: "마나 회복" },
  { af: "dmg",    v: 24,  줄: "본인 피해",   pct: true },
  { af: "mdmg",   v: 30,  줄: "소환수 피해", pct: true },
  { af: "army",   v: 1,   줄: "군세" },
  { af: "gold",   v: 30,  줄: "금 획득" },
  { af: "corpse", v: 25,  줄: null },
  { af: "nova",   v: 35,  줄: null },
  { af: "cd",     v: 14,  줄: null },
  { af: "xp",     v: 28,  줄: null },
  /* 슬롯의 «대표 수» — 옵션이 아니라 물건 그 자체가 말하는 수다(망토·방패의 얼굴). */
  { tier: 4, slot: "robe", 줄: "체력" },
];

console.log("\n  옵션    칸이 적은 것        그 줄        전 → 후        실제 몫     약속 몫");
const 표 = [];
for (const c of CASES) {
  /* 가방에 «같은 등급·같은 깊이 · 옵션 하나만» 놓는다 — 대표 수 차이는 0 이다. */
  await ev(`(()=>{const C=globalThis.__C,M=C.META;
    M.equip.robe={k:'robe',tier:3,af:[],v:0,il:20};
    M.bag=[${c.tier ? `{k:'robe',tier:4,af:[],v:0,il:20}` : `{k:'robe',tier:3,af:[{id:'${c.af}',v:${c.v}}],v:0,il:20}`}];
    C.saveMeta();return 1})()`);
  /* 창을 새로 연다(열려 있으면 닫혔다 다시) — 그려야 칸이 생긴다. */
  await ev(`(()=>{if(document.getElementById('winStat').classList.contains('on'))window.__openWin('stat');
    window.__openWin('stat');return 1})()`);
  await wait(150);
  const 붙임 = await ev(`(()=>{const e=document.querySelector('[data-bpick="0"]'); if(!e) return 0; e.click(); return 1})()`);
  if (!붙임) { console.log(`  잴 수 없었다 — ${c.af} 가방 칸이 없다`); process.exit(1); }
  await wait(120);
  /* 칸이 적는 것 — 떠 있는 상자의 견줌 줄(.tipCmp .tipStat) */
  const 적힘 = await ev(`(()=>[...document.querySelectorAll('#ftip .tipCmp .tipStat')]
    .map(e=>e.textContent.replace(/\\s+/g,' ').trim()).join(' | '))()`);
  const before = await ev(READ);
  const wore = await ev(`(()=>{const b=document.querySelector('#ftip [data-bagwear]'); if(!b) return 0; b.click(); return 1})()`);
  if (!wore) { console.log(`  잴 수 없었다 — ${c.af} 「끼기」 단추가 없다`); process.exit(1); }
  await wait(150);
  const after = await ev(READ);
  let 전 = null, 후 = null, 실제 = "-";
  if (c.줄) {
    전 = numOf(before[c.줄]); 후 = numOf(after[c.줄]);
    if (전 == null && 후 != null) 전 = 0;              // 「금 획득」은 0 이면 줄이 없다
    if (후 == null && 전 != null) 후 = 0;
    실제 = (전 == null || 후 == null) ? "잴 수 없음"
      : c.pct ? `+${(((후 / 전) - 1) * 100).toFixed(1)}%` : `+${(후 - 전).toFixed(1)}`;
  }
  표.push({ af: c.af || "망토3→4", 적힘, 줄: c.줄 || "(창에 줄 없음)",
            전후: c.줄 ? `${before[c.줄] ?? "없음"} → ${after[c.줄] ?? "없음"}` : "-",
            실제, 약속: c.tier ? "(칸이 적은 대로)" : c.pct ? `+${c.v}%` : `+${c.v}` });
  console.log(`  ${String(c.af||"망토3→4").padEnd(7)}${String(적힘).padEnd(22)}${(c.줄||"-").padEnd(11)}${표.at(-1).전후.padEnd(16)}${String(실제).padEnd(11)}${표.at(-1).약속}`);
}

/* 창에 줄이 없는 넷 — 판이 쓰는 함수를 직접 부른다(사람은 이 수를 아예 못 본다). */
console.log("\n  창에 줄이 없는 옵션 — 실제로는 어디로 들어가는가");
console.log(await ev(`(()=>{const C=globalThis.__C;
  const set=(id,v)=>{C.META.equip.robe={k:'robe',tier:3,af:id?[{id,v}]:[],v:0,il:20};C.saveMeta()};
  const read=()=>({cd:C.cdMul?+C.cdMul().toFixed(3):null, xp:C.xpMul?+C.xpMul().toFixed(3):null});
  set(null); const a=read(); set('cd',14); const b=read(); set('xp',28); const c=read(); set(null);
  return '   cd  ×'+a.cd+' → ×'+b.cd+'   xp  ×'+a.xp+' → ×'+c.xp;})()`));

await S("Target.closeTarget", { targetId });
process.exit(0);
