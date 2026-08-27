/* V-121 눈 — **같은 사람 · 같은 순간**에 문(__NUMOLD)만 여닫아 툴팁을 나란히 찍는다.
   왼쪽 옛것(「최대 마나 +197.9177682123602」 · 견줌 「+52」)
   오른쪽 지금(「최대 마나 +198」 · 견줌 「+114」). */
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
  M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach(k=>{M.equip[k]=C.mkItem(k,C.GEAR[k].tiers.length-2,false,20)});
  M.bag=ks.map(k=>C.mkItem(k,C.GEAR[k].tiers.length-1,false,34));
  C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const shot = async () => (await S("Page.captureScreenshot", { format: "png" })).data;
/* 투구(가방 3번)를 눌러 툴팁을 붙박는다. 창·툴팁이 정말 섰는지 스스로 본다. */
const open = async (old) => {
  const on = await ev(`(()=>{${old ? "globalThis.__NUMOLD=1" : "delete globalThis.__NUMOLD"};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('bag');
    return document.getElementById('winBag').classList.contains('on')?'ok':'no'})()`);
  if (on !== "ok") throw new Error("가방 창이 안 섰다");
  await wait(700);
  const txt = await ev(`(()=>{const c=document.querySelector('[data-bpick="3"]');
    if(!c) return 'NOCELL';
    if(c.offsetParent===null) return 'HIDDEN';
    c.click();
    const f=document.getElementById('ftip');
    if(!f) return 'NOFTIP';
    if(!f.classList.contains('on')) return 'NOTON:'+f.className;
    return f.innerText.replace(/\\n/g,' | ')})()`);
  if (!txt) throw new Error("툴팁이 안 섰다");
  await wait(500);
  return txt;
};
console.log("옛  " + await open(true));  const A = await shot();
const box = await ev(`(()=>{const r=document.getElementById('ftip').getBoundingClientRect();
  return {x:Math.floor(r.left)-8,y:Math.floor(r.top)-8,w:Math.ceil(r.width)+16,h:Math.ceil(r.height)+16}})()`);
console.log("지금 " + await open(false)); const B = await shot();
const box2 = await ev(`(()=>{const r=document.getElementById('ftip').getBoundingClientRect();
  return {x:Math.floor(r.left)-8,y:Math.floor(r.top)-8,w:Math.ceil(r.width)+16,h:Math.ceil(r.height)+16}})()`);

/* 툴팁 자리만 잘라 좌우로 붙인다 — 화면 전체를 쌓으면 정작 그 줄이 안 보인다. */
const out = await ev(`(async()=>{
  const load = s => new Promise(async r=>{const im=new Image();im.src="data:image/png;base64,"+s;await im.decode();r(im)});
  const a=await load(${JSON.stringify(A)}), b=await load(${JSON.stringify(B)});
  const d=a.width/1512, P=${JSON.stringify(box)}, Q=${JSON.stringify(box2)};
  const cut=(im,B0)=>[Math.round(B0.x*d),Math.round(B0.y*d),Math.round(B0.w*d),Math.round(B0.h*d)];
  const [ax,ay,aw,ah]=cut(a,P), [bx,by,bw,bh]=cut(b,Q);
  const c=document.createElement('canvas'); c.width=aw+bw+14; c.height=Math.max(ah,bh);
  const g=c.getContext('2d'); g.fillStyle="#000"; g.fillRect(0,0,c.width,c.height);
  g.drawImage(a,ax,ay,aw,ah,0,0,aw,ah); g.drawImage(b,bx,by,bw,bh,aw+14,0,bw,bh);
  return c.toDataURL('image/png').slice(22)})()`);
fs.writeFileSync("tmp/v121_cmp.png", Buffer.from(out, "base64"));
console.log("찍음 tmp/v121_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
