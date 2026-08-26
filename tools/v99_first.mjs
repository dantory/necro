/* V-99 — **처음 켠 사람이 보는 화면을 처음으로 본다.** V-92~V-98 은 하나같이
   「몇 시간 논 사람」(Lv.26 · 금 182,400 · 장비 tier 3)을 심고 찍었다. 정작
   병수님이 새 판을 켜면 보는 **빈 화면**은 한 번도 안 찍었다 — 빈 가방 · 금 0 ·
   포인트 0 · 아직 아무 층도 안 간 사람이다([[play-it-before-measuring-it]]).
   node tools/v99_first.mjs [width] [height]        (tmp/v99_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* ★ 심지 않는다 — 지운다. 처음 켠 사람의 자리로 되돌린다. */
await S("Page.reload", { ignoreCache: true }); await wait(2000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);

/* 떠 있는 글자를 전부 세어 **빈 자리·잘린 줄·화면 밖**을 찾는다.
   묻지 않고 찍으면 「이상 없음」이 된다([[silent-zero-is-not-an-observation]]). */
const LOOK = `(()=>{
  const out={}; const R=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)];};
  const vis=e=>{const b=e.getBoundingClientRect(); if(b.width<2||b.height<2) return false;
    const cs=getComputedStyle(e); return !(cs.visibility==="hidden"||cs.display==="none"||cs.opacity==="0");};
  const off=[]; document.querySelectorAll("#app *").forEach(e=>{ if(!vis(e)) return; const b=e.getBoundingClientRect();
    if(b.right>innerWidth+1||b.bottom>innerHeight+1||b.left<-1||b.top<-1) off.push((e.id||e.className||e.tagName)+" "+R(e).join(","));});
  out.off=off.slice(0,8);
  const sp=[]; document.querySelectorAll("#app *").forEach(e=>{ if(!vis(e)) return;
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflow!=="visible")
      sp.push((e.id||e.className)+" "+e.scrollWidth+">"+e.clientWidth);});
  out.spill=sp.slice(0,8);
  /* 「없음」을 말하는 자리 — 빈 창이 사람에게 무엇을 말하는지 그대로 적는다 */
  const say=[]; document.querySelectorAll("#app *").forEach(e=>{ if(!vis(e)) return;
    if(e.children.length) return; const t=(e.textContent||"").trim();
    if(t) say.push(t.slice(0,60));});
  out.text=say;
  out.res=(document.querySelector(".mid .res")||{}).textContent;
  return out;})()`;

const rows = [];
const step = async (name, out) => {
  const r = await ev(LOOK); await shot(out);
  rows.push({ name, off: (r.off || []).length, spill: (r.spill || []).length, out });
  console.log("── " + name + " → " + out);
  if (r.res) console.log("   .res: " + r.res);
  if (r.off?.length) console.log("   화면밖: " + r.off.join(" | "));
  if (r.spill?.length) console.log("   넘침: " + r.spill.join(" | "));
  console.log("   글: " + (r.text || []).join(" · ").slice(0, 900));
};

await step("마을 첫 화면", "tmp/v99_town.png");
for (const [w, out] of [["stat","v99_stat"],["bag","v99_bag"],["shop","v99_shop"],["forge","v99_forge"],["tree","v99_tree"],["dive","v99_dive"]]) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(500);
  await step("창 " + w, "tmp/" + out + ".png");
  await ev(`window.__closeAll()`); await wait(250);
}
/* 처음 들어간 1층 — 아직 하수인이 하나도 없다 */
if (await ev(`typeof window.__toDungeon === "function"`)) {
  await ev(`window.__toDungeon()`); await wait(4000);
  await step("1층 첫 4초", "tmp/v99_f1.png");
}
console.log("\n예외: " + (errs.length ? errs.join(" | ") : "없음"));
console.log(rows.map(r => `${r.name}: 화면밖 ${r.off} · 넘침 ${r.spill}`).join("\n"));
await raw("Target.closeTarget", { targetId });
bws.close();
