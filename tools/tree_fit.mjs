/* **트리가 창 안에 다 들어오나** — 병수님 2026-08-17 21:07 참고 사진(D2R 아마존 트리):
   저쪽은 세 줄기가 **한 화면에 통째로** 서 있다. 우리는 「연쇄 폭발」 아래가 창 밖이다.

     node tools/tree_fit.mjs [폭 높이] [out.png]

   재는 것 — 짐작이 아니라 수로([[cause-written-in-the-item-is-a-guess]]):
     ① 줄기 세 개의 **속높이**(scrollHeight) 대 **보이는 높이**(clientHeight)
     ② 창 밖으로 밀린 칸이 **몇 개이고 어느 것들인지** (이름을 찍는다)
     ③ 굴려야 하는 거리(px)
   ★ 넓은 화면에서 다 들어간다고 통과로 세지 않는다 — 병수님 화면(1512×863)에서 잰다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const OUT = process.argv[4] || "tmp/tree_fit.png";
const fs = await import("node:fs");
for (const t of (await (await fetch(CDP + "/json/list")).json()).filter(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
await wait(4200);

/* 레벨을 올려 **잠긴 칸까지 다 서게** 한다 — 잠겨서 안 보이는 판은 표본이 아니다 */
await S("Runtime.evaluate", { expression: `(()=>{window.META.lv=60; window.saveMeta&&window.saveMeta();})()` });
await S("Runtime.evaluate", { expression: `window.__openWin("tree")` });
await wait(700);

const r = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  const c=document.getElementById("treeCols"); if(!c) return JSON.stringify({없음:"treeCols"});
  const cb=c.getBoundingClientRect();
  const cols=[...c.querySelectorAll(".tCol")].map(col=>{
    const nodes=[...col.querySelectorAll(".tNode")];
    const last=nodes[nodes.length-1];
    return {줄기:col.querySelector("h3")?.textContent.trim(), 칸수:nodes.length,
      끝:+(last.getBoundingClientRect().bottom - cb.top + c.scrollTop).toFixed(1)};
  });
  const out=[...c.querySelectorAll(".tNode")].filter(n=>n.getBoundingClientRect().bottom > cb.bottom+0.5)
    .map(n=>n.querySelector(".tn")?.textContent.trim());
  return JSON.stringify({보이는높이:c.clientHeight, 속높이:c.scrollHeight,
    넘침:c.scrollHeight-c.clientHeight, 창밖칸수:out.length, 창밖:out, 줄기별:cols,
    창:{w:innerWidth,h:innerHeight}});
})()` })).result.value);
console.log(JSON.stringify(r, null, 2));
if (errs.length) console.log("EXC", errs);
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
console.log("찍음 " + OUT);
await raw("Target.closeTarget", { targetId });
bws.close();
