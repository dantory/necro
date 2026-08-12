/* **손가락이 실제로 닿는가** — 눌러야 열리는 자리를 전부 진짜 탭으로 두드려 본다.
     node tools/tap_qa.mjs [url]

   ★★ 이 자가 생긴 이유(2026-08-12, 병수님 "스킬 눌러도 안떠"):
   09:04 에 「훅이 아니라 진짜로 눌러서 확인했다」고 보고했는데, 그때 쓴 것은
   `el.click()` 이었다. **`el.click()` 은 pointer-events 를 통째로 건너뛴다** —
   요소가 클릭을 통과시키도록 되어 있어도 핸들러가 그냥 돌아간다.
   실제로 `#top` 은 맵이 비쳐 보이게 pointer-events:none 이고, 「능력치」에만
   auto 를 줬던 탓에 **「스킬」은 손가락이 맵에 닿아 아무 일도 안 났다.**
   자가 그걸 통과시켰다.

   그래서 여기서는 두 가지로만 판정한다:
     ① `document.elementFromPoint(가운데)` 가 **그 단추냐** (pointer-events 를 존중한다)
     ② CDP `Input.dispatchMouseEvent` 로 **진짜 탭**을 보내고 창이 열렸나
   둘 다 맞아야 통과다. */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
/* ★ **캐시를 끈다.** 안 끄면 라이브를 볼 때 브라우저가 몇 분 전 파일을 그대로 써서
   「고쳤는데 그대로」가 나온다 — 실제로 그 함정을 밟았다(고친 hud.css 를 올리고
   해시까지 같은데 자는 실패를 냈다). 파일 해시 대조와 **화면 검수는 다른 층**이다. */
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 5200));

const TAPS = [["hName", "winStat", "능력치"], ["hLv", "winTree", "스킬"]];
let bad = 0;
for (const where of ["마을", "던전"]) {
  if (where === "던전") {
    await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
    await new Promise(r => setTimeout(r, 1500));
  }
  for (const [btn, winId, name] of TAPS) {
    const g = await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
      document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
      const e=document.getElementById(${JSON.stringify(btn)}); if(!e) return JSON.stringify({없음:1});
      const b=e.getBoundingClientRect(); const cx=b.left+b.width/2, cy=b.top+b.height/2;
      const hit=document.elementFromPoint(cx,cy);
      return JSON.stringify({cx,cy, 제것: !!(hit && (hit.id===${JSON.stringify(btn)} || hit.closest("#"+${JSON.stringify(btn)}))),
                             닿는것: hit?(hit.id||hit.className||hit.tagName)+"":null});})()` });
    const o = JSON.parse(g.result.value);
    if (o.없음) { console.log(`${where} ${name}: 단추가 없다`); bad++; continue; }
    await S("Input.dispatchMouseEvent", { type: "mousePressed",  x: o.cx, y: o.cy, button: "left", clickCount: 1 });
    await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: o.cx, y: o.cy, button: "left", clickCount: 1 });
    await new Promise(r => setTimeout(r, 400));
    const on = (await S("Runtime.evaluate", { returnByValue: true,
      expression: `document.getElementById(${JSON.stringify(winId)}).classList.contains("on")` })).result.value;
    const ok = o.제것 && on;
    if (!ok) bad++;
    console.log(`${where} ${name.padEnd(4)} 손가락이 닿는 것 ${String(o.닿는것).padEnd(10)} · 제 것 ${o.제것} · 탭으로 열림 ${on}  ${ok ? "" : "← 안 됨"}`);
  }
}
console.log(`예외: ${errs.length ? errs.slice(0,2) : "없음"} · 판정: ${bad ? "실패 " + bad + "건" : "전부 통과"}`);
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
