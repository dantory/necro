/* 편성/운용 창을 열었을 때 **바로 아래 HUD 줄**이 왜 죽는지 묻는다.
   짐작하지 않는다 — 그 자리에 무엇이 얹혀 있는지 판에게 직접 물어본다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
await S("Page.reload", { ignoreCache: true }); await wait(2200);
for (const w of ["doctrine", "reborn"]) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(450);
  const r = await ev(`(()=>{
    const box=document.querySelector(".win.on");
    const bag=[...document.querySelectorAll("#hud *, #hud")].filter(e=>/가방/.test(e.textContent||"")&&e.children.length===0)[0]
           || [...document.querySelectorAll("*")].filter(e=>e.children.length===0&&/^가방\\s/.test((e.textContent||"").trim()))[0];
    if(!bag) return {err:"가방 줄을 못 찾았다"};
    const br=bag.getBoundingClientRect(), wr=box?box.getBoundingClientRect():null;
    const cx=Math.round(br.left+br.width/2), cy=Math.round(br.top+br.height/2);
    const stack=document.elementsFromPoint(cx,cy).slice(0,6).map(e=>{
      const cs=getComputedStyle(e); return e.tagName+(e.id?"#"+e.id:"")+(e.className&&typeof e.className==="string"?"."+e.className.trim().split(/\\s+/).join("."):"")
        +" bg="+cs.backgroundColor+" op="+cs.opacity+" sh="+(cs.boxShadow||"none").slice(0,60)+" z="+cs.zIndex+" pe="+cs.pointerEvents;});
    return {win:box&&box.id, winBottom:wr&&Math.round(wr.bottom), rowTop:Math.round(br.top), gap:wr?Math.round(br.top-wr.bottom):null,
            sel:bag.id||bag.className||bag.tagName, color:getComputedStyle(bag).color, stack};
  })()`);
  console.log("──", w, JSON.stringify(r, null, 1));
  await ev(`window.__closeWin && window.__closeWin()`); await wait(200);
}
await raw("Target.closeTarget", { targetId }); process.exit(0);
