/* V-120 눈 — **같은 사람(가장 깊이 34층) · 같은 순간**에 문만 여닫아 나란히 찍는다.
   위 옛것(「어둠의 성소 26~39층 · 40층까지 내려가면 열린다」 — 지금 걷고 있는 그 구역이다)
   아래 지금(「걸어는 봤다 — 표는 가장 깊이보다 10층 뒤에 선다(40층부터)」). */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.relics=7;M.rebirths=2;M.diveSet=0;C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const shot = async () => (await S("Page.captureScreenshot", { format: "png" })).data;
/* 창이 정말 섰는지 스스로 본다(토글이라 한 번만 부르면 닫힌다 · V-119) */
const open = async (old) => {
  const on = await ev(`(()=>{${old ? "globalThis.__WAYOLD=1" : "delete globalThis.__WAYOLD"};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin("dive");
    return [...document.querySelectorAll('.win.on')].map(e=>e.id).join(',')})()`);
  if (!/winDive/.test(on)) throw new Error("창이 안 섰다 " + on);
  await wait(500);
  return await ev(`(()=>{const z=[...document.querySelectorAll('.wayZ.lock')][0];
     return z.querySelector('.wayN').textContent+" · "+z.querySelector('.wayLock').textContent})()`);
};
console.log("옛  " + await open(true));  const A = await shot();
console.log("지금 " + await open(false)); const B = await shot();

/* 창 자리만 잘라 위아래로 붙인다 — 화면 전체를 두 장 쌓으면 정작 그 줄이 안 보인다 */
const box = await ev(`(()=>{const r=document.getElementById('winDive').getBoundingClientRect();
  return {x:Math.floor(r.left),y:Math.floor(r.top),w:Math.ceil(r.width),h:Math.ceil(r.height)}})()`);
const out = await ev(`(async()=>{
  const load = s => new Promise(async r=>{const im=new Image();im.src="data:image/png;base64,"+s;await im.decode();r(im)});
  const a=await load(${JSON.stringify(A)}), b=await load(${JSON.stringify(B)});
  const d=a.width/${1512}, B0=${JSON.stringify(box)};
  const x=Math.round(B0.x*d), y=Math.round(B0.y*d), w=Math.round(B0.w*d), h=Math.round(B0.h*d);
  const c=document.createElement('canvas'); c.width=w; c.height=h*2+10;
  const g=c.getContext('2d'); g.fillStyle="#000"; g.fillRect(0,0,c.width,c.height);
  g.drawImage(a,x,y,w,h,0,0,w,h); g.drawImage(b,x,y,w,h,0,h+10,w,h);
  return c.toDataURL('image/png').slice(22)})()`);
fs.writeFileSync("tmp/v120_cmp.png", Buffer.from(out, "base64"));
console.log("찍음 tmp/v120_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
