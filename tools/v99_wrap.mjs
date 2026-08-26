/* V-99 — **툴팁 줄의 짝이 갈려 다른 줄에 앉는지** 잰다.
   이름(「신발」)과 값(「+0」) 사이가 꺾이면 미달이다 — 병수님 2026-08-12
   「어중간하게 꺾인다」와 같은 결함([[carry-fixes-forward]]).
   재는 법: `.tipStat` 안의 `<b>` 마다, **바로 앞 글자**의 줄과 그 `<b>` 의 줄이
   다른지 본다(꼴이 아니라 «그려진 자리»를 본다 — 옛 결·새 결 둘 다 같은 자로 잰다).
   node tools/v99_wrap.mjs [width] [height] [old]     (old = __PAIROLD 로 옛 결) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const SIZES = [[1512, 863], [1366, 700], [1280, 620]];
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 「몇 시간 논 사람」이 아니라 **처음 켠 사람** — 결함이 거기서 나왔다(가진 것이 없어
   재련 줄이 열 짝 다 「+0」으로 가장 길다). */
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(2000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`globalThis.__PAIROLD = 1`);

const SPLIT = `(()=>{
  const bad=[];
  document.querySelectorAll(".win.on .tipStat").forEach(line=>{
    if(!line.getClientRects().length) return;
    line.querySelectorAll("b").forEach(b=>{
      const prev=b.previousSibling;
      if(!prev||prev.nodeType!==3||!prev.textContent.length) return;
      const r=document.createRange();
      r.setStart(prev, prev.textContent.length-1); r.setEnd(prev, prev.textContent.length);
      const a=r.getBoundingClientRect(), c=b.getBoundingClientRect();
      if(!a.height||!c.height) return;
      if(Math.abs(a.top-c.top) > 2) bad.push((prev.textContent.trim().split(/\\s+/).pop()||"?")+" ↵ "+b.textContent.trim());
    });
  });
  return bad;})()`;

let total = 0;
let seen = 0;
for (const [w, h] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await wait(300);
  for (const which of ["forge", "shop", "tree", "doctrine", "tactic", "dive", "reborn"]) {
    await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(350);
    const bad = await ev(SPLIT);
    seen++;
    if (bad && bad.length) { total += bad.length; console.log(`  ${w}×${h} · ${which}: ${bad.length} — ${bad.join(" | ")}`); }
    await ev(`window.__closeAll()`); await wait(150);
  }
}
/* ★ **본 자리를 먼저 적는다.** 0 만 내놓으면 「안 갈렸다」와 「안 봤다」가 같은 말이 된다
   ([[silent-zero-is-not-an-observation]]). 게다가 `qa_all` 은 한 줄만 뱉는 자를
   **죽은 것**으로 세므로(2줄 미만 = DEAD), 통과할 때마다 ★죽음으로 잡혔다. */
console.log(`본 자리 ${seen} (크기 ${SIZES.length} × 창 7)`);
console.log(`\n${OLD ? "옛 결" : "지금"} · 갈린 짝 ${total} · 문턱 0 → ${total === 0 ? "통과" : "미달"}`);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(total === 0 ? 0 : 1);
