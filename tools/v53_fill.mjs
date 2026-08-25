/* V-53 자 — 물건 그림이 «칸»의 몇 %를 실제로 칠하는가.
   상자(<i>)가 아니라 **칠해진 화소**를 센다: 칸 크기대로 오프스크린에 그리고 알파>16 을 센다.
   그래서 「투명 여백」과 「가로세로비 어긋남」이 둘 다 이 한 수에 들어온다.
     node tools/v53_fill.mjs [tag] */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const TAG = process.argv[2] || "now";
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
await ev(`(() => { const M = window.META;
  const K = ["wand","robe","charm","helm","glove","ring","shield","belt","boots","ring2"];
  for (const k of K) M.equip[k] = { k, tier: 2, af: [{id:"dmg",v:12}] };
  M.bag = K.map((k,i) => ({ k, tier: (i%4)+1, af: [{id:"dmg",v:9}] }));
  window.saveMeta();
})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`window.__openWin("bag")`); await wait(800);
const rows = await ev(`(async () => {
  const out = [], cache = new Map();
  const load = (u) => cache.get(u) || (cache.set(u, new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; })), cache.get(u));
  for (const c of document.querySelectorAll('.pdSlot .cell, .sSec.bag .grid .cell')) {
    const r = c.getBoundingClientRect(); if (!r.width) continue;
    const i = c.querySelector('i'); if (!i) continue;
    const k = [...i.classList].find(x => x.startsWith('gear-')); if (!k) continue;
    const bi = getComputedStyle(i).backgroundImage; const m = /url\\("?([^")]+)"?\\)/.exec(bi); if (!m) continue;
    const im = await load(m[1]); if (!im) continue;
    const ib = i.getBoundingClientRect();
    /* contain: 상자 안에 비를 지키며 최대로 */
    const s = Math.min(ib.width / im.naturalWidth, ib.height / im.naturalHeight);
    const dw = Math.max(1, Math.round(im.naturalWidth * s)), dh = Math.max(1, Math.round(im.naturalHeight * s));
    const cv = document.createElement('canvas'); cv.width = dw; cv.height = dh;
    const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(im, 0, 0, dw, dh);
    const d = cx.getImageData(0, 0, dw, dh).data; let lit = 0;
    for (let p = 3; p < d.length; p += 4) if (d[p] > 16) lit++;
    out.push({ doll: !!c.closest('.pdSlot'), k: k.slice(5),
      cell: [Math.round(r.width), Math.round(r.height)],
      box: [Math.round(ib.width), Math.round(ib.height)],
      lit, fillCell: lit / (r.width * r.height), fillBox: lit / (ib.width * ib.height) });
  }
  return out;
})()`);
bws.close();
const doll = rows.filter(r => r.doll), bag = rows.filter(r => !r.doll);
const pc = (v) => (v * 100).toFixed(0) + "%";
const show = (name, rs) => {
  if (!rs.length) return;
  console.log(`\n── ${name} (${rs.length}칸)`);
  for (const r of rs) console.log(`  ${r.k.padEnd(7)} 칸 ${String(r.cell[0]).padStart(3)}×${String(r.cell[1]).padStart(3)}  칠함 ${String(r.lit).padStart(5)}px  칸의 ${pc(r.fillCell).padStart(4)}  상자의 ${pc(r.fillBox).padStart(4)}`);
  const avg = rs.reduce((a, r) => a + r.fillCell, 0) / rs.length;
  console.log(`  평균 칸 채움 ${pc(avg)} · 최악 ${rs.slice().sort((a,b)=>a.fillCell-b.fillCell)[0].k} ${pc(Math.min(...rs.map(r=>r.fillCell)))}`);
};
show("인물도", doll); show("가방", bag);
const all = rows.reduce((a, r) => a + r.fillCell, 0) / rows.length;
console.log(`\n[${TAG}] 전체 평균 칸 채움 ${pc(all)} (${rows.length}칸)`);
