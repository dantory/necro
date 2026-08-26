/* V-103 자 — **경험치 띠가 제 이름표 아래에만 서는가.**
   1층에 내려가(처음 켠 사람) 밑자락의 띠와 수 셋의 자리를 잰다.
   ★ **자와 문턱을 맞춘다**([[threshold-and-ruler-must-match]]). 띠와 수 줄은 폭이 같아
     「가로로 겹친 폭」은 옮겨도 92px 그대로다 — 그 수로는 판정이 안 된다.
     읽히는 까닭은 **「시체」 바로 밑에 띠가 잇닿아 있다**는 것이므로, 자는
     ① 「시체」의 아래로 곧장 내려가 **처음 만나는 것이 띠인가**(사이에 낀 것이 없는가)
     를 본다. 곁들여 ② 왼끝 어긋남 ③ Lv 이름표와의 세로 거리 ④ 벨트보다 아래인가
     ⑤ **판 높이가 안 변했는가**(차례만 바꿨으므로 한 톨도 안 변해야 한다).
   문: `node tools/v103_xpbar.mjs old` → `body.xpold` 로 옛 차례. 자가 정말 우는지 먼저 본다.
   쓰기: node tools/v103_xpbar.mjs [old] [width] [height] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const nums = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const W = +(nums[0] || 1512), H = +(nums[1] || 863);
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
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`document.body.classList.add("xpold")`);
await ev(`window.__toDungeon()`); await wait(9000);

const R = `(()=>{ const g=id=>{const e=document.getElementById(id)||document.querySelector(id); if(!e) return null;
    const b=e.getBoundingClientRect(); return {l:Math.round(b.left),r:Math.round(b.right),t:Math.round(b.top),b:Math.round(b.bottom)};};
  const bar=g("xpWrap"), cor=g("gCorpse"), lv=g("xpNum"), army=g("gArmy"), belt=g("belt"), panel=g("#panel")||g("#hud");
  /* ① 「시체」 한가운데에서 **곧장 아래로** 내려가며, 띠에 닿기 전에 무엇을 지나는가.
     elementFromPoint 는 실제로 그려진 것을 짚으므로 자가 사람의 눈을 흉내낸다. */
  const 사이=[];
  if (cor && bar) { const x=Math.round((cor.l+cor.r)/2);
    for (let y=cor.b+2; y<bar.t; y+=3) { const e=document.elementFromPoint(x,y); if(!e) continue;
      const k=e.id||e.className||e.tagName; if(k&&!/^(app|stage|panel|mid|hud)$/.test(k)) 사이.push(String(k).slice(0,24)); } }
  const fill=document.getElementById("xpFill"), bw=bar? bar.r-bar.l : 0;
  return { bar, cor, lv, army, belt, panelH: panel? panel.b-panel.t : 0, 사이:[...new Set(사이)],
    채움: fill && bw ? +(fill.getBoundingClientRect().width/bw*100).toFixed(1) : null,
    글: { 시체:(document.getElementById("gCorpse")||{}).textContent, lv:(document.getElementById("xpNum")||{}).textContent, 군세:(document.getElementById("gArmy")||{}).textContent } }; })()`;
const m = await ev(R);
const 겹침 = (a, b) => (a && b) ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) : -1;
const rep = {
  결: OLD ? "옛" : "지금",
  "띠 왼끝 ↔ 시체 왼끝(px)": m.bar && m.cor ? Math.abs(m.bar.l - m.cor.l) : -1,
  "띠 오른끝 ↔ 군세 오른끝(px)": m.bar && m.army ? Math.abs(m.bar.r - m.army.r) : -1,
  "「시체」 밑으로 내려가다 띠 앞에 만나는 것": m.사이.length ? m.사이 : "없음 — 띠가 곧바로 잇닿는다",
  "가로로 걸친 폭(px · 옮겨도 안 변한다)": 겹침(m.bar, m.cor) + "/" + 겹침(m.bar, m.army),
  "띠가 벨트보다 아래인가": m.bar && m.belt ? (m.bar.t >= m.belt.b) : null,
  "띠 ↔ Lv 이름표 세로 거리(px)": m.bar && m.lv ? m.bar.t - m.lv.b : -1,
  "판 높이(px)": m.panelH, "채움(%)": m.채움, 글: m.글,
};
rep["판정"] = (m.사이.length && m.bar && m.belt && m.bar.t >= m.belt.b)
  ? "통과 — 띠가 수 줄에서 떨어졌다"
  : "틀림 — 「시체」 바로 밑에 띠가 잇닿아 그 수의 눈금으로 읽힌다";
console.log(JSON.stringify(rep, null, 1));
if (errs.length) console.log("예외:", errs.slice(0, 4));
await raw("Target.closeTarget", { targetId }); bws.close();
