/* **아래 메뉴 다섯 칸이 제 이름을 대는가** — 능력치·가방·스킬·편성·운용.
   이 띠는 게임에서 **창을 여는 유일한 길**이다(마을 그림의 상인·대장간·웨이포인트를
   빼면). 그런데 칸 안에는 그림 하나뿐이고 이름은 `title` 툴팁에만 있다 —
   손이 없는 화면(터치)에서는 툴팁이 아예 안 뜨고, 마우스라도 **얹기 전에는** 못 읽는다.
   V-27(상인 「사기」) · V-28(편성·운용 칸)이 고친 그 결을 **띠 자신에게는 안 옮겼다**
   ([[carry-fixes-forward]]).

   재는 것 넷 (창 높이마다):
     ① 이름이 칸 안에 보이나 — 글자 높이 ≥9px · 상자가 칸 네모 **안**. 「몇/다섯」로 센다.
     ② 그림이 얼마나 남았나 — 이름을 넣느라 그림이 좁쌀이 되면 안 고친 것만 못하다
        (그림 넓이 ÷ 칸 넓이 %).
     ③ **무대를 안 먹었나** — 띠는 `overlayTop`(js/main.js)이 읽는 것이라, 키가 1px
        늘면 싸우는 자리가 1px 줄어든다(V-16 이 88px 을 두고 싸운 바로 그 자리).
        띠의 윗금이 고치기 전과 **같아야** 한다.
     ④ **눌러도 그대로 열리나** — 이름은 칸 «안»의 새 조각이라, 누르는 자리가 그 조각이면
        여는 길이 죽는다. 그림만 보면 못 잡는 흠이다([[probe-must-walk-the-real-path]]).
   node tools/v29_menuname.mjs               (고친 뒤)
   NOMENUNAME=1 node tools/v29_menuname.mjs  (문 — 고치기 전을 같은 자로 잰다)  */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NOMENUNAME === "1";
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
/* 문은 **다시 읽어도 살아 있어야** 한다 — reload 뒤에 심으면 menuLayout 이 이미 지나간
   뒤라 늘 「고친 뒤」가 나온다([[silent-zero-is-not-an-observation]] 의 사촌). */
if (OFF) await S("Page.addScriptToEvaluateOnNewDocument", { source: "window.__NOMENUNAME=1" });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const IDS = ["hName", "hBag", "hLv", "hDoctrine", "hTactic"];
const WANT = { hName: "stat", hBag: "bag", hLv: "tree", hDoctrine: "doctrine", hTactic: "tactic" };

/* 한 칸을 재는 눈 — 칸 안의 «그림(.mIco)»과 «이름(.mNm)»을 따로 잰다.
   이름이 칸 밖으로 삐져나가면 **안 보이는 것으로 친다**(잘린 글자는 이름이 아니다). */
const PROBE = `(()=>{
  const ids=${JSON.stringify(IDS)};
  const bar=document.getElementById("hudMenu");
  const br=bar?bar.getBoundingClientRect():null;
  const box=el=>{ if(!el) return null; const r=el.getBoundingClientRect();
    const st=getComputedStyle(el);
    if(st.display==="none"||st.visibility==="hidden"||+st.opacity===0) return null;
    if(r.width<1||r.height<1) return null; return {l:r.left,t:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom}; };
  const out=ids.map(id=>{
    const el=document.getElementById(id); if(!el) return {id,err:"칸 없음"};
    const cr=el.getBoundingClientRect();
    const shown=getComputedStyle(el).display!=="none" && cr.width>1;
    const ico=box(el.querySelector(".mIco"));
    const nm=el.querySelector(".mNm"), nr=box(nm);
    const nmTxt=(nm&&nm.textContent||"").trim();
    const nmFs=nm?parseFloat(getComputedStyle(nm).fontSize):0;
    const inside=r=>!!r && r.l>=cr.left-1 && r.r<=cr.right+1 && r.t>=cr.top-1 && r.b<=cr.bottom+1;
    return { id, shown, cw:Math.round(cr.width), ch:Math.round(cr.height),
      icoW: ico?Math.round(ico.w):0,
      nameOk: !!(nmTxt && nr && nmFs>=9 && nr.h>=9 && inside(nr)),
      nmTxt, nmFs:+nmFs.toFixed(1), nmH: nr?Math.round(nr.h):0 };
  });
  return { barTop: br?Math.round(br.top):0, barH: br?Math.round(br.height):0,
           logTop: (()=>{const l=document.getElementById("log"); if(!l) return 0;
             const r=l.getBoundingClientRect(); return r.height>0?Math.round(r.top):0;})(),
           cells: out };
})()`;

/* 누르는 자리가 살아 있는가 — 칸의 **한가운데**(이름 조각 위일 수도 있다)에서 실제로
   elementFromPoint 를 물어 그 자리가 제 단추 안인지 본다. 그런 다음 그 점을 눌러
   창이 정말 열리는지 확인한다. 지름길(`__openWin`)로는 이 흠을 못 잡는다. */
