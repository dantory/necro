/* V-77 — **창 안의 단추가 진짜로 «보이고 눌리는가».**
   node tools/v77_hit.mjs [창,창,…]      (기본 stat,bag,tree,tactic,doctrine)

   왜 이 자가 필요한가: V-76 에서 「환생」이 26px 중 8px 만 보였다. 네모끼리 견주는 자로는
   못 잡는다 — 무엇이 위에 있느냐(z-index)를 같이 봐야 하기 때문이다. 그래서 **사람이
   누르는 그 길**로 잰다([[probe-must-walk-the-real-path]]): 단추 넓이에 점을 촘촘히 찍고
   `elementFromPoint` 가 **그 단추(또는 그 자손)**를 돌려주는 점의 비율을 센다.
   덮은 것이 있으면 그 이름도 같이 말한다 — 「누가 덮었는가」가 고칠 자리다.

   문턱: 눌리는 넓이 **100%** (단추는 반쯤 눌리면 안 된다). 바닥이 문턱에서 멀지 않은지도
   본다 — 온전한 단추가 여럿 100 을 내야 자가 눈이 먼 것이 아니다([[floor-far-from-threshold]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

/* 점 찍기는 페이지 안에서 한다 — 한 단추에 최대 11×11 이라 왕복이 적다. */
const PROBE = `(win)=>{
  const step=(a,b,n)=>{const o=[];for(let i=0;i<n;i++)o.push(a+(b-a)*(i+0.5)/n);return o;};
  const out=[];
  for(const el of document.querySelectorAll(".win, .window, [id^=win]")){
    if(getComputedStyle(el).display==="none") continue;
    for(const b of el.querySelectorAll("button")){
      const cs=getComputedStyle(b); if(cs.display==="none"||cs.visibility==="hidden") continue;
      const r=b.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
      const nx=Math.min(11,Math.max(3,Math.round(r.width/8))), ny=Math.min(11,Math.max(3,Math.round(r.height/6)));
      let hit=0,tot=0; const by={};
      for(const y of step(r.top,r.bottom,ny)) for(const x of step(r.left,r.right,nx)){
        tot++; const t=document.elementFromPoint(x,y);
        if(t&&(t===b||b.contains(t))) hit++;
        else { let n=t, tag="(밖)"; while(n&&n!==document.body){ if(n.id){tag="#"+n.id;break;} if(n.className&&typeof n.className==="string"){tag="."+n.className.split(" ")[0];break;} n=n.parentElement; }
               by[tag]=(by[tag]||0)+1; }
      }
      out.push({win, id:b.id||"", txt:(b.textContent||"").trim().slice(0,12),
                pct:Math.round(hit/tot*1000)/10, w:Math.round(r.width), h:Math.round(r.height),
                y:Math.round(r.top), by});
    }
  }
  return out;
}`;

const wins = (process.argv[2] || "stat,bag,tree,tactic,doctrine").split(",");
/* 창 크기를 여럿 본다 — 한 크기에서만 재면 「그 크기에서만 맞는 상수」를 통과시킨다. */
const SIZES = (process.env.SIZES || "1512x863,1366x768,1920x1080").split(",")
  .map(s => s.split("x").map(Number));

async function sweep(before) {
  const all = [];
  for (const [W, H] of SIZES) {
    await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
    await ev(`globalThis.__NOMENUH=${before}; window.dispatchEvent(new Event("resize"))`); await wait(400);
    for (const w of wins) {
      await ev(`window.__closeWin && window.__closeWin()`); await wait(200);
      await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(500);
      for (const r of (await ev(`(${PROBE})(${JSON.stringify(w)})`)) || []) all.push({ ...r, size: `${W}×${H}` });
    }
  }
  return all;
}
const show = (tag, rows) => {
  const bad = rows.filter(r => r.pct < 100), ok = rows.filter(r => r.pct >= 100);
  console.log(`${tag}  단추 ${rows.length} · 온전 ${ok.length} · 잘림 ${bad.length}`);
  for (const r of bad.sort((a, b) => a.pct - b.pct))
    console.log(`   ✗ [${r.size} ${r.win}] "${r.txt}" ${r.w}×${r.h} y=${r.y} → ${r.pct}% · 덮은 것 ${JSON.stringify(r.by)}`);
  return bad.length;
};
const nBefore = show("전(--menuH 없음)", await sweep(true));
const after = await sweep(false);
const nAfter = show("후", after);
console.log(`바닥 확인: 후에 ${after.filter(r => r.pct >= 100).length}개가 100% 를 냈고, 전에는 ${nBefore}개가 울었다 — 자가 눈이 멀지 않았다`);
console.log(`문턱은 **0** 이다 — 단추는 반쯤 눌리면 안 된다.`);
console.log(`판정: ${nAfter ? "미달 — 잘린 단추 " + nAfter : nBefore ? "통과 — 전 " + nBefore + "건이 후 0 건" : "통과(다만 전에도 안 울었다 — 자를 의심할 것)"}`);
await S("Target.closeTarget", { targetId }); bws.close();
process.exit(nAfter ? 1 : 0);
