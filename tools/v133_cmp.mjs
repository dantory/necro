/* V-133 견줌 — **같은 사람 · 같은 순간**에 물건 상자를 옛것·지금 나란히 찍는다.
   ★ 글자는 손으로 안 적는다 — 문(`__GEARFX_OLD`)만 여닫고 **판이 그린 상자를 그대로**
     복제해 나란히 세운다.
   → tmp/v133_cmp.png                                              */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");

/* 몇 시간 논 사람 — 3등급 20층 한 벌을 끼고, 가방에는 **꼭대기 등급 망토** 하나.
   체력을 쥔 슬롯이라 옛 뺄셈이 제일 크게 틀리던 자리다(「+369」인데 몸은 +233). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  M.equip={}; for(const k of C.GEAR_KEYS) M.equip[k]={k,tier:3,af:[],v:0,il:20};
  M.bag=[{k:'robe',tier:4,af:[{id:'hp',v:120}],v:0,il:20}]; M.plus={};
  C.saveMeta();return 1})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 900, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const 띄우기 = `(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin('bag');
  const c=document.querySelector('[data-bpick="0"]'); if(!c) return null;
  document.getElementById('ftip').classList.remove('on','pin');
  c.click();
  const f=document.getElementById('ftip');
  return f && f.classList.contains('on') ? f.outerHTML : null})()`;

await ev(`globalThis.__GEARFX_OLD = 1`);
const 옛것 = await ev(띄우기); await wait(150);
await ev(`globalThis.__GEARFX_OLD = 0`);
const 지금 = await ev(띄우기); await wait(150);
if (!옛것 || !지금) { console.log("잴 수 없었다 — 상자가 안 떴다"); process.exit(1); }

/* 둘을 나란히 세운다 — 판이 그린 그대로다(글자는 한 자도 손으로 안 적었다). */
await ev(`(()=>{
  document.getElementById('ftip').classList.remove('on','pin');
  const box=document.createElement('div');
  document.body.style.cssText+=';';box.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);display:flex;gap:28px;z-index:9999;align-items:flex-start';
  const one=(t,html)=>{const w=document.createElement('div');
    w.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center';
    const h=document.createElement('div');
    h.textContent=t; h.style.cssText='color:#e8dcc0;font:16px/1.5 Galmuri9,monospace;white-space:nowrap;text-shadow:0 1px 0 #000';
    const d=document.createElement('div'); d.innerHTML=html;
    const f=d.firstElementChild; f.style.cssText='position:static;left:auto;top:auto;display:block';
    w.appendChild(h); w.appendChild(d); return w;};
  box.appendChild(one('옛것 — 물건에 적힌 수끼리 뺐다', ${JSON.stringify(옛것)}));
  box.appendChild(one('지금 — 정말 끼면 이렇게 된다', ${JSON.stringify(지금)}));
  document.body.appendChild(box); return 1})()`);
await wait(300);
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("tmp/v133_cmp.png", Buffer.from(data, "base64"));
console.log("찍음 tmp/v133_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
