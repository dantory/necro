/* V-129 자 — **일지에 적힌 글월과 판이 쓰는 규칙을 맞대어 본다.**
   일지 일곱 줄은 「다르게 놀 이유」다. 그 줄을 읽고 그대로 했는데 안 깨지면 이유가 아니라
   거짓말이 된다([[silent-zero-is-not-an-observation]]).
   ① 시체 잔치 — 적힌 대로(**소환수 여덟을 한 번씩**) 먹여 보고, 규칙대로(**한 소환수를
      여덟 번**) 먹여 본다. 둘의 결과가 갈리면 글월이 규칙과 다른 것이다.
   ② 줄 폭 — 고친 글월이 안 잘리고 안 꺾이는지 잰다(옆 칸 진행/보상과 안 겹치는지).
   문(`--old`)으로 옛 글월을 세우면 ①이 **울어야 한다** — 안 울면 이 자가 진다. */
import fs from "node:fs";
const OLD = process.argv.includes("--old");
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

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
if (OLD) await ev(`(()=>{const C=globalThis.__C,Q=C.QUESTS;
  const f=Q.find(q=>q.id==='feast'); if(f) f.d='시체 잔치로 소환수를 여덟 번 먹인다';
  return 1})()`);

const bad = [];
/* ① 시체 잔치 — 적힌 대로 vs 규칙대로 */
const feast = await ev(`(()=>{const C=globalThis.__C,Q=C.QUESTS.find(q=>q.id==='feast');
  const reset=()=>{C.S.qrun={};if(C.META.quests)delete C.META.quests.feast};
  reset(); for(let i=0;i<8;i++) C.questNote('feast',1);          // 소환수 여덟을 한 번씩
  const asWritten={진행:C.questProg(Q),깸:C.questDone(Q)};
  reset(); for(let i=1;i<=8;i++) C.questNote('feast',i);          // 한 소환수를 여덟 번
  const asRuled={진행:C.questProg(Q),깸:C.questDone(Q)};
  reset(); return {글월:Q.d,적힌대로:asWritten,규칙대로:asRuled}})()`);
console.log("① 시체 잔치  글월 「" + feast.글월 + "」");
console.log("   적힌 대로(소환수 여덟을 한 번씩) " + feast.적힌대로.진행 + "/8 · " + (feast.적힌대로.깸 ? "달성" : "아직"));
console.log("   규칙대로(한 소환수를 여덟 번)   " + feast.규칙대로.진행 + "/8 · " + (feast.규칙대로.깸 ? "달성" : "아직"));
if (feast.적힌대로.깸 !== feast.규칙대로.깸 && !/한 소환수/.test(feast.글월))
  bad.push("시체 잔치 — 적힌 대로 해도 안 깨지는데 글월에 「한 소환수」가 없다");

/* ② 도굴꾼은 곁들여 봤다 — `mkUnique` 가 늘 꼭대기 등급(4)을 주므로 규칙의 `uid ||` 는
   덧붙임이고 글월 「4등급을 캔다」는 참말이다. 자에 안 넣는다(한 자에 물음을 둘 묶지 않는다). */

/* ③ 줄 폭 — 일지를 열어 설명줄이 안 잘리고 진행/보상 칸과 안 겹치는지 */
await ev(`window.__openWin('stat')`); await wait(700);
const fit = await ev(`(()=>{const rs=[...document.querySelectorAll('.jRow')];
  return rs.map(r=>{const d=r.querySelector('.jD'),R=r.querySelector('.jR');
    const a=d.getBoundingClientRect(),b=R.getBoundingClientRect();
    return {이름:r.querySelector('.jN').textContent, 넘침:Math.max(0,Math.round(d.scrollWidth-d.clientWidth)),
            겹침:Math.max(0,Math.round(a.right-b.left)), 줄수:Math.round(a.height/ (parseFloat(getComputedStyle(d).lineHeight)||a.height))}})})()`);
for (const f of fit) {
  const w = f.넘침 > 0 || f.겹침 > 0 || f.줄수 > 1;
  console.log("   " + (w ? "✗" : "·") + " " + f.이름 + "  넘침 " + f.넘침 + "px · 겹침 " + f.겹침 + "px · " + f.줄수 + "줄");
  if (w) bad.push("줄 폭 — " + f.이름 + " (넘침 " + f.넘침 + " · 겹침 " + f.겹침 + " · " + f.줄수 + "줄)");
}

console.log(bad.length ? "판정: 운다 " + bad.length + "건\n  " + bad.join("\n  ") : "판정: 통과");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad.length ? 1 : 0);
