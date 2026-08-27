/* V-120 자 — **「걸어는 봤는데 표가 안 선 구역」이 「아직 못 온 곳」처럼 적히는가.**
   가장 깊이를 다섯 자리로 바꿔 가며 「어디부터」 창을 열고, 잠긴 구역마다 적힌 줄을
   그대로 읽는다. 「내려가면 열린다」인데 **이미 그 구역에 발을 들였으면 거짓**이다.
   ★ 문 `node tools/v120_way.mjs old` — `__WAYOLD` 로 고치기 «전» 줄을 그대로 다시 낸다
     (자가 정말 우는지 먼저 보정한다 · [[silent-zero-is-not-an-observation]]).
   ★ 막이: 잠긴 구역이 무엇인지 · 열린 구역의 칸이 무엇인지 · 문턱 수는 한 톨도 안 변해야 한다. */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const DEEPS = [8, 20, 34, 45, 62];
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

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);

const rows = [];
for (const d of DEEPS) {
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  await ev(`(async()=>{globalThis.__C=await import('./js/core.js');return 1})()`);
  await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=40;M.gold=900000;M.deepest=${d};M.best=${d};M.diveSet=0;C.saveMeta();return M.deepest})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  await ev(`(async()=>{globalThis.__C=await import('./js/core.js');return 1})()`);
  if (OLD) await ev(`globalThis.__WAYOLD=1`);

  /* ★ 창이 **정말 섰는지** 자가 스스로 확인한다 — 토글이라 한 번 더 부르면 닫힌다(V-119). */
  const on = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin("dive");
    return [...document.querySelectorAll('.win.on')].map(e=>e.id).join(',')})()`);
  if (!/winDive/.test(on)) throw new Error(`가장 깊이 ${d}: 창이 안 섰다 (${on})`);
  await wait(400);

  const cards = await ev(`(()=>[...document.querySelectorAll('.wayZ')].map(z=>({
     nm: z.querySelector('.wayN').textContent.trim(),
     span: z.querySelector('.wayF').textContent.trim(),
     lock: z.classList.contains('lock'),
     been: z.classList.contains('been'),
     say: (z.querySelector('.wayLock')||{textContent:''}).textContent.trim(),
     chips: [...z.querySelectorAll('.diveOpt')].map(b=>b.textContent.trim()).join(' ')
   })))()`);

  const FROM = [1, 4, 9, 16, 26, 40, 60];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], from = FROM[i];
    /* 「내려가면 열린다」인데 이미 그 구역을 걸어 봤으면 — 사람이 아는 사실과 어긋난다 */
    c.wrong = c.lock && d >= from && /내려가면 열린다/.test(c.say);
    rows.push({ d, ...c });
  }
}

/* ══ 잠긴 줄의 «잉크» — 글자를 감췄다 켜서 달라진 화소만 센다(옅어서 안 읽히면 소용없다) */
const grab = async () => {
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  return await ev(`(async()=>{const im=new Image();im.src="data:image/png;base64,${data}";await im.decode();
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
    return {w:c.width,h:c.height,d:Array.from(g.getImageData(0,0,c.width,c.height).data)}})()`);
};
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

/* 가장 깊이 34 — 어둠의 성소(26~39)에 서 있는 사람의 그 줄을 잰다 */
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C=await import('./js/core.js');return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=40;M.gold=900000;M.deepest=34;M.best=34;C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`globalThis.__WAYOLD=1`);
await ev(`(()=>{window.__openWin("dive");return 1})()`);
await wait(500);
const box = await ev(`(()=>{const z=[...document.querySelectorAll('.wayZ.lock')][0];if(!z)return null;
   const e=z.querySelector('.wayLock');const r=e.getBoundingClientRect();
   return {x:Math.floor(r.left)-3,y:Math.floor(r.top)-3,w:Math.ceil(r.width)+6,h:Math.ceil(r.height)+6}})()`);
let ink = null;
if (box && box.w > 8 && box.h > 6) {
  const vis = v => ev(`(()=>{const z=[...document.querySelectorAll('.wayZ.lock')][0];z.querySelector('.wayLock').style.visibility=${JSON.stringify(v)};return 1})()`);
  await vis(""); await wait(250); const A = await grab();
  await vis("hidden"); await wait(250); const B = await grab();
  await vis(""); 
  const dpr = A.w / 1512;
  const x0 = Math.round(box.x * dpr), x1 = Math.round((box.x + box.w) * dpr);
  const y0 = Math.round(box.y * dpr), y1 = Math.round((box.y + box.h) * dpr);
  const tx = [], bg = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * A.w + x) * 4;
    const la = lum(A.d[i], A.d[i + 1], A.d[i + 2]), lb = lum(B.d[i], B.d[i + 1], B.d[i + 2]);
    if (la - lb > 0.004) { tx.push(la); bg.push(lb); }     // 글자가 앉은 자리
  }
  ink = tx.length < 12 ? null : { n: tx.length, cr: ratio(med(tx), med(bg)) };
}

const wrong = rows.filter(r => r.wrong).length;
console.log(`\n══ V-120 · 「어디부터」의 잠긴 구역 ══  ${OLD ? "옛 결(__WAYOLD)" : "지금"}`);
for (const d of DEEPS) {
  const rr = rows.filter(r => r.d === d);
  console.log(` 가장 깊이 ${d}층`);
  for (const r of rr)
    console.log(`   ${r.wrong ? "✗" : " "} ${r.nm.padEnd(8)} ${r.span.padEnd(9)} ${r.lock ? (r.been ? "[걸어봄]" : "[잠김]  ") : "[열림]  "} ${r.lock ? r.say : "칸 " + r.chips}`);
}
console.log(`\n 거짓으로 읽히는 줄  ${wrong} / ${rows.filter(r => r.lock).length} (잠긴 줄 가운데)`);
console.log(` 잠긴 구역 목록      ${rows.filter(r => r.lock).map(r => r.d + ":" + r.nm).join(" · ")}`);
console.log(` 열린 구역의 칸      ${rows.filter(r => !r.lock).map(r => r.d + ":" + r.nm + "[" + r.chips + "]").join(" · ")}`);
console.log(` 문턱 수(적힌 층)    ${rows.filter(r => r.lock).map(r => (r.say.match(/(\d+)층/g) || []).slice(-1)[0] || "?").join(" · ")}`);
console.log(` 잠긴 줄의 잉크      ${ink ? ink.cr.toFixed(2) + ":1 (화소 " + ink.n + ")" : "못 쟀다"}`);
fs.writeFileSync(`tmp/v120_way_${OLD ? "old" : "new"}.json`, JSON.stringify({ rows, wrong, ink }, null, 1));
await S("Target.closeTarget", { targetId });
process.exit(0);
