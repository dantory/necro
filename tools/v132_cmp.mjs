/* V-132 견줌 — **같은 사람 · 같은 순간**에 강화 단추의 툴팁을 옛것·지금 나란히 찍는다.
   ★ 브라우저의 제 툴팁은 OS 가 그려 화면에 안 찍힌다. 그래서 단추의 `title` 을
     **그대로 읽어** 능력치 창 옆에 같은 글로 얹는다 — 글자는 손으로 안 적는다.
     옛 글월도 손으로 안 적는다: `UPS[k].dOld`(core.js)에서 뽑는다.
   → tmp/v132_cmp.png                                              */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  C.saveMeta();return 1})()`;

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
const on = await ev(`(()=>{const w=document.getElementById('winStat');
  if(!w.classList.contains('on')) document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC'}));
  return document.getElementById('winStat').classList.contains('on')})()`);
if (!on) { console.log("잴 수 없었다 — 능력치 창이 안 열렸다"); process.exit(1); }
await wait(400);

const shown = await ev(`(()=>{
  const C=globalThis.__C, UPS=C.UPS, up=[...document.querySelectorAll('#winStat [data-up]')];
  const 줄=(k)=>UPS[k].n+' 강화 — ';
  const 옛=up.map(b=>줄(b.dataset.up)+UPS[b.dataset.up].dOld+' · '+C.upCost(b.dataset.up).toLocaleString()+' 금');
  const 지금=up.map(b=>b.title);
  const box=document.createElement('div'); box.id='__upShot';
  const r=document.getElementById('winStat').getBoundingClientRect();
  box.innerHTML='<b>고치기 전</b>\\n'+옛.join('\\n')+'\\n\\n<b>지금</b>\\n'+지금.join('\\n');
  box.style.cssText='position:fixed;left:'+Math.round(r.right+16)+'px;top:'+Math.round(r.top)+'px;'
    +'z-index:99999;white-space:pre;background:#f5f2d0;color:#111;border:1px solid #000;'
    +'padding:8px 11px;font:13px/1.55 system-ui,sans-serif;box-shadow:2px 2px 0 rgba(0,0,0,.5)';
  document.body.appendChild(box);
  for(const b of up){b.style.outline='2px solid #ffcf5a';b.style.outlineOffset='1px';}
  return 지금.join(' | ')})()`);
console.log("  지금: " + shown);
await wait(250);
const box = await ev(`(()=>{const w=document.getElementById('winStat').getBoundingClientRect();
  const t=document.getElementById('__upShot').getBoundingClientRect();
  const x=w.left-16, y=Math.min(w.top,t.top)-14;
  return {x:Math.max(0,Math.round(x)), y:Math.max(0,Math.round(y)),
          width:Math.round(t.right-x+16), height:Math.round(Math.max(w.bottom,t.bottom)-y+14)}})()`);
const { data } = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } });
fs.writeFileSync("tmp/v132_cmp.png", Buffer.from(data, "base64"));
console.log("  찍음 tmp/v132_cmp.png");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
