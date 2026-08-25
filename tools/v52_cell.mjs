/* V-52 자 — 장비 «칸» 안에서 무엇이 몇 픽셀을 차지하는가.
   그림(i) 상자 · 등급 숫자(.q) · 재련 딱지(.plusBadge) 를 칸 크기와 견준다.
     node tools/v52_cell.mjs */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`); await S("Page.reload", { ignoreCache: true }); await wait(2800);
/* 장비를 잔뜩 심는다 — 열 슬롯 전부 + 가방에 여러 종 */
await ev(`(() => { const M = window.META;
  const K = ["wand","robe","charm","helm","glove","ring","shield","belt","boots","ring2"];
  for (const k of K) M.equip[k] = { k, tier: 2, af: [{id:"dmg",v:12},{id:"hp",v:60}] };
  M.plus = {}; for (const k of K) M.plus[k] = 1;
  M.bag = K.map((k,i) => ({ k, tier: (i%4)+1, af: [{id:"dmg",v:9}] }));
  window.saveMeta();
})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
if (process.argv.includes("--old")) await ev(`document.body.classList.add("qold")`);
await ev(`window.__openWin("bag")`); await wait(700);
const rows = await ev(`(() => {
  const out = [];
  for (const c of document.querySelectorAll('.pdSlot .cell, .sSec.bag .grid .cell')) {
    const r = c.getBoundingClientRect(); if (!r.width) continue;
    const i = c.querySelector('i'), q = c.querySelector('.q'), pb = c.querySelector('.plusBadge');
    const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
      return [Math.round(b.left-r.left), Math.round(b.top-r.top), Math.round(b.width), Math.round(b.height)]; };
    const cls = [...c.classList].join(' ');
    out.push({ doll: !!c.closest('.pdSlot'), k: (i && [...i.classList].find(x=>x.startsWith('gear-'))) || '', cell:[Math.round(r.width),Math.round(r.height)],
      icon: rr(i), q: rr(q), pb: rr(pb), qfs: q ? getComputedStyle(q).fontSize : null,
      empty: cls.includes('empty') });
  }
  return out;
})()`);
const items = rows.filter(r => !r.empty && r.icon);
console.log(`칸 ${items.length} 개${process.argv.includes("--old") ? " · 옛 글자" : ""}`);
let worst = 0, sumTall = 0, sumCover = 0, nDoll = 0;
for (const r of items) {
  const [cw, ch] = r.cell, ic = r.icon, q = r.q, pb = r.pb;
  const iconFill = ic ? (ic[2]*ic[3])/(cw*ch) : 0;
  const qFill = q ? (q[2]*q[3])/(cw*ch) : 0;
  const overQ = q && ic ? Math.max(0, Math.min(ic[0]+ic[2], q[0]+q[2]) - Math.max(ic[0], q[0]))
                        * Math.max(0, Math.min(ic[1]+ic[3], q[1]+q[3]) - Math.max(ic[1], q[1])) : 0;
  const outQ = q ? Math.max(0, (q[0]+q[2]) - cw) + Math.max(0, (q[1]+q[3]) - ch) : 0;
  const outP = pb ? Math.max(0, (pb[0]+pb[2]) - cw) + Math.max(0, (pb[1]+pb[3]) - ch) : 0;
  const shortSide = Math.min(cw, ch);
  const tall = q ? q[3] / shortSide : 0;                  // 글자 높이 ÷ 칸 짧은변
  const cover = ic ? overQ / (ic[2] * ic[3]) : 0;         // 글자가 덮은 그림 넓이 몫
  if (r.doll) { nDoll++; sumTall += tall; sumCover += cover; worst = Math.max(worst, tall); }
  console.log(`${r.doll ? "낀" : "가방"} ${(r.k||'?').replace("gear-","").padEnd(8)} 칸 ${cw}x${ch}  그림 ${(iconFill*100).toFixed(0)}%  등급 ${q&&q[2]}x${q&&q[3]}(${r.qfs}) 짧은변의 ${(tall*100).toFixed(0)}%  그림 덮음 ${(cover*100).toFixed(0)}%  칸밖 ${outQ+outP}px`);
}
console.log(`── 낀 칸 ${nDoll} — 등급 글자가 짧은변의 평균 ${(sumTall/nDoll*100).toFixed(0)}% (최대 ${(worst*100).toFixed(0)}%) · 그림을 평균 ${(sumCover/nDoll*100).toFixed(0)}% 덮는다`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
