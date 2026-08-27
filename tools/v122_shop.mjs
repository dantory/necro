/* V-122 자 — 상인 창의 「다음」 줄이 **초록인데 내려가는가**를 센다.
   깊이 셋(16 · 34 · 50층) × 슬롯 열 = 서른 줄. 낀 것은 그 깊이에서 주운 것으로 세운다.
   `node tools/v122_shop.mjs old` 면 `__SHOPUPOLD` 로 고치기 «전» 결을 그대로 다시 낸다
   ([[silent-zero-is-not-an-observation]]). */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
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
await S("Page.navigate", { url: URL }); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);

let green = 0, greenDown = 0, told = 0, rows = 0, sample = [];
for (const d of [16, 34, 50]) {
  const SEED = `(()=>{const C=globalThis.__C,M=C.META;
    M.lv=46;M.gold=99999999;M.deepest=${d};M.best=${d};
    Object.keys(C.GEAR).forEach(k=>{M.equip[k]=C.mkItem(k,C.GEAR[k].tiers.length-2,true,${d})});
    M.bag=[];C.saveMeta();return 1})()`;
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  await ev(SEED);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`globalThis.__SHOPUPOLD=1`);
  const r = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('shop');
    const w=document.getElementById('winShop');
    if(!w||!w.classList.contains('on')) throw new Error('상인 창이 안 섰다');
    const num=t=>{const m=String(t).match(/([+-]?[\\d.]+)/);return m?parseFloat(m[1]):NaN};
    const out=[];
    /* ★ 칸을 누르면 drawShop 이 격자를 통째로 다시 그린다 — 미리 잡아 둔 목록은 그 순간
       **떨어져 나가** 누름이 안 올라간다(첫 칸의 값이 열 번 나왔다). 열쇠만 먼저 모으고
       **누를 때마다 다시 찾는다**([[silent-zero-is-not-an-observation]]). */
    const keys=[...document.querySelectorAll('#shopGrid [data-pick]')]
      .map(e=>e.getAttribute('data-pick')).filter(k=>k!=='dig');
    for(const k of keys){
      const c=document.querySelector('#shopGrid [data-pick="'+k+'"]');
      if(!c) throw new Error('칸이 사라졌다: '+k);
      c.click();
      if(!document.querySelector('#shopGrid [data-pick="'+k+'"]').classList.contains('sel'))
        throw new Error('누름이 안 먹었다: '+k);
      const tip=document.getElementById('shopTip');
      const st=[...tip.querySelectorAll('.tipStat')];
      const nextRow=st[st.length-1]; const nowRow=st[0];
      if(!nextRow||nextRow===nowRow) continue;          // 최고 등급 — 「다음」이 없다
      const nowV=num(nowRow.querySelector('b')?.textContent);
      const nxV=num(nextRow.querySelector('b')?.textContent);
      const cls=nextRow.className;
      const note=[...tip.querySelectorAll('.tipNote')].map(e=>e.innerText).join(' ');
      out.push({k,nowV,nxV,up:/\\bup\\b/.test(cls),down:/\\bdown\\b/.test(cls),
        told:/못하다|같다/.test(note)});
    }
    return JSON.stringify(out);})()`);
  const arr = JSON.parse(r);
  for (const o of arr) {
    rows++;
    if (o.up) green++;
    if (o.up && o.nxV <= o.nowV) { greenDown++; if (sample.length < 5) sample.push(`${d}층 ${o.k} ${o.nowV}→${o.nxV}`); }
    if (o.nxV <= o.nowV && o.told) told++;
  }
  console.log(`  ${d}층 · 줄 ${arr.length} · 초록 ${arr.filter(o => o.up).length} · 실제 내려감 ${arr.filter(o => o.nxV <= o.nowV).length}`);
}
console.log((OLD ? "[옛 결] " : "[지금] ") + `잰 줄 ${rows}`);
console.log(`  «초록인데 안 오르는» 줄        ${greenDown}`);
console.log(`  안 오르는데 그렇다고 «적은» 줄  ${told}`);
if (sample.length) console.log("  보기: " + sample.join(" | "));
/* 판정 — 「초록인데 안 오르는 줄」이 하나라도 있으면 운다. 옛 결(`old`)에서는 울어야
   맞다(13/30). 자를 보정하는 자리다([[silent-zero-is-not-an-observation]]). */
const bad = greenDown > 0 || (rows - green - told !== 0 && !OLD);
console.log(bad ? `판정 미달 — 초록인데 안 오르는 줄 ${greenDown}` : "판정 통과 — 0");
await S("Target.closeTarget", { targetId });
process.exit(bad && !OLD ? 1 : 0);