const HIT = (id) => `(()=>{
  const el=document.getElementById(${JSON.stringify(id)}); if(!el) return {err:"칸 없음"};
  const r=el.getBoundingClientRect();
  const pts=[[r.left+r.width/2, r.top+r.height*0.30],   // 그림 자리
             [r.left+r.width/2, r.top+r.height*0.85]];  // 이름 자리
  return pts.map(([x,y])=>{ const t=document.elementFromPoint(x,y);
    return { x:Math.round(x), y:Math.round(y), own: !!(t && el.contains(t)) }; });
})()`;

const SIZES = [[1512, 863], [1440, 720], [1280, 620]];
const bad = []; const rows = [];
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2000);
  const g = await ev(PROBE);
  const cells = (g.cells || []).filter((c) => c.shown);
  const named = cells.filter((c) => c.nameOk).length;
  const icoPct = cells.length ? Math.round(cells.reduce((s, c) => s + c.icoW / c.cw, 0) / cells.length * 100) : 0;
  rows.push({ W, H, n: cells.length, named, icoPct, barTop: g.barTop, barH: g.barH, logTop: g.logTop });
  console.log(`  ${W}×${H} — 이름 보임 ${named}/${cells.length} · 그림 ${icoPct}% · 띠 윗금 ${g.barTop}(키 ${g.barH}) · 로그 윗금 ${g.logTop}`);
  for (const c of cells) console.log(`      ${c.id} ${c.cw}×${c.ch} 그림 ${c.icoW} 이름 "${c.nmTxt}"(${c.nmFs}px·${c.nmH}px) ${c.nameOk ? "보임" : "안 보임"}`);
  if (!OFF && named !== cells.length) bad.push(`${W}×${H} 이름 ${named}/${cells.length}`);
  if (cells.length !== 5) bad.push(`${W}×${H} 칸이 ${cells.length} 개(다섯이라야 한다)`);
}

/* ④ **눌러도 그대로 열리나** — 1512×863 에서 다섯 칸을 차례로 눌러 본다. */
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(2000);
const OPEN = `[...document.querySelectorAll(".win.on")].map(w=>w.id).join(",")`;
for (const id of IDS) {
  /* 재기 **전에** 판을 비운다 — 앞 칸이 연 창이 남아 있으면 ㉮ 그 창이 이 칸을 덮어
     `elementFromPoint` 가 남의 것을 집고 ㉯ 그 창을 이 칸의 답으로 잘못 적는다
     (첫 판에 둘 다 그렇게 나왔다 — **자가 틀렸지 판이 틀린 게 아니었다**
     [[cause-written-in-the-item-is-a-guess]]). 치우는 것은 지름길(`__closeAll`)로 하되
     **재는 것은 언제나 누르는 길**이다([[probe-must-walk-the-real-path]]). */
  await ev(`window.__closeAll && window.__closeAll()`); await wait(300);
  const left = await ev(OPEN);
  if (left) { bad.push(`${id} 앞에 ${left} 가 안 닫혔다`); continue; }
  const pts = await ev(HIT(id));
  if (!Array.isArray(pts)) { bad.push(`${id} 자리 못 잼`); continue; }
  const off = pts.filter((p) => !p.own);
  if (off.length) bad.push(`${id} 누르는 자리가 칸 밖으로 샌다(${off.length}/2)`);
  const p = pts[pts.length - 1];               // **이름 자리**를 누른다(제일 위험한 점)
  await S("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
  await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
  await wait(450);
  /* ★ **열린 창은 하나가 아니다** — 1200px 이상에서 「가방」은 능력치와 **함께** 선다
     (`__openWin` 의 charOpen 도킹). 첫 것만 보면 「가방을 눌렀는데 능력치가 열렸다」는
     거짓 미달이 난다. 그래서 «열린 것들 안에 바라던 것이 있는가»로 묻는다. */
  const open = await ev(OPEN);
  const want = { hName: "winStat", hBag: "winBag", hLv: "winTree", hDoctrine: "winDoctrine", hTactic: "winTactic" }[id];
  console.log(`  누름 ${id} → ${open || "안 열림"} (바람 ${want})`);
  if (!open.split(",").includes(want)) bad.push(`${id} 를 이름 자리에서 눌렀는데 ${open || "아무것도"} 열렸다`);
}

console.log("errs", errs);
if (errs.length) bad.push(`콘솔오류 ${errs.length}`);
/* 문을 연 판은 **판정을 내지 않는다** — 「이름 없는 칸」이 통과로 찍히면 그 줄만 보고
   고친 줄 안다. 문은 «전»을 재는 자이지 합격을 매기는 자가 아니다. */
console.log(OFF
  ? `문(NOMENUNAME=1) — 이름을 안 붙인 같은 칸을 잰 값이다. 판정 없음.`
  : `판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 (다섯 칸이 다 제 이름을 대고 · 무대를 안 먹고 · 눌러도 열린다)"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
