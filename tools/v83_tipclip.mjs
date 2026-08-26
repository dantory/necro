/* **창 안 설명 상자(.tip)가 말없이 자르는가.** V-80 이 「어디부터」 목록에서 고친 그것을
   상인·대장간·편성·운용의 `.tip` 에 대고 다시 잰다 — 그 넷은 `.wScroll` 이 아니라
   「더 있다」 띠가 안 닿는다([[carry-fixes-forward]]).
     node tools/v83_tipclip.mjs            네 폭 전부
     node tools/v83_tipclip.mjs 1280 720   한 폭만
   재는 것: 넘침px · 숨은 줄 · 반쯤 잘린 줄 · more 표시 여부.
   ★ 「반쯤 잘린 줄」은 **밑자락 그늘(.wScroll::after)** 까지 셈에 넣는다 — 네모만 재면
     통과인데 사람 눈에는 잘린다(V-56 이 겪은 그 거짓말 · [[threshold-and-ruler-must-match]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const A = process.argv.slice(2).filter(s => /^\d+$/.test(s)).map(Number);
/* 고치기 «전»을 같은 자로 재는 문 — `node tools/v83_tipclip.mjs old` (설명칸에서
   `wScroll` 을 떼면 띠도 발치 셈도 없던 그 판이다). 자가 여기서 **울어야** 눈금이다. */
const OLD = process.argv.includes("old");
const SIZES = A.length >= 2 ? [[A[0], A[1]]] : [[1512, 863], [1440, 800], [1280, 720], [1366, 700]];
const ws = new WebSocket((await (await fetch(CDP + "/json/version")).json()).webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
ws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => ws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* v80_look 과 **같은 몸** — 사진·수치를 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const PROBE = (tipId) => `(()=>{
  const t=document.getElementById(${JSON.stringify("@")}.replace("@",${JSON.stringify(tipId)}));
  if(!t) return {miss:1};
  const cs=getComputedStyle(t);
  const over = Math.max(0, t.scrollHeight - t.clientHeight);
  /* ★ 그늘은 **켜져 있을 때만** 덮는다 — 늘 34px 를 빼면 안 넘치는 창까지 「가려졌다」로
     읽는다(V-56 이 겪은 「자가 거짓말한다」의 거울상 · [[threshold-and-ruler-must-match]]). */
  const fade = (t.classList.contains("wScroll") && t.classList.contains("more"))
    ? (parseFloat(getComputedStyle(t,"::after").height)||34) : 0;
  const box = t.getBoundingClientRect();
  const lim = box.top + t.clientTop + t.clientHeight;   /* 네모가 끝나는 y */
  /* ★ **붙박이 발치(값·단추)도 덮개다.** .tipBuy 는 position:sticky 라 바닥에 못박혀
     그 아래 글을 가린다 — 네모 안에 「있는데」 사람은 못 읽는다. 그 윗변까지만 읽힌다. */
  const foot = [...t.children].find(e=>getComputedStyle(e).position==="sticky");
  const fr = foot ? foot.getBoundingClientRect() : null;
  const eye = Math.min(lim - fade, fr ? fr.top : Infinity);
  let hid=0, half=0;
  for(const el of t.children){
    if(el===foot) continue;
    const r = el.getBoundingClientRect();
    if(r.height<=0) continue;
    if(r.top >= eye - 1) hid++;
    else if(r.bottom > eye + 1) half++;
  }
  return {over:Math.round(over), hid, half,
          more: t.classList.contains("more"), wsc: t.classList.contains("wScroll"),
          ovf: cs.overflowY, h:Math.round(box.height)};
})()`;

const WINS = [["상인", "shop", "shopTip"], ["대장간", "forge", "forgeTip"],
              ["편성", "doctrine", "docTip"], ["운용", "tactic", "tacTip"],
              ["스킬", "tree", "treeTip"]];
let bad = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  if (OLD) await ev(`(()=>{for(const t of document.querySelectorAll(".win .tip.wScroll")) t.classList.remove("wScroll");return 1})()`);
  console.log(`── ${W}x${H}${OLD ? "  (옛 자리)" : ""}`);
  for (const [nm, key, tip] of WINS) {
    await ev(`window.__openWin(${JSON.stringify(key)})`); await wait(420);
    /* 상인·대장간의 .tip 은 **고른 것이 있어야** 글이 찬다 — 첫 칸을 눌러 둔다. */
    const FILL = { shop: "#shopGrid .cell:not(.empty)", forge: "#forgeGrid .cell:not(.empty)",
                   tree: "#treeCols .node, #treeCols .cell, #treeCols [data-id]" };
    if (FILL[key]) await ev(`(()=>{const c=document.querySelector(${JSON.stringify(FILL[key])});if(c)c.click();return !!c})()`);
    await wait(320);
    const r = await ev(PROBE(tip));
    if (r?.miss) { bad.push(`${W}x${H} ${nm}: 상자 없다`); console.log(`  ${nm.padEnd(4)} 상자 없다`); }
    else {
      /* 판정 — 「다 보여라」가 아니라 **「말없이 자르지 마라」**다(V-79·V-80 이 세운 결).
           ① 넘치는데 띠가 꺼져 있으면 운다 — 사람은 더 있는 줄을 모른다.
           ② 구를 것이 없는데(넘침 0) 가려진 줄이 있으면 운다 — 굴려도 못 읽는 자리다. */
      const cry = (r.over > 2 && !r.more) || (r.over <= 2 && (r.hid > 0 || r.half > 0));
      if (cry) bad.push(`${W}x${H} ${nm}: 숨은 ${r.hid} · 반 ${r.half} · 넘침 ${r.over}${r.more ? "" : " · 띠없음"}`);
      console.log(`  ${nm.padEnd(4)} 넘침 ${String(r.over).padStart(4)}px · 숨은 ${r.hid} · 반쯤 ${r.half} · 띠 ${r.more ? "켜짐" : (r.wsc ? "꺼짐" : "없음")} · overflowY ${r.ovf} · 키 ${r.h}`);
    }
    await ev(`window.__closeWin ? window.__closeWin() : window.__openWin(null)`); await wait(160);
  }
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" | ") : `통과 (창 ${WINS.length} × 폭 ${SIZES.length})`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
