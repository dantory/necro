/* **V-91 — 글자가 바탕에 묻혀 안 읽히는 자리를 «창 열셋 전부»에서 찾는다.**

   V-87 은 되살리기 칸의 그림 하나가 칸 바탕과 같은 어둠이라 빈 네모로 섰던 것을 고쳤다.
   그 규칙을 한 자리에만 두면 다음 요소에서 또 난다([[carry-fixes-forward]]) — 그래서
   같은 셈을 **모든 글자**로 옮긴다.

   ★ 자를 두 번 세웠다. 처음엔 CSS 를 타고 올라가며 바탕색을 합성해 쟀는데
     ① `color(srgb 0.71 …)` 를 정규식으로 훑어 0~1 을 0~255 로 읽고 **없는 미달 셋을
        지어냈고**([[silent-zero-is-not-an-observation]])
     ② 그림 바탕(gradient)을 만나면 색을 못 믿어 건너뛰는 바람에 **보이는 글자칸
        630 중 66 밖에** 못 쟀다. 최저가 5:1 로 문턱 2.2 에서 한참 떠 있었으니
        그 수는 눈금이 아니라 상수였다([[floor-far-from-threshold]]).

   그래서 지금은 **V-87 과 같은 길**로 잰다 — 사람 눈이 지나는 길이다
   ([[probe-must-walk-the-real-path]]):
   ① 창을 있는 그대로 한 번 찍는다.
   ② 글자만 **잉크를 뺀 채**(`color:transparent`·그림자·테까지) 한 번 더 찍는다 —
      자리·바탕·테두리는 한 톨도 안 움직인다. 이것이 «그 글자의 진짜 바탕»이다.
   ③ 글자가 실제로 차지한 자리(Range.getClientRects)만 두 장에서 견준다.
      바뀐 화소 = **정말 화면에 닿은 잉크**. 그 잉크의 밝기와 밑바탕의 밝기로
      WCAG 대비비를 낸다. gradient·그림·canvas·opacity·filter 를 전부 지나온 뒤의 값이다.

   문(두 가지):
     · **대비 2.2:1 아래** → 묻혔다.
     · **잉크가 닿은 화소가 3% 아래** → 아예 안 그려졌다(자리는 잡았는데 글자가 없다).
   봐주는 것: 잉크 자리가 8화소 미만인 아주 작은 조각.

     node tools/v91_ink.mjs [W] [H]        (문: `old` — __IN_OLD 로 옛 값을 되돌려 잰다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const zlib = await import("node:zlib");
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
const OLD = process.argv.includes("old");
const CR_MIN = 2.2, INK_MIN = 0.03;
/* 「더 있다」 그늘 밑에 걸린 줄의 문은 따로 둔다. 그늘은 **물리라고** 있는 것이라
   여기서 2.2 를 요구하면 그늘을 지우는 셈이 된다. 다만 «물러남»과 «지워짐»은 다르다 —
   1.4 아래로 내려가면 그건 그늘이 아니라 커튼이다(V-91 이 고친 것이 바로 그 커튼이다). */
const FADE_MIN = 1.4;
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));

