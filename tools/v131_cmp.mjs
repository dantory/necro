/* V-131 견줌 — **같은 사람 · 같은 순간**에 문(`__TIPOLD`)만 여닫아 벨트 칸의 툴팁을 나란히 찍는다.
   ★ 브라우저의 **제 툴팁은 화면에 안 찍힌다**(OS 가 그린다). 그래서 칸의 `title` 을
     **그대로 읽어** 칸 위에 같은 글로 얹어 찍는다 — 글자는 손으로 안 적고 DOM 에서 뽑는다.
   위 = 고치기 전 · 아래 = 지금.  → tmp/v131_cmp.png */
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
  M.lv=30;M.gold=182400;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4};
  C.saveMeta();return 1})()`;

async function shoot(old, out) {
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
  if (old) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__TIPOLD = 1;" });
  await S("Page.reload", { ignoreCache: true }); await wait(2500);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  await ev(`window.__toDungeon()`); await wait(7000);
  /* 칸의 title 을 **그대로** 읽어 그 칸 위에 얹는다(브라우저 툴팁과 같은 자리·같은 글). */
  await ev(`(()=>{
    const el=document.querySelector('#belt [data-sk="nova"]'); const r=el.getBoundingClientRect();
    const d=document.createElement('div'); d.id='__tipShot';
    d.textContent = el.title.replace(/&#10;/g,'\\n');
    d.style.cssText='position:fixed;left:'+Math.round(r.left-40)+'px;top:'+Math.round(r.top-78)+'px;'
      +'z-index:99999;white-space:pre;background:#f5f2d0;color:#111;border:1px solid #000;'
      +'padding:6px 9px;font:13px/1.45 system-ui,sans-serif;box-shadow:2px 2px 0 rgba(0,0,0,.5)';
    document.body.appendChild(d);
    el.style.outline='2px solid #ffcf5a'; el.style.outlineOffset='1px';
    return d.textContent})()`);
  await wait(250);
  /* 벨트와 그 위 툴팁만 오려 찍는다 — 전체 화면은 판이 다 덮어 글이 안 읽힌다. */
  const box = await ev(`(()=>{const b=document.getElementById('belt').getBoundingClientRect();
    const t=document.getElementById('__tipShot').getBoundingClientRect();
    const x=Math.min(b.left,t.left)-24, y=t.top-14;
    return {x:Math.max(0,Math.round(x)), y:Math.max(0,Math.round(y)),
            width:Math.round(Math.max(b.right,t.right)-x+24), height:Math.round(b.bottom-y+14)}})()`);
  const { data } = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  console.log("  찍음 " + out);
  await raw("Target.closeTarget", { targetId });
}
await shoot(true,  "tmp/v131_old.png");
await shoot(false, "tmp/v131_new.png");
bws.close(); process.exit(0);
