/* V-103 자 — 밑자락의 «막대»와 그 위에 선 수 셋의 자리를 잰다.
   막대는 경험치인데 그 왼쪽 끝 위에 「시체 6/140」이 서면 그 막대의 이름표로 읽힌다.
   ① 막대의 왼/오 끝 ② 채워진 몫 ③ 수 셋이 각각 막대의 몇 %자리에 서는가.
   쓰기: node tools/v103_bar.mjs [width] [height] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`window.__toDungeon()`); await wait(9000);
console.log(JSON.stringify(await ev(`(()=>{
  const R=e=>{const b=e.getBoundingClientRect();return {l:Math.round(b.left),r:Math.round(b.right),t:Math.round(b.top),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};};
  const bars=[...document.querySelectorAll("#hud *,#bottom *,body *")].filter(e=>{
    const b=e.getBoundingClientRect(); return b.width>150&&b.height>0&&b.height<24&&b.top>innerHeight*0.5;});
  const out={ bars: bars.slice(0,10).map(e=>({id:e.id,cls:(e.className||"").toString().slice(0,30),...R(e)})) };
  const lab=[...document.querySelectorAll("body *")].filter(e=>!e.children.length&&/시체|Lv\\.|군세/.test(e.textContent||"")&&e.getBoundingClientRect().top>innerHeight*0.5);
  out.labels=lab.map(e=>({t:(e.textContent||"").trim(),id:e.id,cls:(e.className||"").toString().slice(0,24),...R(e)}));
  return out; })()`), null, 1));
await raw("Target.closeTarget", { targetId }); bws.close();