/* ── PNG 를 손으로 푼다(v87_dimicon 과 같은 셈 — 의존성을 안 늘린다) ── */
function decode(buf) {
  let w = 0, h = 0, ctype = 2, p = 8; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), tag = buf.toString("ascii", p + 4, p + 8);
    if (tag === "IHDR") { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ctype = buf[p + 17]; }
    if (tag === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len)); p += len + 12; }
  const BPP = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (!BPP) throw new Error("colorType " + ctype);
  const rawpx = zlib.inflateSync(Buffer.concat(idat)), stride = w * BPP, img = Buffer.alloc(h * stride);
  for (let y = 0, o = 0; y < h; y++) { const f = rawpx[o++];
    for (let x = 0; x < stride; x++) { const cur = rawpx[o + x],
        a = x >= BPP ? img[y * stride + x - BPP] : 0, b = y ? img[(y - 1) * stride + x] : 0,
        c = (x >= BPP && y) ? img[(y - 1) * stride + x - BPP] : 0;
      let v = cur;
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, da = Math.abs(q - a), db = Math.abs(q - b), dc = Math.abs(q - c);
                          v += (da <= db && da <= dc) ? a : (db <= dc ? b : c); }
      img[y * stride + x] = v & 255; } o += stride; }
  return { W: w, H: h, BPP, img };
}
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (l1, l2) => { const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); };
const med = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async () => decode(Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64"));
const save = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* look_shots · v80_look · v88_look3 과 **같은 몸** — 사진끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
/* ★ **난수를 못박는다.** 던전 판은 마을과 달리 «무엇이 화면에 서 있는가»가 실행마다
   갈린다(몹 이름·일지 줄·떠오르는 수). 못 박지 않으면 고치기 전/후 사진이 다른 판이라
   견줄 수가 없다([[same-seed-is-not-same-run]]). dt 도 아래에서 못박는다. */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 0x9e3779b9; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })();` });
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
if (OLD) await ev(`window.__IN_OLD = 1; document.documentElement.classList.add("inkOld")`);
const LOOT = [
  { k:"helm",  tier:4, af:[{id:"hp",v:120}],                    worn:true },
  { k:"glove", tier:3, af:[{id:"dmg",v:14},{id:"mp",v:2.1}],    bagged:true },
  { k:"boots", tier:2, af:[],                                   made:true },
  { k:"ring",  tier:5, af:[{id:"mdmg",v:31},{id:"hp",v:66}], uid:"grip", worn:true },
];
const RUN = { has:true, loot:LOOT, gold:13640, xp:1820, killed:337, floor:23, leveled:true,
              from:16, summoned:412, used:288, secs:731 };
const OFF = { min: 197, gold: 48210, corpses: 140, corpsesIn: 140, corpseFull: true, capped: false };
await ev(`Object.assign(window.__LASTRUN, ${JSON.stringify(RUN)}); window.__lastOffline = ${JSON.stringify(OFF)}`);

/* 글자가 **실제로 차지한 자리**를 Range 로 딴다 — 요소 네모가 아니다.
   요소 네모로 재면 자식 글자·여백까지 섞여 값이 흐려진다. */
const COLLECT = (SPARE) => `(() => {
  const SPARE = ${JSON.stringify(SPARE)};
  const out = []; let spared = 0, clip = 0;
  const walk = (root) => {
    for (const el of root.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.visibility !== "visible" || cs.display === "none" || +cs.opacity < 0.02) continue;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        const t = n.nodeValue.trim(); if (!t) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const rects = [...rg.getClientRects()]
          .filter(r => r.width >= 2 && r.height >= 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)
          .map(r => [Math.floor(r.left), Math.floor(r.top), Math.ceil(r.right), Math.ceil(r.bottom)]);
        if (!rects.length) continue;
        if (SPARE.some(([q]) => el.closest(q))) { spared++; continue; }
        /* **굴림 밖으로 잘려 나간 줄은 세지 않는다.** 형광 판은 «자리»로만 견주므로,
           잘린 글자의 네모 자리에 **다른 글자**가 서 있으면 그 남의 잉크를 보고
           「보인다」고 한다 — 일지의 0/1 이 상자(92~354) 밖 y=659 에 있는데도
           HUD 글자 덕에 통과했다. 넘침을 자르는 조상의 상자와 겹치는지 직접 본다. */
        let clipped = false;
        for (let q = el.parentElement; q && !clipped; q = q.parentElement) {
          const s2 = getComputedStyle(q);
          if (/visible/.test(s2.overflow + s2.overflowX + s2.overflowY)) continue;
          const qr = q.getBoundingClientRect();
          if (rects.every(([l0, t0, r0, b0]) => b0 <= qr.top + 1 || t0 >= qr.bottom - 1 || r0 <= qr.left + 1 || l0 >= qr.right - 1)) clipped = true;
        }
        if (clipped) { clip++; continue; }
        /* **「밑자락에 반쯤 걸린 줄」만 그늘 몫으로 돌린다.**
           처음엔 「그늘 띠 안에 있으면」으로 갈랐는데, 그러면 겉옷 딱지(1.41:1)까지
           그늘 몫이 되어 **고치기 전 값이 문(1.4)에서 0.01 밖**에 안 떨어졌다 —
           그 자로는 이번에 고친 결함을 다시 못 잡는다([[floor-far-from-threshold]]).
           가르는 자리는 그늘이 아니라 **온전함**이다: 상자 안에 통째로 든 줄은
           «읽으라고 놓인 줄»이니 제 문(2.2)을 지켜야 하고, 상자 밖으로 삐져나가
           이미 반쯤 잘린 줄만 「아래에 더 있다」의 몫이다. */
        let partial = false;
        for (let q = el.parentElement; q && !partial; q = q.parentElement) {
          const s3 = getComputedStyle(q);
          if (/visible/.test(s3.overflow + s3.overflowX + s3.overflowY)) continue;
          const qr = q.getBoundingClientRect();
          if (rects.some(([l0, t0, r0, b0]) => t0 < qr.top - 1 || b0 > qr.bottom + 1 || l0 < qr.left - 1 || r0 > qr.right + 1)) partial = true;
        }
        out.push({ inFade: partial, belt: !!el.closest("#belt"), tag: el.tagName.toLowerCase(), id: el.id || "",
                   cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").split(" ")[0],
                   txt: t.slice(0, 26), fs: Math.round(parseFloat(cs.fontSize)), rects });
      }
    }
  };
  walk(document);
  return { out, spared, clip };
})()`;
const paint = (css) => `(() => {
  let s = document.getElementById("__noink");
  if (!s) { s = document.createElement("style"); s.id = "__noink"; document.head.appendChild(s); }
  s.textContent = ${JSON.stringify(css)};
  return 1;
})()`;
/* ② 잉크를 뺀 판 — 자리·바탕·테는 그대로고 글자만 사라진다. «그 글자의 진짜 바탕». */
const NOINK = paint("*{color:transparent !important;text-shadow:none !important;-webkit-text-stroke-color:transparent !important;caret-color:transparent !important}");
/* ③ **잉크를 «형광»으로 바꾼 판** — 이것이 이 자의 뼈대다.
   글자가 안 보이는 데는 두 가지다: 바탕에 «묻혀서»와 무언가에 «덮여서». 앞엣것만 결함이다.
   형광으로 칠했는데도 화면에 안 나타나면 덮이거나 잘린 것이고(셀 것이 아니다),
   나타나면 그 자리는 정말 보이는 자리다 — 거기서만 원래 잉크와 바탕을 잰다.
   hit-test 로 짐작하던 것을 그만두고 **화면에 물어보는** 셈이다
   ([[probe-must-walk-the-real-path]]). elementFromPoint 로 덮임을 재던 앞 판은
   pointer-events:none 인 「더 있다」 흐림을 못 보고 dive 미달 7 을 지어냈다. */
const MARK = paint("*{color:#ff00ff !important;text-shadow:none !important;-webkit-text-stroke-color:#ff00ff !important}");
const REINK = `(() => { const s = document.getElementById("__noink"); if (s) s.textContent = ""; return 1; })()`;

/* **일부러 죽여 둔 자리는 세지 않는다 — 다만 «무엇을 안 셌는지»는 적는다.**
   말없이 빼면 다음 사람이 「다 봤다」로 읽는다.
   · `body.in-town #belt` — 마을에서는 기술을 못 쓴다(`opacity:.45` · pointer-events:none).
     이 자가 도는 열셋이 **전부 마을**이라, 안 빼면 단축키 숫자 여섯이 판마다 운다.
     ★ 그래서 이 자는 **띠가 살아 있는 던전을 아직 못 봤다** — V-91b 로 남긴다.
   · `.btn.ghost.faint` — 「초기화」처럼 되돌릴 수 없는 단추는 **일부러** 흐리다
     (`opacity:.42`). 눈에 먼저 띄면 안 되는 단추다. */
