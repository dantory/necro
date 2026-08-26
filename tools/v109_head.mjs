/* ══ V-109 자 ══ 위 띠의 글자가 «제 둘레 위에서» 읽히는가.
   #top 은 화면에 떠 있는 DOM 이고 그 뒤는 층마다 색이 갈리는 무대 캔버스다. CSS 색만
   봐서는 알 수 없다 — 같은 자리를 **끄고 · 켜고 · 다시 끄고** 세 장 찍어, 두 바탕이
   똑같았던 자리에서만 「글자」를 가려낸다(움직이는 것이 지난 자리는 버린다).
   ★ 견주는 대상은 **글자를 지운 바닥이 아니라 «켠 화면에서 글자 바로 둘레»** 다.
     글자 그늘(text-shadow)은 글자와 함께 뜨고 함께 사라지므로, 지운 장을 바탕으로
     쓰면 **그늘이 통째로 안 세어진다** — 눈이 보는 것과 다른 것을 재게 된다.
   ★ 낱말은 통째로 읽힌다 — 세로 8px 토막마다 따로 견주고 **가장 나쁜 토막**을 그
     라벨의 값으로 삼는다(화로 하나가 낱자 둘을 먹는 일이 있었다 · tmp/z_head87.png).

   쓰기:  node tools/v109_head.mjs [old]
          old → body.headold 로 옛 결을 되돌려 자가 정말 우는지 보정한다. */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const OK = 3.0;                       /* 큰 글자 기준(WCAG AA large) */
const FLOORS = [1, 4, 9, 16, 26, 40, 60];              /* 구역 일곱의 첫 층 */
const SIZES = [[1512, 863], [1366, 700], [1280, 620]];
const LABELS = [["hFloor", "층"], ["hDepth", "깊이 배수"], ["hZone", "구역 이름"], ["hLeft", "남은 적"]];
const IDS = JSON.stringify(LABELS.map(l => l[0]));

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

