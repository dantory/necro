/* V-132 자 — **강화 단추에 적힌 몫과 눌렀을 때 실제로 오른 몫을 맞댄다.**
   V-131 이 벨트 툴팁에 한 것을 **마을의 강화 넷**(생명력·기력·어둠의 힘·군세)에 옮긴다
   ([[carry-fixes-forward]]). 강화는 이 게임에서 금을 태우는 두 축 중 하나인데,
   무엇이 얼마나 오르는지 말하는 자리가 저 한 줄뿐이다.
   ㉠ 적힌 몫 ≠ 실제로 오른 몫            (「소환수 피해 +8%」인데 정말 8% 오르는가)
   ㉡ 한 줄이 **말 안 한 것을 같이 올린다** (기력이 마나 회복도 올린다)
   ㉢ 올린다고 적어 놓고 **한 톨도 안 오르는** 것 (바닥에 먹힌 손잡이)
   ★ **지름길로 안 잰다** — 실제로 그 단추를 눌러(`click()`) 능력치 창의 수가 어떻게
     바뀌는지 읽는다([[probe-must-walk-the-real-path]]). 적힌 몫은 화면 `title` 에서 읽는다.
   ★ **바닥에서 떼어 놓고 잰다** — Lv.30 · 강화 이미 몇 급 · 장비 낀 사람으로 잰다.
     갓 시작한 사람으로 재면 배수가 1.00 이라 「+8%」가 그냥 맞아떨어진다
     ([[floor-far-from-threshold]]).
   ★ 문: `node tools/v132_upgrade.mjs old` → 고치기 전 글월(__UPDOLD)로 다시 잰다.  */
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

/* 몇 시간 논 사람 — 강화를 이미 몇 급 샀고 장비도 꼈다. 배수가 1.00 에서 떨어져 있어야
   「+8%」가 저절로 맞아떨어지지 않는다. 금은 넷을 다 사고도 남게 둔다. */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  C.saveMeta();return 1})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__UPDOLD = 1;" });
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* 능력치 창을 연다 — 강화 단추가 사는 자리다(대장간 단추와 같은 `data-up`). */
const opened = await ev(`(()=>{const w=document.getElementById('winStat');
  if(!w) return 'no-win';
  if(!w.classList.contains('on')) window.__openStat ? window.__openStat() : document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC'}));
  return document.getElementById('winStat').classList.contains('on') ? 'on' : 'off';})()`);
if (opened !== "on") { console.log("잴 수 없었다 — 능력치 창이 안 열렸다:", opened); process.exit(1); }

/* 능력치 창의 줄들을 «한 덩이로» 읽는다 — 따로 읽으면 그 사이 한 프레임이 끼어든다
   ([[seed-the-probe]]). */
const READ = `(()=>{const o={};for(const e of document.querySelectorAll('#winStat .tipStat')){
  const n=e.querySelector('.sN'), v=e.querySelector('b'); if(!n||!v) continue;
  o[n.textContent.trim()]=v.textContent.trim();} return o})()`;
const TIPS = `(()=>{const o={};for(const b of document.querySelectorAll('#winStat [data-up]'))o[b.dataset.up]=b.title;return o})()`;

const numOf = (s) => { if (s == null) return null; const m = String(s).replace(/,/g, "").match(/-?[\d.]+/); return m ? +m[0] : null; };
const 줄 = { hp: "체력", mp: "마나", dmg: "소환수 피해", army: "군세" };
const tips = await ev(TIPS);
const bad = { 몫: [], 숨김: [], 헛됨: [] };
const 표 = [];

for (const k of ["hp", "mp", "dmg", "army"]) {
  const before = await ev(READ);
  const ok = await ev(`(()=>{const b=document.querySelector('#winStat [data-up="${k}"]');
    if(!b||b.disabled) return 0; b.click(); return 1})()`);
  if (!ok) { console.log(`잴 수 없었다 — ${k} 단추를 못 눌렀다`); process.exit(1); }
  await wait(120);
  const after = await ev(READ);
  const t = tips[k] || "";
  const a = numOf(before[줄[k]]), b = numOf(after[줄[k]]);
  if (a == null || b == null) { console.log(`잴 수 없었다 — ${줄[k]} 줄을 못 읽었다`); process.exit(1); }
  /* 칸이 «다음에 얼마가 되는가»를 말하는가. 두 꼴 다 받는다 —
       지금: 「최대 체력 305 → 321」   옛것: 「최대 체력 +25」 */
  const 화살 = t.match(/([\d.,×]+)\s*→\s*([\d.,×]+)/);
  const 더함 = t.match(/\+([\d.]+)(%?)/);
  const 적힌다음 = 화살 ? numOf(화살[2])
    : 더함 ? (더함[2] === "%" ? a * (1 + (+더함[1]) / 100) : a + (+더함[1]))
    : null;
  const 어긋남 = 적힌다음 == null ? null : Math.abs(적힌다음 - b);
  표.push({ k, 적힘: 화살 ? `→ ${화살[2]}` : (더함 ? 더함[0] : "(없음)"),
            적힌다음: 적힌다음 == null ? "-" : +적힌다음.toFixed(2), 실제다음: b,
            줄: `${before[줄[k]]} → ${after[줄[k]]}` });
  if (어긋남 == null || 어긋남 > Math.max(0.01, Math.abs(b) * 0.005)) bad.몫.push(k);
  if (a === b) bad.헛됨.push(k);
  /* 말 안 한 줄이 같이 움직였나 — 칸의 글월이 그 줄 이름을 안 쓰면 숨긴 것이다. */
  for (const [n, v] of Object.entries(after)) {
    if (n === 줄[k]) continue;
    if (before[n] !== undefined && before[n] !== v) {
      const 적었나 = t.includes(n) || (n === "본인 피해" && /본인/.test(t));
      if (!적었나) bad.숨김.push(`${k}→${n} (${before[n]} → ${v})`);
    }
  }
}

console.log(OLD ? "── 옛 결(__UPDOLD) ──" : "── 지금 ──");
for (const r of 표) console.log(`  ${r.k.padEnd(5)} 칸 ${String(r.적힘).padEnd(12)} 적힌다음 ${String(r.적힌다음).padEnd(8)} 실제다음 ${String(r.실제다음).padEnd(8)} [${r.줄}]`);
console.log(`  ㉠ 칸이 말한 「다음」 ≠ 실제 : ${bad.몫.length}/4  ${bad.몫.join(" ")}`);
console.log(`  ㉡ 말 안 하고 같이 올린 줄 : ${bad.숨김.length}  ${bad.숨김.join(" · ")}`);
console.log(`  ㉢ 올린다는데 안 오른 것   : ${bad.헛됨.length}/4  ${bad.헛됨.join(" ")}`);
/* ★ 옛 결을 볼 때(문)는 우는 것이 **옳다** — 자를 보정하는 자리라 exit 0 으로 끝낸다.
   지금 결에서 하나라도 걸리면 exit 1 로 운다(qa_all 이 FAIL 로 읽는다). */
const 걸림 = bad.몫.length + bad.숨김.length + bad.헛됨.length;
console.log(`  판정: ${OLD ? "문(옛 결) — 우는 것이 옳다" : (걸림 ? "틀렸다" : "통과")} · 걸림 ${걸림}`);
await S("Target.closeTarget", { targetId });
process.exit(!OLD && 걸림 ? 1 : 0);
