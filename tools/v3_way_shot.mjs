/* **V-3 — 웨이포인트를 켜서 본다** (2026-08-24)
     node tools/v3_way_shot.mjs                    (기본 세 창)
     node tools/v3_way_shot.mjs 1512x863
   두 장씩 찍는다: **마을에 선 표**(town)와 **열린 판**(win).
   판은 구역 카드가 일곱 장이라 세로로 길다 — 창이 낮으면 목록이 스스로 스크롤하고,
   그러면 **밑에 있는 칸은 눌러도 안 눌린다**(dive_qa 가 그걸로 울었다). 그래서
   숫자만 보지 말고 **켜서 본다**([[play-it-before-measuring-it]]).
   ★ 「내려가기」 단추와 제일 깊은 칸이 **화면 안에 있는지**를 같이 잰다 — 그림만
     보면 잘린 것을 놓친다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const sizes = (process.argv.slice(2).length ? process.argv.slice(2)
  : ["1512x863", "1512x760", "414x896"]).map(s => s.split("x").map(Number));
const DEEP = 42;                     // diveMax = 30 — 구역 다섯이 열리고 둘은 잠긴다
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { writeFileSync } = await import("node:fs");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* 씨앗 + 세이브를 **문서가 서기 전에** 심는다(dive_qa 의 그 교훈 — 나중에 넣으면 판이 덮는다). */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
   localStorage.setItem("necro.meta.v1", JSON.stringify({gold:9000,lv:20,deepest:${DEEP},best:${DEEP},runs:3,
     up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1}}))` });
const shot = (f) => S("Page.captureScreenshot", { format: "png" }).then(({ data }) => { writeFileSync(f, Buffer.from(data, "base64")); console.log(f); });
for (const [w, h] of sizes) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(1000);
  await S("Page.reload", { ignoreCache: true }); await wait(4200);
  await shot(`tmp/v3_town_${w}x${h}.png`);
  /* 마을의 **표를 진짜로 누른다** — 창을 손으로 열면 그 길에 없는 결함은 안 잡힌다
     ([[probe-must-walk-the-real-path]]). */
  const at = await ev(`(() => { const h = (window.__townHits ? window.__townHits() : []).find(x => x.id === "way");
    if (!h) return null; const cv = document.querySelector("canvas"), r = cv.getBoundingClientRect();
    return { x: Math.round(r.left + h.x + h.w / 2), y: Math.round(r.top + h.y + h.h / 2) }; })()`);
  if (!at) { console.log(`  ✗ ${w}x${h} 마을에서 표(way)를 못 찾았다`); continue; }
  await S("Page.bringToFront").catch(() => {});
  for (const type of ["mousePressed", "mouseReleased"])
    await S("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  await wait(500);
  await shot(`tmp/v3_win_${w}x${h}.png`);
  /* **잘렸는지**를 잰다 — 제일 깊은 칸과 「내려가기」가 창 안에 온전히 보이는가. */
  const fit = await ev(`(() => { const w = document.getElementById("winDive");
    if (getComputedStyle(w).display === "none") return { 열림: false };
    const chips = [...w.querySelectorAll("[data-dive]")];
    const deep = chips[chips.length - 1], go = w.querySelector("[data-dive-go]");
    const seen = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
      const c = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
      return { 위: Math.round(r.top), 밑: Math.round(r.bottom), 닿음: !!c && (c === el || el.contains(c)) }; };
    return { 열림: true, 칸수: chips.length, 제일깊은칸: deep && deep.textContent,
             깊은칸: seen(deep), 내려가기: seen(go), 창높이: Math.round(w.getBoundingClientRect().height) }; })()`);
  console.log(`  ${w}x${h}`, JSON.stringify(fit));
}
console.log(`콘솔오류 ${errs.length}`, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
