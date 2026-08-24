/* **기술 칸이 «읽히는지»를 그림에서 잰다** (2026-08-24 · V-21)
     node tools/v21_slotshot.mjs [tag]
   1층에서 1번 칸(해골 되살리기)의 재사용을 0.95/0.60/0.30/0 으로 **박아 두고** 그때마다
   화면을 찍어, 그리는 자리의 사각(getBoundingClientRect)으로 오려 센다:
     ① 아이콘 칸의 평균 밝기 · 밝은 픽셀 몫   ② 단축키 숫자가 **제 색으로** 찍힌 픽셀 수
   ★ 식을 밖에서 다시 쓰지 않는다 — 사각도 색도 **판이 쓰는 그 값**을 읽어 온다. */
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

/* ── PNG 를 손으로 푼다(의존성을 안 늘린다 · bar_probe.mjs 와 같은 셈) ── */
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
const hex = (s) => { const m = /^#?([0-9a-f]{6})/i.exec(s.trim()) || []; return m[1] ? [0,2,4].map(i => parseInt(m[1].slice(i, i+2), 16)) : null; };
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
/* ★ **판을 얼린다** — S.speed=0 이면 step() 이 한 걸음도 안 밟는다(판 자신의 손잡이다).
   안 얼리면 auto() 가 곧바로 다시 걸어 재사용이 100% 로 되돌아가, 「30% 를 박았다」가
   실은 100% 를 찍은 그림이 된다(첫 판에서 실제로 그랬다 — 30% 가 95% 보다 어두웠다). */
await ev("window.__S.speed = 0", false); await wait(200);

const geo = JSON.parse(await ev(`(() => {
  const el = document.querySelector('#belt .slot[data-sk="raise"]');
  const r = (n) => { const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const i = el.querySelector('i'), k = el.querySelector('.k');
  return JSON.stringify({ slot: r(el), ico: r(i), key: r(k), keyCol: getComputedStyle(k).color });
})()`));
const crops = [];
const rows = [];
for (const frac of [0.95, 0.60, 0.30, 0]) {
  /* 재사용을 **박아 두고** 그 틀에서 찍는다 — 판이 매 틀 깎으므로 찍기 직전에 넣는다 */
  await ev(`window.__S.cd.raise = ${frac} * 1.2`, false);
  await wait(220);
  /* 단축키 색은 쓸 수 있을 때(#6b5f4e)와 못 쓸 때(off)가 다르다 — **그때의 색**으로 센다 */
  const st = JSON.parse(await ev(`(() => { const el = document.querySelector('#belt .slot[data-sk="raise"]');
    return JSON.stringify({ h: el.querySelector('[data-cd]').style.height, cls: el.className,
                            col: getComputedStyle(el.querySelector('.k')).color }); })()`));
  const KEY = rgbOf(st.col);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const buf = Buffer.from(data, "base64"); const { W, BPP, img } = decode(buf);
  const at = (x, y) => { const o = (y * W + x) * BPP; return [img[o], img[o+1], img[o+2]]; };
  const box = (b) => { const out = []; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) out.push(at(x, y)); return out; };
  const ico = box(geo.ico), key = box(geo.key);
  const mx = (p) => Math.max(p[0], p[1], p[2]);
  const icoMean = ico.reduce((s, p) => s + mx(p), 0) / ico.length;
  const icoLit = 100 * ico.filter(p => mx(p) > 70).length / ico.length;
  const near = (p) => Math.abs(p[0]-KEY[0]) <= 10 && Math.abs(p[1]-KEY[1]) <= 10 && Math.abs(p[2]-KEY[2]) <= 10;
  const keyPx = key.filter(near).length, keyLit = key.filter(p => mx(p) > 60).length;
  rows.push({ frac, icoMean, icoLit, keyPx, keyLit, h: st.h, cls: st.cls });
  const b = geo.slot, pad = 3, cw = b.w + pad*2, ch = b.h + pad*2, c = Buffer.alloc(cw*ch*3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const p = at(b.x - pad + x, b.y - pad + y), o = (y*cw+x)*3; c[o]=p[0]; c[o+1]=p[1]; c[o+2]=p[2]; }
  crops.push({ w: cw, h: ch, buf: c });
}
/* 오려낸 넷을 3배로 키워 한 줄로 붙여 놓는다 — 눈으로 볼 것 */
{ const sc = 3, gap = 6, w = crops.reduce((s,c)=>s+c.w*sc+gap, gap), h = crops[0].h*sc + gap*2;
  const px = Buffer.alloc(w*h*3, 0x18); let ox = gap;
  for (const c of crops) { for (let y = 0; y < c.h*sc; y++) for (let x = 0; x < c.w*sc; x++) {
      const s = ((y/sc|0)*c.w + (x/sc|0))*3, o = ((y+gap)*w + ox + x)*3; px[o]=c.buf[s]; px[o+1]=c.buf[s+1]; px[o+2]=c.buf[s+2]; }
    ox += c.w*sc + gap; }
  const rowsRaw = Buffer.alloc(h*(w*3+1));
  for (let y = 0; y < h; y++) { rowsRaw[y*(w*3+1)] = 0; px.copy(rowsRaw, y*(w*3+1)+1, y*w*3, (y+1)*w*3); }
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (tag, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(tag, "ascii"), body]), cc = Buffer.alloc(4); cc.writeUInt32BE(crc(tb));
    return Buffer.concat([len, tb, cc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(`tmp/v21_slots_${TAG}.png`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rowsRaw)), chunk("IEND", Buffer.alloc(0))]));
}
console.log(`[${TAG}] 1번 칸(해골 되살리기)`);
for (const r of rows)
  console.log(`  재사용 ${(r.frac*100).toString().padStart(3)}% — 아이콘 평균밝기 ${r.icoMean.toFixed(1)} · 밝은픽셀 ${r.icoLit.toFixed(1)}% · 단축키 제색 ${r.keyPx}px · 밝은글자 ${r.keyLit}px · (막대 ${r.h} ${r.cls})`);
console.log(`그림 tmp/v21_slots_${TAG}.png · 콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