const SPARE_TOWN = [["#belt", "마을에선 기술띠를 죽여 둔다"], [".btn.ghost.faint", "되돌릴 수 없는 단추는 일부러 흐리다"]];
/* ★ V-91b — **던전에서는 띠를 안 봐준다.** 거기서는 기술을 정말 쓴다(`opacity:1`).
   봐주기를 그대로 들고 가면 「다 봤다」면서 정작 띠가 살아 있는 자리를 영영 안 본다. */
const SPARE_DUN = [[".btn.ghost.faint", "되돌릴 수 없는 단추는 일부러 흐리다"]];

const CASES = [
  ["town",     null],
  ["shop",     "shop"],     ["forge",    "forge"],   ["dive",   "dive"],
  ["stat",     "stat"],     ["bag",      "bag"],     ["tree",   "tree"],
  ["doctrine", "doctrine"], ["tactic",   "tactic"],  ["reborn", "reborn"],
  ["end",      "end"],      ["offline",  "offline"], ["wipe",   "wipe"],
];
/* ★ V-91b — **던전 네 구역.** 마을은 늘 같은 흙길이지만 던전은 구역마다 바닥 그림과
   물빛이 통째로 갈린다(`ZONES`: crypt 무색 · bone 푸름 · camp **누런빛** · sanctum 보라).
   글자가 서는 밑바탕이 갈리니 여기가 오히려 묻히기 쉬운 자리다 — 게다가 일지·체력바·
   떠오르는 수가 **바닥 그림 위**에 선다([[probe-must-walk-the-real-path]]). */
