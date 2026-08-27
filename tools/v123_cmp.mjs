/* V-123 눈 — **같은 사람 · 같은 순간**에 문(__TREEFX_OLD)만 여닫아 트리 툴팁을 나란히 찍는다.
   왼쪽 옛것(설명 한 줄 「저주 지속 +3초 · 증폭 +8%」뿐) · 오른쪽 지금(지금 값과 한 점 더). */
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
  M.up={hp:12,mp:9,dmg:14,army:6};
  M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,fury:2,
          rot:4,harvest:3, wand:6,swift:4,weaken:1,deep:1};
  C.syncSkills&&C.syncSkills();C.saveMeta();
  if(C.spLeft()<0) throw new Error('점수가 모자란 씨앗이다');return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);

const shot = async () => (await S("Page.captureScreenshot", { format: "png" })).data;
/* 「깊은 저주」 칸을 눌러 툴팁을 세운다 — 한 칸이 네 수치를 건드리는 **가장 긴** 자리라
   툴팁이 넘치는지도 여기서 보인다. 창·칸이 정말 섰는지 자가 스스로 본다
   ([[silent-zero-is-not-an-observation]]). */
const open = async (old) => {
  const on = await ev(`(()=>{${old ? "globalThis.__TREEFX_OLD=1" : "delete globalThis.__TREEFX_OLD"};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('tree');
    return document.getElementById('winTree').classList.contains('on')?'ok':'no'})()`);
  if (on !== "ok") throw new Error("트리 창이 안 섰다");
  await wait(700);
  const txt = await ev(`(()=>{const q=()=>document.querySelector('[data-tn="deep"]');
    const c=q(); if(!c) return 'NOCELL';
    c.click();
    /* 누르면 drawTree 가 격자를 통째로 다시 그린다 — **다시 찾아** 확인한다(V-122). */
    if(!q()?.classList.contains('sel')) return 'NOTSEL';
    const t=document.getElementById('treeTip');
    return t.innerText.replace(/\\n/g,' | ')})()`);
  if (!txt || txt.startsWith("NO")) throw new Error("툴팁이 안 섰다: " + txt);
  await wait(500);
  return txt;
};
const box = async () => ev(`(()=>{const r=document.getElementById('treeTip').getBoundingClientRect();
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
fs.writeFileSync("tmp/v123_cmp.png", Buffer.from(out, "base64"));
console.log("찍음 tmp/v123_cmp.png");
await S("Target.closeTarget", { targetId });
process.exit(0);
