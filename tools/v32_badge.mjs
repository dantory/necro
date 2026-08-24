/* **아래 메뉴 「스킬」 칸의 그림이 배지 둘에 깔려 있다** — 왼위 「25」(안 쓴 점수) ·
   오른위 「Lv.26」. 둘 다 `position:absolute; top:1px` 이라 **그림(28px) 위에** 앉는다.
   V-29 가 이 띠에 이름을 넣으면서 「스킬 칸은 배지 둘이 그림의 위끝과 살짝 겹친다」를
   «남은 흠»으로 적어 두고 갔는데, 원본을 잘라 보니 **살짝이 아니라 절반**이다
   (`tmp/v32_menu_zoom.png`) — 줄인 그림으로 판정하지 않는다는 그 자리다.

   재는 것 (창 높이마다 · 다섯 칸 전부):
     ① **그림이 얼마나 깔렸나** — 배지 상자 ∩ 그림 상자의 넓이 ÷ 그림 넓이 (%).
        다른 네 칸(배지가 없다)이 **아래 눈금 0%** 이라 자가 산다([[floor-far-from-threshold]]).
     ② **배지가 칸 밖으로 새나** — 칸이 `overflow:hidden` 이라 새면 **글자가 잘린다.**
        잘린 값은 값이 아니다.
     ③ 회귀 셋 — ㉮ 안 쓴 점수가 **여전히 읽히나**(보임 · 글자 ≥9px · 수가 맞나)
        ㉯ 레벨이 **화면 어딘가에** 남아 있나(`#xpNum` — 「Lv.26」을 칸에서 거둬도
           XP 띠가 이미 말하고 있다. index.html:104 가 「세 번째라 뺐다」고 적은 그 자리)
        ㉰ 띠 윗금이 **한 픽셀도 안 움직였나**(`overlayTop` 이 무대 높이를 여기서 읽는다)
     ④ **눌러도 스킬트리가 열리나** — 배지는 `pointer-events` 를 안 껐다. 그림 자리를
        실제로 눌러 본다([[probe-must-walk-the-real-path]]).

   node tools/v32_badge.mjs                (고친 뒤)
   NOBADGEFIX=1 node tools/v32_badge.mjs   (문 — 고치기 전을 같은 자로) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NOBADGEFIX === "1";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
/* 문은 **다시 읽어도 살아 있어야** 한다 — reload 뒤에 심으면 이미 지나간 뒤다(V-29 의 그 못). */
if (OFF) await S("Page.addScriptToEvaluateOnNewDocument", { source: "window.__NOBADGEFIX=1" });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const IDS = ["hName", "hBag", "hLv", "hDoctrine", "hTactic"];

const PROBE = `(()=>{
  const ids=${JSON.stringify(IDS)};
  const bar=document.getElementById("hudMenu");
  const br=bar?bar.getBoundingClientRect():null;
  const shownBox=el=>{ if(!el) return null; const st=getComputedStyle(el);
    if(st.display==="none"||st.visibility==="hidden"||+st.opacity===0) return null;
    const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) return null;
    return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}; };
  const inter=(a,b)=>{ if(!a||!b) return 0;
    const w=Math.min(a.r,b.r)-Math.max(a.l,b.l), h=Math.min(a.b,b.b)-Math.max(a.t,b.t);
    return w>0&&h>0 ? w*h : 0; };
  const cells=ids.map(id=>{
    const el=document.getElementById(id); if(!el) return {id,err:"칸 없음"};
    const cr=el.getBoundingClientRect();
    if(getComputedStyle(el).display==="none"||cr.width<1) return {id,shown:false};
    const ico=shownBox(el.querySelector(".mIco"));
    /* 배지 = 칸 안에서 **절대자리로 떠 있는** 조각들(이름 .mNm 은 흐름 안이라 뺀다) */
    const badges=[...el.children].filter(c=>{
      if(c.classList.contains("mIco")||c.classList.contains("mNm")) return false;
      const st=getComputedStyle(c); return st.position==="absolute" && shownBox(c); });
    const bs=badges.map(b=>{ const r=shownBox(b);
      const st=getComputedStyle(b);
      return { cls:(b.id||b.className||b.tagName).toString().slice(0,12),
        txt:(b.textContent||"").trim(),
        fs:+parseFloat(st.fontSize).toFixed(1),
        w:Math.round(r.w), h:Math.round(r.h),
        over: inter(r,ico),
        /* 칸 밖으로 샌 넓이 — overflow:hidden 이라 이만큼이 잘려 안 보인다 */
        outside: Math.round((r.w*r.h - inter(r,{l:cr.left,t:cr.top,r:cr.right,b:cr.bottom}))*10)/10,
        /* 글자가 제 상자에 안 들어가면(말줄임/잘림) 그것도 못 읽는 것 */
        clipped: b.scrollWidth > Math.ceil(r.w)+1 };
    });
    const icoA = ico ? ico.w*ico.h : 0;
    const overA = bs.reduce((s,b)=>s+b.over,0);
    return { id, shown:true, cw:Math.round(cr.width), ch:Math.round(cr.height),
      icoW: ico?Math.round(ico.w):0,
      /* 겹친 넓이는 배지끼리 안 겹친다고 보고 더한다 — 실제로 둘은 좌·우로 떨어져 있다 */
      hidPct: icoA ? Math.round(Math.min(overA,icoA)/icoA*1000)/10 : 0,
      badges: bs };
  });
  const xp=document.getElementById("xpNum");
  return { barTop: br?Math.round(br.top):0, barH: br?Math.round(br.height):0,
           xpTxt: xp ? (xp.textContent||"").trim() : "(없음)",
           xpShown: !!(xp && xp.getBoundingClientRect().height>1),
           cells };
})()`;

