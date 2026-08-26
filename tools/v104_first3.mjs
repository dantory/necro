/* V-104 — **처음 켠 사람이 아직 안 본 창 셋**을 본다. V-99 는 마을·능력치·가방·
   상인·대장간·트리·어디부터 일곱을 찍었는데, 아래 띠에 붙은 **편성(doctrine)·
   운용(tactic)**과 **환생(reborn)** 은 빠졌다. 셋 다 「가진 것이 없는 사람」에게
   무엇을 말하는지 아무도 안 봤다([[play-it-before-measuring-it]]).
   node tools/v104_first3.mjs [width] [height]     (tmp/v104_*.png) */
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

/* 심지 않는다 — 지운다. 처음 켠 사람의 자리로 되돌린다. */
await S("Page.reload", { ignoreCache: true }); await wait(2000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);

const LOOK = `(()=>{
  const win=document.querySelector(".win:not([hidden])")||document.querySelector("#winWrap");
  const vis=e=>{const b=e.getBoundingClientRect(); if(b.width<2||b.height<2) return false;
    const cs=getComputedStyle(e); return !(cs.visibility==="hidden"||cs.display==="none"||cs.opacity==="0");};
  const out={};
  const off=[]; document.querySelectorAll("body *").forEach(e=>{ if(!vis(e)) return; const b=e.getBoundingClientRect();
    if(b.right>innerWidth+1||b.bottom>innerHeight+1||b.left<-1||b.top<-1) off.push((e.id||e.className||e.tagName)+" "+[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)].join(","));});
  out.off=off.slice(0,8);
  const sp=[]; document.querySelectorAll("body *").forEach(e=>{ if(!vis(e)) return;
    const cs=getComputedStyle(e);
    if(e.scrollHeight>e.clientHeight+1&&e.clientHeight>0&&cs.overflowY!=="visible") sp.push("↕ "+(e.id||e.className)+" "+e.scrollHeight+">"+e.clientHeight);
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&cs.overflowX!=="visible") sp.push("↔ "+(e.id||e.className)+" "+e.scrollWidth+">"+e.clientWidth);});
  out.spill=sp.slice(0,10);
  /* 잎 글자를 그대로 적는다 — 「없음/0/―」 이 무엇을 말하는지 사람이 읽게 */
  const say=[]; document.querySelectorAll("body *").forEach(e=>{ if(!vis(e)) return;
    if(e.children.length) return; const t=(e.textContent||"").trim(); if(t) say.push(t.slice(0,70));});
  out.text=say;
  /* 눌리지 않는 단추 — 덮였거나 화면 밖 */
  const dead=[]; document.querySelectorAll("body button, body .btn").forEach(e=>{ if(!vis(e)) return;
    const b=e.getBoundingClientRect(); const cx=b.left+b.width/2, cy=b.top+b.height/2;
    const hit=document.elementFromPoint(cx,cy);
    if(!hit||!(e===hit||e.contains(hit)||hit.contains(e))) dead.push((e.textContent||"").trim().slice(0,18)+" ← "+((hit&&(hit.id||hit.className))||"밖"));});
  out.dead=dead.slice(0,8);
  return out;})()`;

const rows = [];
const step = async (name, out) => {
  const r = await ev(LOOK); await shot(out);
  rows.push({ name, off: (r.off || []).length, spill: (r.spill || []).length, dead: (r.dead || []).length });
  console.log("── " + name + " → " + out);
  if (r.off?.length) console.log("   화면밖: " + r.off.join(" | "));
  if (r.spill?.length) console.log("   넘침: " + r.spill.join(" | "));
  if (r.dead?.length) console.log("   안눌림: " + r.dead.join(" | "));
  console.log("   글: " + (r.text || []).join(" · ").slice(0, 1200));
};

for (const [w, out] of [["doctrine","v104_doctrine"],["tactic","v104_tactic"],["reborn","v104_reborn"]]) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(600);
  await step("창 " + w + " (" + W + "×" + H + ")", "tmp/" + out + "_" + W + ".png");
  await ev(`window.__closeAll()`); await wait(250);
}
console.log("\n예외: " + (errs.length ? errs.join(" | ") : "없음"));
console.log(rows.map(r => `${r.name}: 화면밖 ${r.off} · 넘침 ${r.spill} · 안눌림 ${r.dead}`).join("\n"));
await raw("Target.closeTarget", { targetId });
bws.close();
