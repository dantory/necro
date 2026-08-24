/* **안 쓴 스킬 점수를 알리는 표가 «보이는지»를 그림에서 잰다** (2026-08-24 · V-22)
     node tools/v22_spdot.mjs [tag]
   레벨을 2·5·13 으로 박고 아래 메뉴의 스킬 칸(#hLv)을 오려 센다:
     ① `#spDot` 이 그려지는 자리(getBoundingClientRect)의 폭·높이 · 글자 크기
     ② 그 칸 안에서 **배지 색**(#spDot.on 의 background)으로 찍힌 픽셀 수
     ③ 그 칸 안에서 **배지 글자색**으로 찍힌 픽셀 수
   ★ 색은 식을 밖에서 다시 쓰지 않는다 — **판이 쓰는 그 값**(getComputedStyle)을 읽어 온다. */
import fs from "node:fs";
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const TAG = process.argv[2] || "now";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (expression, ret = true) => (await S("Runtime.evaluate", { expression, returnByValue: ret, awaitPromise: true })).result.value;

/* ── PNG 를 손으로 푼다(의존성을 안 늘린다 · v21_slotshot 과 같은 셈) ── */
const zlib = await import("node:zlib");
function decode(buf) {
  let p = 8, W = 0, H = 0, ctype = 2; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), tag = buf.toString("ascii", p + 4, p + 8);
    if (tag === "IHDR") { W = buf.readUInt32BE(p + 8); H = buf.readUInt32BE(p + 12); ctype = buf[p + 17]; }
    if (tag === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len)); p += len + 12; }
  const BPP = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (!BPP) throw new Error("colorType " + ctype);
  const rawpx = zlib.inflateSync(Buffer.concat(idat)), stride = W * BPP, img = Buffer.alloc(H * stride);
  for (let y = 0, o = 0; y < H; y++) { const f = rawpx[o++];
    for (let x = 0; x < stride; x++) { const cur = rawpx[o + x],
        a = x >= BPP ? img[y * stride + x - BPP] : 0, b = y ? img[(y - 1) * stride + x] : 0,
        c = (x >= BPP && y) ? img[(y - 1) * stride + x - BPP] : 0;
      let v = cur;
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, da = Math.abs(q - a), db = Math.abs(q - b), dc = Math.abs(q - c);
                          v += (da <= db && da <= dc) ? a : (db <= dc ? b : c); }
      img[y * stride + x] = v & 255; } o += stride; }
  return { W, H, BPP, img };
}
const hex = (s) => { const m = /^#?([0-9a-f]{6})/i.exec(String(s).trim()) || []; return m[1] ? [0,2,4].map(i => parseInt(m[1].slice(i, i+2), 16)) : null; };
const rgbOf = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); return m ? m[1].split(",").slice(0,3).map(v => Math.round(parseFloat(v))) : hex(s); };

await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`, false);
await S("Page.reload", { ignoreCache: true }); await wait(4200);
await ev("window.__toDungeon && window.__toDungeon()", false); await wait(1500);
/* 판을 얼린다 — 안 얼리면 레벨을 박는 사이에 판이 또 레벨을 올려 수가 흔들린다 */
await ev("window.__S.speed = 0", false); await wait(200);

/* 배지가 **켜졌을 때의 색**을 판에서 읽어 온다(꺼져 있으면 display:none 이라 못 읽는다) */
await ev("window.META.lv = 5", false); await wait(400);
const COL = JSON.parse(await ev(`(() => { const el = document.getElementById('spDot');
  const cs = getComputedStyle(el); return JSON.stringify({ bg: cs.backgroundColor, fg: cs.color }); })()`));
const BG = rgbOf(COL.bg), FG = rgbOf(COL.fg);

const crops = [], rows = [];
for (const lv of [2, 5, 13]) {
  await ev(`window.META.lv = ${lv}`, false); await wait(400);
  const g = JSON.parse(await ev(`(() => {
    const r = (n) => { if (!n) return null; const b = n.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const btn = document.getElementById('hLv'), dot = document.getElementById('spDot');
    const cs = getComputedStyle(dot);
    return JSON.stringify({ btn: r(btn), dot: r(dot), sp: window.spLeft ? window.spLeft() : -1,
      cls: dot.className, txt: dot.textContent, fs: cs.fontSize, disp: cs.display }); })()`));
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const { W, BPP, img } = decode(Buffer.from(data, "base64"));
  const at = (x, y) => { const o = (y * W + x) * BPP; return [img[o], img[o+1], img[o+2]]; };
  const b = g.btn, px = [];
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) px.push(at(x, y));
  const near = (p, c, tol) => c && Math.abs(p[0]-c[0]) <= tol && Math.abs(p[1]-c[1]) <= tol && Math.abs(p[2]-c[2]) <= tol;
  rows.push({ lv, sp: g.sp, dotW: g.dot.w, dotH: g.dot.h, fs: g.fs, disp: g.disp, txt: g.txt,
    bgPx: px.filter(p => near(p, BG, 26)).length, fgPx: px.filter(p => near(p, FG, 26)).length });
  const pad = 4, cw = b.w + pad*2, ch = b.h + pad*2, c = Buffer.alloc(cw*ch*3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const p = at(b.x - pad + x, b.y - pad + y), o = (y*cw+x)*3; c[o]=p[0]; c[o+1]=p[1]; c[o+2]=p[2]; }
  crops.push({ w: cw, h: ch, buf: c });
}
/* 오려낸 셋을 4배로 키워 한 줄로 붙인다 — 눈으로 볼 것 */
{ const sc = 4, gap = 8, w = crops.reduce((s,c)=>s+c.w*sc+gap, gap), h = crops[0].h*sc + gap*2;
  const px = Buffer.alloc(w*h*3, 0x18); let ox = gap;
  for (const c of crops) { for (let y = 0; y < c.h*sc; y++) for (let x = 0; x < c.w*sc; x++) {
      const s = ((y/sc|0)*c.w + (x/sc|0))*3, o = ((y+gap)*w + ox + x)*3; px[o]=c.buf[s]; px[o+1]=c.buf[s+1]; px[o+2]=c.buf[s+2]; }
    ox += c.w*sc + gap; }
  const rowsRaw = Buffer.alloc(h*(w*3+1));
  for (let y = 0; y < h; y++) { rowsRaw[y*(w*3+1)] = 0; px.copy(rowsRaw, y*(w*3+1)+1, y*w*3, (y+1)*w*3); }
  const crc = (bb) => { let c = ~0; for (const v of bb) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (tag, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(tag, "ascii"), body]), cc = Buffer.alloc(4); cc.writeUInt32BE(crc(tb));
    return Buffer.concat([len, tb, cc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(`tmp/v22_spdot_${TAG}.png`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rowsRaw)), chunk("IEND", Buffer.alloc(0))]));
}
console.log(`[${TAG}] 스킬 칸(#hLv)의 «안 쓴 점수» 표 — 배지색 ${COL.bg} · 글자색 ${COL.fg}`);
for (const r of rows)
  console.log(`  Lv.${String(r.lv).padStart(2)} (남은 점수 ${r.sp}) — 그리는자리 ${r.dotW}×${r.dotH} · 글자 ${r.fs} · ${r.disp} · 글월 "${r.txt}" → 칸 안 배지색 ${r.bgPx}px · 글자색 ${r.fgPx}px`);
console.log(`그림 tmp/v22_spdot_${TAG}.png · 콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
