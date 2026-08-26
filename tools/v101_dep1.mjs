/* V-101 — **처음 켠 사람이 맨 처음 들어가는 1층 머리글에 뜻 없는 「×1.00」이 서 있다.**
   마을은 이미 비워 뒀는데(main.js `setDepth("")`) 1층에는 그 못이 안 옮겨졌다
   ([[carry-fixes-forward]]). 자는 **머리글에 그려진 글자**를 층마다 읽는다 —
   ① 1층에서 「×1.00」이 보이는가(0 이어야 한다) ② 2층부터 배수가 그대로 보이는가
   ③ 1→2 에서 「튐」(.up)이 도는가 — 비운 자리에서 처음 뜨는 순간이라 놓치기 쉽다.
   문: `node tools/v101_dep1.mjs old` → `__DEP1OLD` 로 옛 결로 되돌려 자가 정말 우는지 본다
   ([[silent-zero-is-not-an-observation]]).
   쓰기: node tools/v101_dep1.mjs [old] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 처음 켠 사람의 자리로 되돌린다 — 심지 않고 지운다 */
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`window.__DEP1OLD = true`);

/* 자는 **그려진 것**을 읽는다 — 글자 · 보이는가 · 차지한 폭 */
const READ = `(()=>{ const e=document.getElementById("hDepth"); if(!e) return {err:"no hDepth"};
  const b=e.getBoundingClientRect(), cs=getComputedStyle(e);
  return { txt:(e.textContent||""), w:Math.round(b.width),
           shown: cs.display!=="none" && b.width>0.5,
           up: e.classList.contains("up") }; })()`;

const rows = [];
const town = await ev(READ);
rows.push({ 자리: "마을", ...town });

await ev(`window.__toDungeon()`); await wait(1200);
rows.push({ 자리: "1층", ...(await ev(READ)) });

/* 2~4층 — 배수가 붙는 자리는 그대로 떠야 한다. 튐(.up)은 붙는 그 프레임에만 도니
   층을 올린 **직후** 읽는다(0.9초 애니메이션이라 조금 늦어도 잡힌다). */
for (const f of [2, 3, 4]) {
  await ev(`(()=>{const S=window.__S; S.floor=${f}; return 1})()`);
  await wait(260);
  rows.push({ 자리: f + "층", ...(await ev(READ)) });
}

const one = rows.find(r => r.자리 === "1층");
const deep = rows.filter(r => /^[234]층$/.test(r.자리));
const 결과 = {
  결: OLD ? "옛것(__DEP1OLD)" : "지금",
  "1층에 뜻 없는 ×1.00": one.shown && one.txt === "×1.00" ? 1 : 0,
  "1층 머리글이 먹는 폭": one.w,
  "2~4층에서 배수가 보임": deep.filter(r => r.shown && r.txt !== "×1.00").length + "/3",
  "1→2 튐(.up)": rows.find(r => r.자리 === "2층").up ? "돈다" : "안 돈다",
  줄: rows.map(r => `${r.자리} "${r.txt}"${r.shown ? "" : "(안 보임)"}${r.up ? " ↑" : ""}`).join(" · "),
};
const pass = 결과["1층에 뜻 없는 ×1.00"] === 0 && 결과["2~4층에서 배수가 보임"] === "3/3"
          && 결과["1→2 튐(.up)"] === "돈다";
console.log(JSON.stringify(결과, null, 1));
console.log("예외: " + (errs.length ? errs.join(" | ") : "없음"));
console.log(OLD ? "── 옛 결(자가 우는지 보는 자리) ──" : (pass ? "═══ 통과 ═══" : "═══ 미달 ═══"));
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(OLD ? 0 : (pass ? 0 : 1));
