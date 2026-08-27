/* V-134 자 — **상인 창이 약속한 「사면 이렇게 된다」와, 정말 사 봤을 때의 수를 맞댄다.**
   V-133 이 가방 툴팁에서 한 것을 **돈이 오가는 자리**로 옮긴다([[carry-fixes-forward]]).
   여기는 3,200 금을 낼지 말지를 그 줄로 정하는 자리다.
   ㉠ 줄이 말한 「지금」 ≠ 사기 «전» 의 실제 수
   ㉡ 줄이 말한 「사면」 ≠ 사기 «후» 의 실제 수
   ㉢ 값이 움직였는데 **줄이 아예 없는** 수치 (말 안 하고 바뀐 것)
   ㉣ 오르내림 **빛깔**(up/down)이 실제 방향과 반대 (V-122 가 「다음」 줄에서 고친 그것)
   ★ 지름길로 안 잰다 — 좌판 칸을 눌러 툴팁을 세우고 **「사기」를 눌러** 잰다
     ([[probe-must-walk-the-real-path]]).
   ★ 바닥에서 떼어 놓고 잰다 — Lv.30 · 강화 6/6/6/3 · 열 슬롯에 3등급 20층 장비.
     맨몸으로 재면 천장·바닥이 안 걸려 틀린 줄도 맞아떨어진다([[floor-far-from-threshold]]).
   ★ 문: `node tools/v134_shop.mjs old` → 고치기 «전»(__SHOPFX_OLD · 줄이 아예 없다). */
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
  M.lv=30;M.gold=9000000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
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
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__SHOPFX_OLD = 1;" });
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* 판이 쓰는 열두 수치를 **한 덩이로** 읽는다([[seed-the-probe]]) — 화면과 같은 자로 찍되,
   방향을 가리려고 날값과 「작을수록 좋은가」를 함께 낸다. */
const SNAP = `(()=>{const C=globalThis.__C;const o={};
  for(const st of C.GEAR_STATS) o[st.n]={s:C.gearStatShow(st.k, st.f()), v:st.f(), lo:!!st.lower};
  return o})()`;
const KEYS = await ev(`(()=>globalThis.__C.GEAR_KEYS)()`);
if (!KEYS?.length) die("GEAR_KEYS 를 못 읽었다");

let 틀림 = 0, 빠짐 = 0, 빛깔 = 0, 줄수 = 0, 잰칸 = 0;
console.log(OLD ? "── 옛 결(__SHOPFX_OLD) ──" : "── 지금 ──");
for (const k of KEYS) {
  /* 슬롯마다 같은 자리에서 다시 시작한다 — 앞 칸에서 산 것이 다음 칸에 안 묻는다 */
  await ev(SEED);
  await ev(`(()=>{window.__openWin('shop');return 1})()`); await wait(150);
  if (!await ev(`(()=>{const e=document.querySelector('[data-pick="${k}"]'); if(!e) return 0; e.click(); return 1})()`))
    die(`${k} — 좌판 칸이 없다`);
  await wait(120);
  /* 줄이 약속한 것 — 「이름 지금 → 사면」 (+ 빛깔) */
  const 약속 = await ev(`(()=>{const o={};
    for(const e of document.querySelectorAll('#shopTip .tipCmp .tipStat')){
      const n=e.querySelector('.sN'), b=e.querySelector('b'); if(!n||!b) continue;
      const t=b.textContent.replace(/\\s+/g,' ').trim().split('→');
      if(t.length!==2) continue;
      o[n.textContent.trim()]=[t[0].trim(),t[1].trim(),e.classList.contains('up')];}
    return o})()`);
  const 전 = await ev(SNAP);
  if (!await ev(`(()=>{const b=document.querySelector('#shopTip [data-buy]'); if(!b||b.disabled) return 0; b.click(); return 1})()`))
    die(`${k} — 「사기」 단추가 없다(금이 모자라거나 최고 등급)`);
  await wait(150);
  const 후 = await ev(SNAP);
  잰칸++;
  const 움직인 = Object.keys(후).filter(n => 전[n].s !== 후[n].s);
  const 나쁨 = [];
  for (const n of 움직인) {
    줄수++;
    const p = 약속[n];
    if (!p) { 빠짐++; 나쁨.push(`${n} 줄없음(${전[n].s}→${후[n].s})`); continue; }
    if (p[0] !== 전[n].s || p[1] !== 후[n].s) { 틀림++; 나쁨.push(`${n} 적힘 ${p[0]}→${p[1]} 실제 ${전[n].s}→${후[n].s}`); }
    const 정말오름 = 후[n].lo ? 후[n].v < 전[n].v : 후[n].v > 전[n].v;
    if (p[2] !== 정말오름) { 빛깔++; 나쁨.push(`${n} 빛깔 ${p[2] ? "초록" : "붉음"} 인데 실제는 ${정말오름 ? "좋아짐" : "나빠짐"}`); }
  }
  console.log(`  ${k.padEnd(7)} 움직인 수치 ${String(움직인.length).padStart(2)}${나쁨.length ? "  ✗ " + 나쁨.join(" · ") : "  ok"}`);
}
if (!줄수) die("움직인 수치가 하나도 없다 — 심는 자리가 틀렸다");
console.log(`  본 칸 ${잰칸}/${KEYS.length} · 움직인 줄 ${줄수}`);
console.log(`  ㉠㉡ 적힌 「지금→사면」 ≠ 실제 : ${틀림}/${줄수}`);
console.log(`  ㉢ 움직였는데 줄이 없음        : ${빠짐}/${줄수}`);
console.log(`  ㉣ 빛깔이 실제 방향과 반대     : ${빛깔}/${줄수}`);
const 걸림 = 틀림 + 빠짐 + 빛깔;
console.log(`  판정: ${OLD ? "문(옛 결) — 우는 것이 옳다" : (걸림 ? "틀렸다" : "통과")} · 걸림 ${걸림}`);
await S("Target.closeTarget", { targetId });
process.exit(!OLD && 걸림 ? 1 : 0);