const FLOORS = [["dun1", 1], ["dun16", 16], ["dun26", 26], ["dun40", 40]];

const bad = [], note = []; let scanned = 0, tiny = 0, covered = 0, spared = 0, clipped = 0;
const spareSeen = new Set();

/** 한 화면을 잰다 — 마을이든 던전이든 같은 셈이다. */
async function measure(name, SPARE) {
  for (const [q] of SPARE) spareSeen.add(q);
  const got = (await ev(COLLECT(SPARE))) || { out: [], spared: 0, clip: 0 };
  const items = got.out; spared += got.spared; clipped += got.clip || 0;
  const A = await shot();
  await ev(NOINK); await wait(120);
  const B = await shot();
  await ev(MARK);  await wait(120);
  const C = await shot();
  await ev(REINK); await wait(80);
  const sc = A.W / W;                       /* deviceScaleFactor */
  const rows = [];
  for (const it of items) {
    const inkL = [], bgL = [], gap = [], inkRGB = [], bgRGB = []; let seen = 0, glyph = 0, ink = 0;
    for (const [l, t, r, b] of it.rects) {
      const x0 = Math.max(0, Math.round(l * sc)), x1 = Math.min(A.W, Math.round(r * sc));
      const y0 = Math.max(0, Math.round(t * sc)), y1 = Math.min(A.H, Math.round(b * sc));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const o = (y * A.W + x) * A.BPP; seen++;
        /* 형광이 닿았나 — 이 화소가 «정말 보이는 글자 속»인지 판가름한다 */
        const dm = Math.abs(C.img[o] - B.img[o]) + Math.abs(C.img[o+1] - B.img[o+1]) + Math.abs(C.img[o+2] - B.img[o+2]);
        if (dm < 40) continue;
        glyph++;
        const li = lum(A.img[o], A.img[o+1], A.img[o+2]), lb = lum(B.img[o], B.img[o+1], B.img[o+2]);
        const di = Math.abs(A.img[o] - B.img[o]) + Math.abs(A.img[o+1] - B.img[o+1]) + Math.abs(A.img[o+2] - B.img[o+2]);
        if (di >= 24) ink++;
        inkL.push(li); bgL.push(lb); gap.push(Math.abs(li - lb));
        inkRGB.push(A.img[o], A.img[o+1], A.img[o+2]); bgRGB.push(B.img[o], B.img[o+1], B.img[o+2]);
      }
    }
    if (seen < 8) { tiny++; continue; }
    if (glyph / seen < 0.02) { covered++; continue; }   /* 형광도 안 보인다 = 덮였거나 잘렸다 */
    /* 잉크가 가장 짙게 닿은 쪽(글자 속)과 그 밑바탕으로 잰다 — 가장자리 반투명 화소가
       중앙값을 끌어올려 «묻힌 글자»를 멀쩡해 보이게 하는 것을 막는다. */
    const idx = gap.map((v, i) => i).sort((p, q) => gap[p] - gap[q]);
    const top = idx.slice(Math.floor(idx.length * 0.75));      /* 위 25% = 글자 속 */
    const cr = ratio(med(top.map(i => inkL[i])), med(top.map(i => bgL[i])));
    /* 화면에 **정말 찍힌 색**도 함께 적는다 — 「CSS 는 금빛인데 왜 1.4:1 이냐」를
       여기서 바로 답할 수 있어야 다음 사람이 CSS 를 뒤지지 않는다. */
    const rgbAt = (src) => "rgb(" + [0, 1, 2].map(c => Math.round(med(top.map(i => src[i * 3 + c])))).join(",") + ")";
    rows.push({ ...it, frac: Math.round((ink / glyph) * 1000) / 10, cr: Math.round(cr * 100) / 100,
                ink: rgbAt(inkRGB), bg: rgbAt(bgRGB) });
  }
  scanned += rows.length;
  const dim = rows.filter(r => !r.inFade && r.cr < CR_MIN);
  const fade = rows.filter(r => r.inFade && r.cr < CR_MIN);
  const fadeBad = fade.filter(r => r.cr < FADE_MIN);
  const gone = rows.filter(r => r.frac < INK_MIN * 100);
  const who = (d) => `<${d.tag}${d.id ? "#" + d.id : ""}${d.cls ? "." + d.cls : ""}> "${d.txt}" ${d.fs}px ${d.ink} on ${d.bg}`;
  for (const d of gone) bad.push(`${name}: ${who(d)} — 잉크 ${d.frac}% (안 그려졌다)`);
  for (const d of dim) if (!gone.includes(d)) bad.push(`${name}: ${who(d)} — 대비 ${d.cr}:1`);
  for (const d of fadeBad) bad.push(`${name}: ${who(d)} — 그늘 밑인데 ${d.cr}:1 (지워졌다)`);
  for (const d of fade) if (!fadeBad.includes(d)) note.push(`${name}: ${who(d)} — 그늘 밑 ${d.cr}:1 (문 ${FADE_MIN})`);
  if (dim.length || gone.length || fadeBad.length) await save(`tmp/v91_${name}.png`);
  /* **낮은 쪽 다섯을 적는다.** 「최저 2.4:1」 한 줄만 보면 그 뒤에 2.41 이 열 줄 서 있는지
     혼자 떠 있는지를 알 수 없다 — 문을 옮길지 말지는 그 모양을 봐야 정한다
     ([[floor-far-from-threshold]]). */
  const low = rows.slice().sort((a, b) => a.cr - b.cr).slice(0, 5);
  console.log(name.padEnd(9), String(rows.length).padStart(3) + "칸 ·",
    "낮은쪽", low.map(d => `${d.cr} "${d.txt.slice(0, 10)}"`).join(" · "),
    (dim.length + gone.length + fadeBad.length) ? `· 미달 ${dim.length + gone.length + fadeBad.length}` : "",
    fade.length ? `· 그늘 밑 ${fade.length}` : "");
  return { n: rows.length, belt: rows.filter(r => r.belt).length };
}