const HIT = `(()=>{ const el=document.getElementById("hLv"); if(!el) return {err:"칸 없음"};
  const r=el.getBoundingClientRect();
  const pts=[["그림",r.left+r.width/2,r.top+r.height*0.32],
             ["왼위",r.left+r.width*0.14,r.top+r.height*0.14],
             ["오른위",r.left+r.width*0.86,r.top+r.height*0.14],
             ["이름",r.left+r.width/2,r.top+r.height*0.85]];
  return pts.map(([n,x,y])=>{ const t=document.elementFromPoint(x,y);
    return { n, x:Math.round(x), y:Math.round(y), own: !!(t&&el.contains(t)) }; });
})()`;

const SIZES = [[1512, 863], [1440, 720], [1280, 620]];
const bad = [];
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2000);
  const g = await ev(PROBE);
  const cells = (g.cells || []).filter(c => c.shown);
  const sk = cells.find(c => c.id === "hLv") || {};
  const others = cells.filter(c => c.id !== "hLv");
  const floor = others.length ? Math.max(...others.map(c => c.hidPct)) : 0;
  console.log(`  ${W}×${H} — 스킬 칸 그림이 배지에 깔린 비율 **${sk.hidPct}%** · 다른 네 칸 최대 ${floor}% · 띠 윗금 ${g.barTop}(키 ${g.barH})`);
  console.log(`      XP 띠: "${g.xpTxt}" ${g.xpShown ? "보임" : "★안 보임"}`);
  for (const b of (sk.badges || []))
    console.log(`      배지 ${b.cls} "${b.txt}" ${b.w}×${b.h}(${b.fs}px) · 그림 덮음 ${Math.round(b.over)}px² · 칸 밖 ${b.outside}px²${b.clipped ? " ★잘림" : ""}`);
  if (cells.length !== 5) bad.push(`${W}×${H} 칸이 ${cells.length} 개`);
  if (floor > 0.5) bad.push(`${W}×${H} 아래 눈금이 ${floor}% — 자가 안 산다`);
  if (!OFF) {
    if (sk.hidPct > 8) bad.push(`${W}×${H} 그림이 아직 ${sk.hidPct}% 깔렸다`);
    for (const b of (sk.badges || [])) {
      if (b.outside > 1) bad.push(`${W}×${H} 배지 ${b.cls} 가 칸 밖으로 ${b.outside}px² 샌다`);
      if (b.clipped) bad.push(`${W}×${H} 배지 ${b.cls} 글자가 잘렸다`);
    }
    /* ㉮ 안 쓴 점수가 여전히 읽히나 — 세이브의 tree 가 비었으니 점수는 lv-1 = 25 */
    const dot = (sk.badges || []).find(b => b.cls.includes("spDot"));
    if (!dot) bad.push(`${W}×${H} 안 쓴 점수 배지가 사라졌다`);
    else {
      if (dot.fs < 9) bad.push(`${W}×${H} 점수 글자가 ${dot.fs}px`);
      if (dot.txt !== "25") bad.push(`${W}×${H} 점수가 "${dot.txt}"(25 라야 한다)`);
    }
    /* ㉯ 레벨이 화면에 남아 있나 */
    if (!g.xpShown || !/Lv\.26/.test(g.xpTxt)) bad.push(`${W}×${H} 레벨이 화면에서 사라졌다("${g.xpTxt}")`);
  }
}

/* ④ 눌러도 열리나 — 배지 자리까지 눌러 본다 */
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(2000);
const hits = await ev(HIT);
console.log("  누르는 자리:", (hits || []).map(h => `${h.n}${h.own ? "○" : "★남의 것"}`).join(" "));
for (const h of (hits || [])) if (!h.own) bad.push(`「${h.n}」 자리가 칸 밖으로 샌다`);
await ev(`window.__closeAll && window.__closeAll()`); await wait(250);
const pt = (hits || []).find(h => h.n === "그림");
if (pt) {
  await S("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  await wait(500);
  const open = await ev(`[...document.querySelectorAll(".win.on")].map(w=>w.id).join(",")`);
  console.log(`  그림 자리를 눌렀다 → 열린 창 "${open}"`);
  if (!/winTree/.test(open || "")) bad.push(`그림 자리를 눌러도 스킬트리가 안 열린다("${open}")`);
}

console.log("errs", errs.slice(0, 3));
console.log(bad.length ? "판정: 미달 — " + bad.join(" · ") : `판정: 통과${OFF ? " (문 — 고치기 전을 쟀다)" : ""}`);
await raw("Target.closeTarget", { targetId });
process.exit(bad.length && !OFF ? 1 : 0);
