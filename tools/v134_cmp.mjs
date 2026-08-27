/* V-134 눈 — **같은 사람 · 같은 순간**에 문(__SHOPUPOLD)만 여닫아 상인 툴팁을 나란히 찍는다.
   왼쪽 옛것(물건에 적힌 「최대 체력 +319 → +560」만 있다) ·
   오른쪽 지금(그 밑에 **「사면 이렇게 된다 · 최대 체력 620 → 772」**가 붙는다).
   ★ 왼쪽 수도 손으로 안 적는다 — 문(`__SHOPFX_OLD`)을 그 자리서 여닫아 판이 그린 것을 그대로 찍는다. */
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
/* 자(`tools/v134_shop.mjs`)와 **같은 사람**을 심는다 — 그림의 수와 표의 수가 갈리면 안 된다. */
await ev(`(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=900000;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.up={hp:6,mp:6,dmg:6,army:3};
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  M.equip={}; for(const k of C.GEAR_KEYS) M.equip[k]={k,tier:3,af:[],v:0,il:20};
  M.bag=[];M.plus={};C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const shot = async () => (await S("Page.captureScreenshot", { format: "png" })).data;
/* 망토 칸을 눌러 툴팁을 세운다 — 물건은 「+319 → +560」인데 몸은 620 → 772 다.
   창·칸이 정말 섰는지 자가 스스로 본다([[silent-zero-is-not-an-observation]]). */
const open = async (old) => {
  const on = await ev(`(()=>{${old ? "globalThis.__SHOPFX_OLD=1" : "delete globalThis.__SHOPFX_OLD"};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('shop');
    return document.getElementById('winShop').classList.contains('on')?'ok':'no'})()`);
  if (on !== "ok") throw new Error("상인 창이 안 섰다");
  await wait(700);
  const txt = await ev(`(()=>{const c=document.querySelector('#shopGrid [data-pick="robe"]');
    if(!c) return 'NOCELL';
    c.click();
    const again=document.querySelector('#shopGrid [data-pick="robe"]');
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
fs.writeFileSync("tmp/v134_cmp.png", Buffer.from(out, "base64"));
console.log("찍음 tmp/v134_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