for (const [name, which] of CASES) {
  if (which) { await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(420); }
  await measure(name, SPARE_TOWN);
  if (which) { await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(180); }
}

/* ────────── V-91b · 던전 ──────────
   이 자는 사진 **석 장을 견주는** 자다(있는 그대로 · 잉크 뺀 판 · 형광 판). 곧
   **세 장 사이에 화면이 움직이면 셈이 통째로 거짓말**을 한다 — 움직인 화소가 「잉크」로
   잡힌다. 그래서 재기 전에 판을 **얼린다**: 걸음을 0 으로 두고 dt 를 1e-6 으로 못박는다
   (`draw(dt)` 가 도는 것은 그대로지만 시간이 안 흐르므로 그림이 안 바뀐다).
   얼었는지는 **짐작하지 않고 잰다** — 같은 화면을 두 번 찍어 다른 화소를 센다
   ([[silent-zero-is-not-an-observation]]). */
const evAwait = async (e) => (await S("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
/** 두 사진이 얼마나 다른지 + **어디가** 다른지. 「안 얼었다」만 알면 못 고친다 —
    움직인 자리를 CSS 화소 네모로 돌려줘야 그 자리의 요소를 물어볼 수 있다. */
const diffAt = (X, Y, sc) => {
  let n = 0, l = 1e9, t = 1e9, r = -1, b = -1; const N = X.W * X.H;
  for (let i = 0; i < N; i++) { const o = i * X.BPP;
    if (Math.abs(X.img[o] - Y.img[o]) + Math.abs(X.img[o+1] - Y.img[o+1]) + Math.abs(X.img[o+2] - Y.img[o+2]) < 12) continue;
    n++; const x = i % X.W, y = (i / X.W) | 0;
    if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  return { pct: Math.round((n / N) * 10000) / 100, n,
           box: n ? [l, t, r, b].map(v => Math.round(v / sc)) : null };
};
for (const [name, floor] of FLOORS) {
  /* 내려갈 층은 **세이브에 적어 두고 다시 연다** — `newRun()` 이 `startFloor()` 로
     그 값을 읽는다. 판 안에서 S.floor 를 손으로 바꾸면 구역 바닥이 안 따라온다. */
  await ev(`(() => { const m = JSON.parse(localStorage.getItem("necro.meta.v1"));
    m.dive = ${floor}; m.diveSet = 1; localStorage.setItem("necro.meta.v1", JSON.stringify(m)); return 1; })()`);
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await evAwait(`new Promise(r => { const w = () => (window.LOAD && window.LOAD.done) ? r(1) : setTimeout(w, 150); w(); })`);
  if (OLD) await ev(`window.__IN_OLD = 1; document.documentElement.classList.add("inkOld")`);
  if (!(await ev(`typeof window.__toDungeon === "function"`))) { bad.push("__toDungeon 없다 — 이름을 확인할 것"); break; }
  /* dt 를 못박고 걸음을 몰아 밟는다 — 벽시계 2.4초에 «판의 시간» 열두어 초.
     싸움이 붙고 일지가 차고 떠오르는 수가 떠야 **재는 보람이 있는 화면**이 된다. */
  /* ★ **정한 초만큼 굴리지 않는다 — 싸움이 붙는 순간을 기다린다.**
     처음엔 벽시계 2.4초를 세었더니 26·40층에서 **판이 그 안에 끝났다**(Lv.26 인물이
     깊은 층에서 스무 초를 못 버틴다 — V-14b 가 이미 연 발견이다). 마을로 돌아온 화면을
     「던전」이라 적고 잴 뻔했다. 그래서 **화면이 재기 좋아진 자리**에서 멈춘다:
     적이 서 있고 일지가 여섯 줄 넘게 찼을 때. 판이 먼저 끝나면 그 자리에서 접는다. */
  /* ★ **26·40층에서는 판이 «재기 전에» 끝난다.** 심어 둔 몸(Lv.26 · tier 3)은 그
     깊이에서 반 초를 못 버틴다 — 적이 36·50 마리다(V-14b 가 이미 연 발견이다).
     그래서 `__AUTORETURN` 으로 **쓰러지면 그 자리에서 다시 내려가게** 두고, 마을이
     아닌 프레임을 붙잡는다. 안 그러면 마을 사진을 「던전」이라 적고 재게 된다. */
  await ev(`globalThis.__FIXEDDT = 0.02; globalThis.__AUTORETURN = 1; window.__toDungeon(); window.__S.speed = 3; true`);
  const peek = `window.__S ? {f: window.__S.floor, mobs: (window.__S.mobs||[]).length, log: (window.__S.log||[]).length, hp: Math.round(window.__S.hp), town: document.body.classList.contains("in-town")} : null`;
  let at = null;
  for (let i = 0; i < 60; i++) { await wait(60); at = await ev(peek);
    if (at && !at.town && at.mobs > 0 && at.log >= 4) break; }
  if (!at || at.town) { bad.push(`${name}: 던전에 못 섰다 — 마을 프레임만 잡혔다 (${JSON.stringify(at)})`); continue; }
  await ev(`globalThis.__AUTORETURN = 0; true`);
  /* 얼린다 — 걸음 0 · dt 1e-6. 여기에 **CSS 움직임도 멈춘다**(전환·애니메이션).
     석 장을 견주는 자라 세 장 사이에 한 화소라도 움직이면 그게 「잉크」로 잡힌다. */
  await ev(`window.__S.speed = 0; globalThis.__FIXEDDT = 1e-6;
    (() => { let z = document.getElementById("__freeze");
      if (!z) { z = document.createElement("style"); z.id = "__freeze"; document.head.appendChild(z); }
      z.textContent = "*,*::before,*::after{animation-play-state:paused !important;transition:none !important}"; })(); true`);
  await wait(340);
  const F1 = await shot(); await wait(260); const F2 = await shot();
  const jit = diffAt(F1, F2, F1.W / W);
  if (jit.pct > 0.2) {
    const who = jit.box ? await ev(`(() => { const [l,t,r,b] = ${JSON.stringify(jit.box)};
      const e = document.elementFromPoint((l+r)/2, (t+b)/2);
      return e ? (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className ? "." + String(e.className).split(" ")[0] : "")) : "(없다)"; })()`) : "-";
    bad.push(`${name}: 안 얼었다 — 두 사진이 ${jit.pct}% 다르다 · 움직인 네모 [${jit.box}] ${who} (잰 값을 믿을 수 없다)`);
  }
  console.log(`  ${name}: ${at.f}층 · 몹 ${at.mobs} · 일지 ${at.log}줄 · 체력 ${at.hp} · 흔들림 ${jit.pct}%${jit.box ? " " + JSON.stringify(jit.box) : ""}`);
  const seenHere = await measure(name, SPARE_DUN);
  /* ★ **띠를 정말 쟀는지 확인한다.** V-91b 는 「띠가 살아 있는 자리를 못 봤다」가
     까닭이었으니, 여기서 띠 글자가 0 이면 이 자는 또 못 본 것이다 — 통과가 아니라
     **안 잰 것**이다([[silent-zero-is-not-an-observation]]). */
  if (!seenHere.belt) bad.push(`${name}: 띠(#belt) 글자를 한 칸도 못 쟀다 — 또 지름길로 잰 것이다`);
  await save(`tmp/v91_${name}_look.png`);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`잰 글자자리 ${scanned} · 일부러 봐준 것 ${spared}(${[...spareSeen].join(" ")}) · 덮여서 뺀 것 ${covered} · 굴림 밖이라 뺀 것 ${clipped} · 너무 작아 봐준 것 ${tiny} · 문 대비 ${CR_MIN}:1 · 잉크 ${INK_MIN * 100}%`);
for (const n of note) console.log("  그늘밑", n);
for (const b of bad) console.log("  미달", b);
console.log(`판정: ${bad.length ? `미달 ${bad.length}` : `통과 (${W}x${H} · 창 ${CASES.length}장)`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
