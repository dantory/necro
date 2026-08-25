/* ══ 판에 남은 «시스템 폰트가 그리는 글자» 를 전부 센다 ══════════════════
   V-34 가 상인 좌판의 ⚰ 하나를, V-37 이 편성·운용 창의 여덟을 고쳤는데
   **둘 다 「이것이 마지막」이라고 적었다.** 손으로 훑어 그렇게 적으면 또 샌다
   ([[carry-fixes-forward]]) — 그래서 자를 만든다.

   ★ **자를 두 번 고쳤다 — 둘 다 위양성이었다.**
     ㉮ 처음엔 「기호처럼 생긴 낱자」를 셌다 → Galmuri 가 멀쩡히 그리는 —·「」·→ 까지
        잡아 **68 자리**를 뱉었다.
     ㉯ 실제 폰트로 바꾸니 3 자리인데 그중 둘(`#hDoctrine`·`#hTactic`)이 또 위양성이다 —
        띠의 그림이 붙으면 `.hasArt{font-size:0}` 이라 그 글자는 **크기 0 으로 깔려**
        눈에 한 톨도 안 닿는다. 그래서 **크기 0 인 글월은 뺀다**([[pixel-verification-calibration]] ·
        양성 씨앗으로 먼저 맞춰 본다: `--selftest` 가 없는 글리프를 심어 자가 우는지 본다).

   ★ **낱자 목록으로 재지 않는다.** 「기호처럼 생긴 글자」를 세면 Galmuri 가
     제대로 그리는 —·「」·→ 까지 잡아 68 자리를 뱉는다(전부 위양성).
     물어야 할 것은 「이 글자가 기호인가」가 아니라 **「브라우저가 이 글자를
     Galmuri 로 그렸는가」**다. 그건 CDP 가 직접 말해 준다 —
     `CSS.getPlatformFontsForNode` 는 그 노드를 그린 **실제 폰트별 글자 수**를
     돌려준다([[probe-must-walk-the-real-path]] · 페이지가 정말 칠한 것을 읽는다).

   node tools/v63_glyph.mjs [--all]     --all 이면 창을 하나씩 열어 가며 훑는다 */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const PIXEL = /^Galmuri/i;                     // 판의 폰트. 이 밖은 전부 시스템 폰트다.
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("DOM.enable"); await S("CSS.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev2 = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev2(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

/* 보이는 글월을 가진 잎 원소에 표를 붙인다(자기 글월만 · 자식이 또 갖고 있으면 그 자식이 낸다) */
const MARK = `(() => {
  document.querySelectorAll("[data-v63]").forEach(e => e.removeAttribute("data-v63"));
  let n = 0;
  for (const el of document.querySelectorAll("body *")) {
    let own = ""; for (const c of el.childNodes) if (c.nodeType === 3) own += c.nodeValue;
    if (!own.trim()) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    /* 크기 0 인 글월은 안 센다 — 띠의 hasArt 가 font-size:0 으로 그림 뒤에 글자를
       깔아 두는데, 그 글자는 눈에 한 톨도 안 닿는다. 안 빼면 자가 늘 붉다. */
    if (parseFloat(cs.fontSize) < 1) continue;
    el.setAttribute("data-v63", String(n++));
  }
  return n;
})()`;

const rows = [];
const grab = async (where) => {
  await ev2(MARK);
  const { root } = await S("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await S("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-v63]" });
  for (const nodeId of nodeIds) {
    let fonts;
    try { fonts = (await S("CSS.getPlatformFontsForNode", { nodeId })).fonts; } catch { continue; }
    const alien = (fonts || []).filter(f => !PIXEL.test(f.familyName) && f.glyphCount > 0);
    if (!alien.length) continue;
    const info = await ev2(`(() => { const e = document.querySelector('[data-v63="${(await S("DOM.getAttributes",{nodeId})).attributes[(await S("DOM.getAttributes",{nodeId})).attributes.indexOf("data-v63")+1]}"]');
      if (!e) return null; let own=""; for (const c of e.childNodes) if (c.nodeType===3) own+=c.nodeValue;
      const r = e.getBoundingClientRect();
      return { txt: own.trim().slice(0,44).replace(/\\s+/g," "),
               sel: e.id ? "#"+e.id : (typeof e.className==="string" && e.className ? "."+e.className.split(" ")[0] : e.tagName.toLowerCase()),
               x: Math.round(r.x), y: Math.round(r.y) }; })()`);
    if (!info) continue;
    rows.push({ where, ...info, alien: alien.map(f => `${f.familyName}×${f.glyphCount}`).join(",") });
  }
};

/* 양성 씨앗 — 자가 정말 우는지 먼저 본다(`--selftest`). Galmuri 에 없는 낱자를
   판에 심어 걸리면 자가 살아 있는 것이고, 안 걸리면 자를 못 믿는다. */
if (process.argv.includes("--selftest")) {
  await ev2(`(() => { const d = document.createElement("div");
    d.id = "v63seed"; d.textContent = "씨앗 \u2638"; d.style.cssText = "position:fixed;left:4px;top:4px;font-size:14px;z-index:99";
    document.body.appendChild(d); })()`);
  await wait(200);
  const before = rows.length; await grab("씨앗");
  const got = rows.slice(before).some(r => r.sel === "#v63seed");
  await ev2(`document.getElementById("v63seed")?.remove()`);
  rows.length = before;
  console.log(`자 점검: 심은 글리프를 ${got ? "잡았다 — 자는 살아 있다" : "★ 놓쳤다 — 자를 못 믿는다"}`);
  if (!got) { console.log("판정: 자 미달"); process.exit(2); }
}

await grab("마을");
if (process.argv.includes("--all")) {
  for (const w of ["stat", "bag", "tree", "forge", "shop", "doctrine", "tactic", "dive", "wipe", "reborn"]) {
    await ev2(`try { window.__openWin && window.__openWin(${JSON.stringify(w)}); } catch(e){}`);
    await wait(420); await grab("창:" + w);
    await ev2(`window.__closeWin && window.__closeWin()`); await wait(220);
  }
  await ev2(`window.__toDungeon && window.__toDungeon()`); await wait(5000);
  await grab("던전");
}
const uniq = [...new Map(rows.map(r => [r.sel + "|" + r.txt, r])).values()];
console.log("── 지금 화면에서 시스템 폰트가 그린 자리 ──");
for (const r of uniq) console.log(`  ${r.where.padEnd(9)} ${r.sel.padEnd(14)} «${r.txt}»  → ${r.alien}  @${r.x},${r.y}`);
if (!uniq.length) console.log("  (없다)");

/* ══ ② 아직 안 뜬 글월까지 ══ 화면 훑기는 **그 순간 열려 있는 창**만 본다.
   정산·오프라인·툴팁처럼 조건이 맞아야 뜨는 글월은 영영 안 걸린다
   ([[probe-must-walk-the-real-path]] 의 반대쪽 함정 — 길은 옳은데 **덜 걷는다**).
   그래서 소스의 낱자를 통째로 모아 **한 자씩 판에 세워** 어느 폰트가 그리는지 묻는다.
   창을 안 열어도 되고, 나중에 붙일 글월도 같은 자로 잰다. */
const src = process.argv.includes("--src") !== false;
const fs2 = await import("node:fs");
const files = ["index.html", ...fs2.readdirSync("js").filter(f => f.endsWith(".js")).map(f => "js/" + f)];
const chars = new Map();                            // 낱자 → 처음 본 자리
/* 주석은 **줄머리로 가르지 않는다** — 블록 주석의 이어지는 줄은 ✗·⚰ 처럼 아무 낱자로도
   시작한다(첫 판에서 battle.js 의 ✗ 와 main.js 의 ⚰ 가 그렇게 새 나왔다 · 둘 다 주석이다).
   /* … *​/ 와 // 를 **상태로 좇아** 걷어낸다. */
const strip = (t, html) => {
  /* html 은 주석 꼴이 다르다 — 이 자를 쓰려고 방금 index.html 에 적은 설명 안의 ⟳·⚰ 가
     그대로 다시 잡혔다(자가 제 고침을 흠으로 읽었다). 먼저 걷어낸다. */
  if (html) t = t.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
  let out = "", blk = false, ln = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], d = t[i + 1];
    if (blk) { if (c === "*" && d === "/") { blk = false; i++; } out += c === "\n" ? "\n" : " "; continue; }
    if (ln)  { if (c === "\n") { ln = false; out += "\n"; } else out += " "; continue; }
    if (c === "/" && d === "*") { blk = true; i++; out += "  "; continue; }
    if (c === "/" && d === "/") { ln = true;  i++; out += "  "; continue; }
    out += c;
  }
  return out;
};
/* **왜 남아도 되는지가 적혀 있어야 자를 믿는다.** 그냥 「소스에 있다」로 울면 다음 사람이
   자를 끈다. 지금 남은 둘은 이렇다 —
   ㉮ `ico:"…"` — V-37 이 그림으로 갈아 끼운 **옛 글리프**. `__PICKGLYPH=1` 문을 열 때만
      그려진다(`pickIco`) — 자가 같은 판을 두 번 재게 하려고 남긴 것이다.
   ㉯ `#hDoctrine`·`#hTactic` — 띠의 그림이 붙으면 `.hasArt{font-size:0}` 이 그 글자를
      **크기 0** 으로 덮는다. 그림이 안 구워졌을 때만 글자가 선다(그때는 이 낱자도 뜬다). */
