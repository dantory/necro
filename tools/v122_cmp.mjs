/* V-122 눈 — **같은 사람 · 같은 순간**에 문(__SHOPUPOLD)만 여닫아 상인 툴팁을 나란히 찍는다.
   왼쪽 옛것(「금 획득 +50%」이 **초록**) · 오른쪽 지금(붉게 + 「지금 낀 것보다 못하다」). */
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
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("페이지에서 터짐: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value; };
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;
  Object.keys(C.GEAR).forEach(k=>{M.equip[k]=C.mkItem(k,C.GEAR[k].tiers.length-2,true,34)});
  M.bag=[];C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const shot = async () => (await S("Page.captureScreenshot", { format: "png" })).data;
/* 반지 칸을 눌러 툴팁을 세운다 — 34층에서 「+53% → +50%」로 **내려가는** 자리다.
   창·칸이 정말 섰는지 자가 스스로 본다([[silent-zero-is-not-an-observation]]). */
const open = async (old) => {
  const on = await ev(`(()=>{${old ? "globalThis.__SHOPUPOLD=1" : "delete globalThis.__SHOPUPOLD"};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('shop');
    return document.getElementById('winShop').classList.contains('on')?'ok':'no'})()`);
  if (on !== "ok") throw new Error("상인 창이 안 섰다");
  await wait(700);
  const txt = await ev(`(()=>{const c=document.querySelector('#shopGrid [data-pick="ring"]');
    if(!c) return 'NOCELL';
    c.click();
    const again=document.querySelector('#shopGrid [data-pick="ring"]');
    if(!again.classList.contains('sel')) return 'NOTSEL';
    const t=document.getElementById('shopTip');
    return t.innerText.replace(/\\n/g,' | ')})()`);
  if (!txt || txt.startsWith("NO")) throw new Error("툴팁이 안 섰다: " + txt);
  await wait(500);
  return txt;
};
const box = async () => ev(`(()=>{const r=document.getElementById('shopTip').getBoundingClientRect();
  return {x:Math.floor(r.left)-8,y:Math.floor(r.top)-8,w:Math.ceil(r.width)+16,h:Math.ceil(r.height)+16}})()`);
console.log("옛  " + await open(true));  const A = await shot(); const P = await box();
console.log("지금 " + await open(false)); const B = await shot(); const Q = await box();

const out = await ev(`(async()=>{
  const load = s => new Promise(async r=>{const im=new Image();im.src="data:image/png;base64,"+s;await im.decode();r(im)});
  const a=await load(${JSON.stringify(A)}), b=await load(${JSON.stringify(B)});
  const d=a.width/1512, P=${JSON.stringify(P)}, Q=${JSON.stringify(Q)};
  const cut=(B0)=>[Math.round(B0.x*d),Math.round(B0.y*d),Math.round(B0.w*d),Math.round(B0.h*d)];
  const [ax,ay,aw,ah]=cut(P), [bx,by,bw,bh]=cut(Q);
  const c=document.createElement('canvas'); c.width=aw+bw+14; c.height=Math.max(ah,bh);
  const g=c.getContext('2d'); g.fillStyle="#000"; g.fillRect(0,0,c.width,c.height);
  g.drawImage(a,ax,ay,aw,ah,0,0,aw,ah); g.drawImage(b,bx,by,bw,bh,aw+14,0,bw,bh);
  return c.toDataURL('image/png').slice(22)})()`);
fs.writeFileSync("tmp/v122_cmp.png", Buffer.from(out, "base64"));
console.log("찍음 tmp/v122_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
