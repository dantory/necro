/* V-103 — **처음 켠 사람이 여는 «창»들을 켜서 본다.** V-99~V-102 는 대장간·정산·1층
   머리글·상인을 하나씩 봤다. 아직 안 본 자리가 남았다 — 능력치 · 가방 · 스킬트리 ·
   편성 · 운용 · 환생. 전부 **빈 사람**이 여는 창이라 「없음/0」이 가장 많이 서는 곳이다
   ([[play-it-before-measuring-it]] · [[silent-zero-is-not-an-observation]]).
   쓰기: node tools/v103_look.mjs [width] [height]      (tmp/v103_*.png) */
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

/* ★ 심지 않는다 — 지운다. */
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);

/* 열린 창 안에서 **그려진 것**을 읽는다 — 화면 밖 · 넘침 · 「없음/0」을 말하는 줄. */
const LOOK = `(()=>{
  const fr=[...document.querySelectorAll(".frame")].filter(e=>{const b=e.getBoundingClientRect();
    return b.width>2&&b.height>2&&getComputedStyle(e).display!=="none"&&e.closest(".on,#app");});
  const box=fr.find(e=>e.closest(".on"))||fr[0]; if(!box) return {err:"닫혀 있다"};
  const R=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)];};
  const vis=e=>{const b=e.getBoundingClientRect(); if(b.width<2||b.height<2) return false;
    const cs=getComputedStyle(e); return !(cs.visibility==="hidden"||cs.display==="none"||cs.opacity==="0");};
  const out={ box:R(box) };
  const off=[], sp=[], zero=[];
  box.querySelectorAll("*").forEach(e=>{ if(!vis(e)) return; const b=e.getBoundingClientRect();
    if(b.right>innerWidth+1||b.bottom>innerHeight+1||b.left<-1||b.top<-1) off.push((e.id||e.className||e.tagName)+" "+R(e).join(","));
    if(e.scrollHeight>e.clientHeight+2&&e.clientHeight>0&&getComputedStyle(e).overflowY!=="visible") sp.push("↕"+(e.id||e.className)+" "+e.scrollHeight+">"+e.clientHeight);
    if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&getComputedStyle(e).overflowX!=="visible") sp.push("↔"+(e.id||e.className)+" "+e.scrollWidth+">"+e.clientWidth);
    if(!e.children.length){ const t=(e.textContent||"").trim();
      if(t&&/^(없음|-|—|0|0%|\\+0|\\+0%|×1\\.00|x1\\.00|0\\/0|아직)$|(\\+0%|×1\\.00| 0 |0개|0점)/.test(t)&&t.length<40)
        zero.push(t.replace(/\\s+/g," ")+" |"+getComputedStyle(e).color.replace(/\\s/g,"")); } });
  out.off=off.slice(0,6); out.spill=[...new Set(sp)].slice(0,6); out.zero=[...new Set(zero)].slice(0,14);
  out.txt=(box.innerText||"").trim().replace(/\\n{2,}/g,"\\n").slice(0,900);
  return out; })()`;

const WINS = [["stat","능력치"],["bag","가방"],["tree","스킬트리"],["doctrine","편성"],["tactic","운용"],["reborn","환생"]];
const rep = {};
for (const [k, ko] of WINS) {
  await ev(`window.__closeAll && window.__closeAll()`); await wait(150);
  const ok = await ev(`(()=>{try{window.__openWin(${JSON.stringify(k)});return 1}catch(e){return "ERR "+e.message}})()`);
  await wait(600);
  rep[ko] = { 연결: ok, ...(await ev(LOOK)) };
  await shot(`tmp/v103_${k}.png`);
}
console.log(JSON.stringify(rep, null, 1));
if (errs.length) console.log("예외:", errs.slice(0, 4));
await raw("Target.closeTarget", { targetId }); bws.close();