const ALLOW = [
  [/\bico:\s*["']/, "__PICKGLYPH 문 뒤 · V-37 이 그림으로 갈아 끼운 옛 글리프"],
  [/id="h(Doctrine|Tactic)"/, "띠 그림이 붙으면 hasArt 가 크기 0 으로 덮는다"],
];
for (const f of files) {
  const t = strip(fs2.readFileSync(f, "utf8"), f.endsWith(".html"));
  const lines = t.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    for (const ch of L) {
      const o = ch.codePointAt(0);
      if (o < 0x80) continue;
      if (o >= 0xAC00 && o <= 0xD7A3) continue;     // 한글 음절 — Galmuri 의 본업
      if (chars.has(ch)) continue;
      const why = ALLOW.find(([re]) => re.test(L));
      chars.set(ch, { at: `${f}:${i + 1}`, why: why && why[1] });
    }
  }
}
await ev2(`(() => { const w = document.createElement("div");
  w.id = "v63probe"; w.style.cssText = "position:fixed;left:-9999px;top:0;font-size:14px";
  document.body.appendChild(w); })()`);
const list = [...chars.keys()];
await ev2(`(() => { const w = document.getElementById("v63probe"); w.innerHTML = "";
  const cs = ${JSON.stringify(list)};
  cs.forEach((c, i) => { const s = document.createElement("span"); s.setAttribute("data-v63c", String(i)); s.textContent = c; w.appendChild(s); }); })()`);
const { root: root2 } = await S("DOM.getDocument", { depth: -1 });
const { nodeIds: cn } = await S("DOM.querySelectorAll", { nodeId: root2.nodeId, selector: "[data-v63c]" });
const bad = [];
for (let i = 0; i < cn.length; i++) {
  let fonts; try { fonts = (await S("CSS.getPlatformFontsForNode", { nodeId: cn[i] })).fonts; } catch { continue; }
  const alien = (fonts || []).filter(f => !PIXEL.test(f.familyName) && f.glyphCount > 0);
  if (alien.length) bad.push({ ch: list[i], ...chars.get(list[i]), by: alien.map(f => f.familyName).join(",") });
}
console.log("── 소스에 있는 낱자 가운데 Galmuri 가 못 그리는 것 ──");
const live = bad.filter(b => !b.why);
for (const b of bad)
  console.log(`  ${b.why ? "  " : "★ "}[${b.ch}] U+${b.ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}  ${b.by.padEnd(16)} ${b.at}${b.why ? "   ← " + b.why : ""}`);
if (!bad.length) console.log("  (없다)");
console.log(`잰 낱자 ${list.length} 개 · 못 그리는 것 ${bad.length} 개(그중 봐준 것 ${bad.length - live.length})`);
const n = uniq.length + live.length;
console.log(`판정: ${n === 0 ? "통과 — 남은 것 없다" : "미달 — 화면 " + uniq.length + " 자리 · 소스 " + live.length + " 낱자"}`);
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(n ? 1 : 0);
