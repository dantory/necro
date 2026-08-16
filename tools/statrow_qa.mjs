// 능력치 창의 「뜻 없는 줄」 검수 — 값이 안 붙은 「깊이 ×1.00」·「금 획득 +0%」이 접히는가.
//   node tools/statrow_qa.mjs [out.png]
// stat_ui.mjs 와 같은 뼈대(CDP 9333 · 1512×863).
const [, , OUT = "tmp/statrow.png"] = process.argv;
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails?.exception?.description || "?"));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

/* 줄 이름만 뽑는다 — `.sStat .tipStat` 의 첫 낱말(값은 <b> 안이라 뺀다). */
const ROWS = `(() => [...document.querySelectorAll("#statBody .sStat .tipStat")]
  .map(d => d.childNodes[0].textContent.trim()))()`;

/* ⓐ 갓 시작한 몸 — 유해 0 · 낀 것 없음 · **재련(META.plus)도 0** · 마을(1층).
   ★ plus 를 안 지우면 안 낀 반지도 `gearVal` 이 재련값을 얹어 「+6%」가 뜬다
      (이 세이브가 그랬다 — 자가 「값 없음」을 재려면 값의 뿌리를 다 지워야 한다). */
const A = await ev(`(function(){
  window.META.relics = 0;
  for (const k of Object.keys(window.META.equip)) window.META.equip[k] = null;
  for (const k of Object.keys(window.META.plus))  window.META.plus[k]  = 0;
  window.__S.floor = 1;
  window.__openWin("stat");
  return ${ROWS};
})()`);

// ⓑ 값이 붙으면 돌아오는가 — 반지(금 획득) + 20층
const B = await ev(`(function(){
  window.META.equip.ring = { k:"ring", tier:3, af:[] };
  window.__S.floor = 20;
  /* ★ 함정 — __openWin 은 **토글**이다. 열려 있는 창에 다시 부르면 닫히기만 하고
     drawStat() 이 안 돌아, 자는 **아까 그린 줄**을 다시 읽는다(ⓒ 가 그래서 빨갰다). */
  window.__openWin("stat"); window.__openWin("stat");
  return ${ROWS};
})()`);

await new Promise(r => setTimeout(r, 300));
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));

const has = (rows, n) => rows.includes(n);
const T = [
  ["ⓐ 값 없으면 접힌다 — 깊이·금 획득 둘 다 없음",
    !has(A, "깊이") && !has(A, "금 획득"), `줄=${A.join("·")}`],
  ["ⓑ 나머지 줄은 그대로",
    ["체력", "마나", "군세", "본인 피해", "소환수 피해", "마나 회복"].every(n => has(A, n)),
    `줄=${A.length}개`],
  ["ⓒ 값이 붙으면 돌아온다 — 반지+20층",
    has(B, "깊이") && has(B, "금 획득"), `줄=${B.join("·")}`],
  ["ⓓ 콘솔 오류 0", errors.length === 0, errors.join(" | ") || "없음"],
];
let bad = 0;
for (const [n, ok, d] of T) { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}  — ${d}`); }
console.log("saved " + OUT);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(bad ? 1 : 0);
