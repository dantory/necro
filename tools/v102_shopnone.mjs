/* V-102 — **가진 것이 없는 칸을 상인이 「없음 <일반>」으로 그린다.**
   처음 켠 사람은 열 칸이 **전부** 비어 있다. 그런데 툴팁 첫 줄이 흰색(`--t0` #d6d0c4)
   「없음」 + 등급표 「일반」이다 — D2 에서 그 빛깔과 그 낱말은 **가진 물건**의 표시다.
   같은 못이 능력치 툴팁에는 이미 박혀 있다(`statTipHtml` 의 `if(!it) return "빈 칸"`) —
   상인에만 안 옮겨졌다([[carry-fixes-forward]] · [[report-from-artifacts]]).
   자는 **그려진 것**을 읽는다 — 첫 줄 글자 · 등급표가 있는가 · 실제 색.
   ① 빈 칸 열에서 「일반」이 몇 번 서는가(0 이어야) ② 빈 칸이 t0 흰색인가(아니어야)
   ③ **가진 칸에서는 등급표가 그대로인가**(과잉 수정 막이).
   문: `node tools/v102_shopnone.mjs old` → `__SHOPNONEOLD` 로 옛 결로 되돌려 자가 우는지 본다
   ([[silent-zero-is-not-an-observation]]).
   쓰기: node tools/v102_shopnone.mjs [old] */
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

/* 처음 켠 사람의 자리로 — 심지 않고 지운다 */
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`window.__SHOPNONEOLD = true`);

/* 상인을 연다 — 사람이 지나는 길로(칸을 눌러 고른다) [[probe-must-walk-the-real-path]] */
await ev(`window.__openWin("shop")`); await wait(500);

/* 첫 줄을 **그려진 대로** 읽는다 */
const READ = `(()=>{ const n=document.querySelector("#shopTip .tipName"); if(!n) return {err:"no tipName"};
  const tag=n.querySelector(".rarTag"), cs=getComputedStyle(n);
  return { txt:(n.textContent||"").trim().replace(/\\s+/g," "),
           tag: tag ? (tag.textContent||"").trim() : "",
           col: cs.color.replace(/\\s/g,"") }; })()`;

const T0 = "rgb(214,208,196)";                       // --t0 = #d6d0c4 (일반 등급 흰색)
const keys = await ev(`window.__shopKeys ? window.__shopKeys() : [...document.querySelectorAll("#shopGrid [data-pick]")].map(e=>e.dataset.pick).filter(k=>k!=="dig")`);
const 빈칸 = [];
for (const k of keys) {
  await ev(`(()=>{const c=document.querySelector('[data-pick="${k}"]'); if(c) c.click(); return 1})()`);
  await wait(140);
  빈칸.push({ 칸: k, ...(await ev(READ)) });
}

/* ③ 과잉 수정 막이 — 물건을 하나 끼워 두고 같은 칸을 다시 읽는다.
   ★ 심는 자리는 `META.equip` 이다(`equipped()` 가 읽는 곳). 처음 짠 자는 `__META.eq`
     에 심어 **아무 일도 안 일어났는데** 「등급표 일반」을 받아 통과로 읽었다 —
     빈 칸을 가진 칸으로 착각한 것이다([[silent-zero-is-not-an-observation]]).
     그래서 심은 뒤 **이름이 정말 바뀌었는지**까지 함께 받아 본다. */
const 심을칸 = keys[0], 딴칸 = keys[1];
await ev(`(()=>{const M=window.META; M.equip["${심을칸}"]=
  {k:"${심을칸}",tier:2,il:12,af:[{id:"dmg",v:12}],v:0}; return !!M.equip["${심을칸}"]})()`);
/* 다시 그리게 한다 — 딴 칸을 눌렀다 되돌아오면 `drawShop` 이 한 자리에서 돈다 */
await ev(`(()=>{const c=document.querySelector('[data-pick="${딴칸}"]'); if(c) c.click(); return 1})()`);
await wait(140);
await ev(`(()=>{const c=document.querySelector('[data-pick="${심을칸}"]'); if(c) c.click(); return 1})()`);
await wait(160);
const 가진칸 = await ev(READ);

const 일반표 = 빈칸.filter(r => r.tag === "일반").length;
const 흰색 = 빈칸.filter(r => r.col === T0).length;
const 결과 = {
  결: OLD ? "옛것(__SHOPNONEOLD)" : "지금",
  "빈 칸 수": 빈칸.length,
  "빈 칸에 선 「일반」": 일반표,
  "빈 칸이 일반등급 흰색(t0)": 흰색,
  "가진 칸의 등급표": 가진칸.tag || "(없다)",
  "가진 칸 첫 줄": 가진칸.txt,
  "첫 줄 보기": 빈칸[0] ? 빈칸[0].txt : "-",
};
console.log(결과);
console.log("예외:", errs.length ? errs : "없음");
/* ★ 심은 것이 정말 그려졌는가 — 「없음」이 남아 있으면 막이가 헛돈 것이다 */
const 심김 = !/없음/.test(가진칸.txt || "없음");
const ok = 일반표 === 0 && 흰색 === 0 && !!가진칸.tag && 심김;
if (!심김) console.log("★ 막이가 헛돈다 — 심은 물건이 안 그려졌다(빈 칸을 가진 칸으로 읽는 중)");
console.log("판정:", OLD ? (일반표 > 0 ? "옛것이 운다 — 자가 옳다" : "★ 자가 옛것을 못 잡는다") : (ok ? "통과" : "미달"));
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(OLD ? 0 : (ok ? 0 : 1));