/** 화면을 찍어 원시 화소로 — CDP 스크린샷을 페이지 안 캔버스로 되읽는다. */
const grab = async () => {
  const b64 = (await S("Page.captureScreenshot", { format: "png" })).data;
  return await ev(`(async()=>{
    const im = new Image(); im.src = "data:image/png;base64,${b64}";
    await im.decode();
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(im,0,0);
    return {w:c.width, h:c.height, d:Array.from(g.getImageData(0,0,c.width,c.height).data)};
  })()`);
};

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`document.body.classList.add("headold")`);
  await ev(`window.__toDungeon()`); await wait(900);
  for (const f of FLOORS) {
    /* 판을 세우고 그 층의 바닥으로 갈아 끼운다.
       ★ **몸은 안 치운다** — 치우면 「남은 적 N」이 「다음 층 준비 중」으로 바뀌어
       **사람이 실제로 읽는 글월이 아닌 것**을 재게 된다(처음에 그렇게 쟀다
       · [[probe-must-walk-the-real-path]]). */
    await ev(`(()=>{const S=window.__S;S.speed=0;S.floor=${f};S.fx.length=0;return 1})()`);
    await wait(800);
    const setVis = (v) => ev(`(()=>{for(const k of ${IDS}){const e=document.getElementById(k);if(e)e.style.visibility=${JSON.stringify(v)}}
      const S=window.__S;S.speed=0;S.fx.length=0;return 1})()`);
    const rects = await ev(`(()=>{const o={};for(const k of ${IDS}){
      const e=document.getElementById(k); if(!e){o[k]=null;continue}
      const r=e.getBoundingClientRect();
      o[k]= (r.width<1||r.height<1||!e.textContent.trim()||getComputedStyle(e).display==="none") ? null
           : {x:Math.floor(r.left)-6,y:Math.floor(r.top)-6,w:Math.ceil(r.width)+12,h:Math.ceil(r.height)+12,t:e.textContent.trim()};
      }return o})()`);
    await setVis("hidden"); await wait(280); const B1 = await grab();
    await setVis("");       await wait(280); const A  = await grab();
    await setVis("hidden"); await wait(280); const B2 = await grab();
    await setVis("");

    const dpr = A.w / W;
    for (const [k, name] of LABELS) {
      const r = rects[k]; if (!r) continue;
      const x0 = Math.max(0, Math.round(r.x * dpr)), x1 = Math.min(A.w - 1, Math.round((r.x + r.w) * dpr));
      const y0 = Math.max(0, Math.round(r.y * dpr)), y1 = Math.min(A.h - 1, Math.round((r.y + r.h) * dpr));
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const dif = new Float64Array(bw * bh), la = new Float64Array(bw * bh), ok = new Uint8Array(bw * bh);
      let dmax = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * A.w + x) * 4, j = (y - y0) * bw + (x - x0);
        /* 두 바탕이 다른 자리는 «움직이는 것»이 지난 자리다 — 아예 안 쓴다 */
        if (B1.d[i] !== B2.d[i] || B1.d[i + 1] !== B2.d[i + 1] || B1.d[i + 2] !== B2.d[i + 2]) continue;
        ok[j] = 1;
        la[j] = lum(A.d[i], A.d[i + 1], A.d[i + 2]);
        const lb = lum(B1.d[i], B1.d[i + 1], B1.d[i + 2]);
        dif[j] = Math.abs(la[j] - lb); if (dif[j] > dmax) dmax = dif[j];
      }
      /* 글자 «속» — 가장자리 반투명 화소는 바탕과 섞여 밝기를 흐린다 */
      const core = new Uint8Array(bw * bh); const cs = [];
      for (let j = 0; j < core.length; j++) if (ok[j] && dif[j] >= dmax * 0.6) { core[j] = 1; cs.push(j); }
      if (cs.length < 24) { rows.push({ W, f, name, n: cs.length, r: null, s: null, t: r.t }); continue; }
      /* 둘레 — 글자 속에서 3화소 안(그늘이 앉는 자리). 켠 화면(A)에서 읽는다. */
      const R = Math.max(2, Math.round(3 * dpr));
      const near = new Uint8Array(bw * bh);
      for (const j of cs) { const cy = (j / bw) | 0, cx = j % bw;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const yy = cy + dy, xx = cx + dx; if (yy < 0 || xx < 0 || yy >= bh || xx >= bw) continue;
          const jj = yy * bw + xx; if (!core[jj] && ok[jj]) near[jj] = 1; } }
      const SL = Math.max(4, Math.round(8 * dpr));
      const bin = new Map();
      for (let j = 0; j < core.length; j++) { if (!core[j] && !near[j]) continue;
        const b = Math.floor((j % bw) / SL); const a = bin.get(b) || { c: [], n: [] }; (core[j] ? a.c : a.n).push(la[j]); bin.set(b, a); }
      let sw = null;
      const allC = [], allN = [];
      for (const [, a] of bin) { allC.push(...a.c); allN.push(...a.n);
        if (a.c.length < 6 || a.n.length < 6) continue;
        const v = ratio(med(a.c), med(a.n)); if (sw == null || v < sw) sw = v; }
      const cr = ratio(med(allC), med(allN));
      rows.push({ W, f, name, n: cs.length, r: +cr.toFixed(2), s: sw == null ? null : +sw.toFixed(2), t: r.t });
    }
  }
}
await raw("Target.closeTarget", { targetId }); bws.close();

const byName = new Map();
for (const r of rows) { if (r.s == null) continue; const a = byName.get(r.name) || []; a.push(r); byName.set(r.name, a); }
let bad = 0;
console.log(`| 이름 | 가장 나쁜 자리 | 라벨 통째 | **가장 나쁜 토막** | ${OK} 미만인 칸 |`);
console.log(`|---|---|---|---|---|`);
for (const [name, a] of byName) {
  const worst = a.reduce((m, x) => x.s < m.s ? x : m);
  const under = a.filter(x => x.s < OK).length; bad += under;
  console.log(`| ${name} | ${worst.f}층 · ${worst.W}px | ${worst.r} | **${worst.s}** | ${under}/${a.length} |`);
}
const empty = rows.filter(r => r.s == null).length;
console.log(`\n글자를 못 찾은 칸 ${empty} · ${OK} 미만 합계 **${bad}**`);
fs.writeFileSync("tmp/v109_head.json", JSON.stringify(rows, null, 1));
if (bad > 0 || empty > 0) { console.log("판정: 미달"); process.exit(1); }
console.log("판정: 통과");
