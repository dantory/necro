/* V-98 — **던전에서 창을 열어 본다.** V-93 이 마을의 덮는 창 일곱을 보며 「이 창들은
   마을에서만 열려 그 사이에는 싸우지 않는다」를 전제로 `.res`(시체·Lv·군세)를
   물러나게 했다. 그런데 **트리는 던전에서도 열린다**(KeyT/KeyS 에 자리 검사가 없다).
   싸우는 중에 그 줄이 사라지면 「이미 죽어 있는 것을 숨긴다」가 아니라 **살아 있는
   눈금을 지우는 것**이다([[floor-erases-the-ramp]]).
   node tools/v98_dunwin.mjs [width] [height] [old]   (tmp/v98_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const OLD = process.argv.includes("old");
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const it = (k, tier, af) => ({ k, tier, af });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }]), robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);

if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 없다");

/* 「싸우는 눈금」이 보이는지 — 자리·`visibility`·글자를 그대로 읽는다.
   opacity/visibility 는 **조상까지 거슬러** 본다(부모가 숨으면 자식은 멀쩡해 보인다). */
const SEE = `(()=>{
  const vis=(e)=>{ for(let n=e;n&&n.nodeType===1;n=n.parentElement){
    const c=getComputedStyle(n);
    if(c.visibility==="hidden"||c.display==="none"||+c.opacity===0) return false; } return true; };
  const one=(sel)=>{ const e=document.querySelector(sel); if(!e) return null;
    const b=e.getBoundingClientRect();
    return { txt:(e.textContent||"").trim().slice(0,40), on:vis(e), w:Math.round(b.width), h:Math.round(b.height) }; };
  return { at:(window.__MODE&&window.__MODE.at)||"?",
    res:one(".mid .res"), band:one("#hudMenu"),
    hp:one("#hpNum"), mp:one("#mpNum"),
    win:[...document.querySelectorAll(".win.on")].map(e=>e.id).join(","),
    /* 창틀 밑 · 판 위 — 겹치면 그만큼 눈금을 먹는다 */
    frame:(()=>{ const w=document.querySelector(".win.on"); if(!w) return null;
      const f=w.querySelector(".frame")||w; const b=f.getBoundingClientRect();
      const p=document.getElementById("panel"), m=document.getElementById("hudMenu");
      const top=Math.min(p?p.getBoundingClientRect().top:1e9, m?m.getBoundingClientRect().top:1e9);
      return { bot:Math.round(b.bottom), hudTop:Math.round(top), over:Math.max(0,Math.round(b.bottom-top)) }; })(),
    /* 트리 줄기가 얼마나 줄었는가 — 22px 이 바닥이고 그 밑은 구른다(fitTree) */
    tree:(()=>{ const c=document.getElementById("treeCols"); if(!c||!c.clientHeight) return null;
      return { tS:getComputedStyle(c).getPropertyValue("--tS").trim(),
               scroll:Math.max(0,c.scrollHeight-c.clientHeight) }; })(),
    /* 트리 발치가 잘리지 않았는가 — 「나가기」가 보여야 닫을 수 있다 */
    foot:(()=>{ const w=document.querySelector(".win.on .winFoot"); if(!w) return null;
      const b=w.getBoundingClientRect(); return { on:vis(w), bot:Math.round(b.bottom), inView:b.bottom<=innerHeight+1 }; })(),
    corpse:(document.getElementById("gCorpse")||{}).textContent,
    army:(document.getElementById("gArmy")||{}).textContent }; })()`;

const rows = [];
const step = async (name, at, out) => {
  const a = await ev(SEE); await wait(3000); const b = await ev(SEE);
  const moving = a.corpse !== b.corpse || a.army !== b.army;   /* 창이 떠 있어도 싸움은 도는가 */
  rows.push({ name, where: at, ...b, moving });
  console.log(name.padEnd(18), JSON.stringify({ win: b.win, res: b.res?.on, band: b.band?.on, hp: b.hp?.on, over: b.frame?.over, foot: b.foot?.inView, tree: b.tree, moving }));
  if (out) await shot(`tmp/v98_${out}_${W}.png`);
};

/* 마을 먼저 — 여기서는 숨는 것이 옳다(V-85/V-93). 던전으로는 한 번만 들어간다
   (돌아오는 길이 밖으로 안 나 있다). */
await step("① 마을 · 창 없음", "town", null);
await ev(`window.__openWin("tree")`); await wait(700); await step("② 마을 · 트리", "town", "town_tree");
await ev(`window.__closeAll()`); await wait(500);

await ev(`window.__toDungeon()`); await wait(2500);
if (OLD) await ev(`document.body.classList.add("dunold")`);   /* 옛 결로 되돌리는 문 */
if (!(await ev(`!!(window.__geo && window.__geo.sc)`))) throw new Error("__geo 가 안 섰다");
await step("③ 던전 · 창 없음", "dun", "dun_plain");
await ev(`window.__openWin("tree")`); await wait(700); await step("④ 던전 · 트리", "dun", "dun_tree");
await ev(`window.__closeAll()`); await wait(500); await step("⑤ 닫은 뒤", "dun", null);
await ev(`window.__openWin("stat")`); await wait(700); await step("⑥ 던전 · 능력치+가방", "dun", "dun_char");
await ev(`window.__closeAll()`); await wait(400);
await ev(`window.__openWin("doctrine")`); await wait(700); await step("⑦ 던전 · 편성", "dun", null);
await ev(`window.__closeAll()`); await wait(400);
await ev(`window.__openWin("tactic")`); await wait(700); await step("⑧ 던전 · 운용", "dun", null);
await ev(`window.__closeAll()`); await wait(400);
await ev(`window.__openWin("shop")`); await wait(700); await step("⑨ 던전 · 상인", "dun", null);
await ev(`window.__closeAll()`); await wait(400);

const bad = rows.filter(r => r.where === "dun" && r.win &&
  (!r.res?.on || !r.band?.on || (r.frame?.over || 0) > 0 || (r.foot && !r.foot.inView)));
console.log("\n판정:", bad.length ? `미달 ${bad.length} — 싸우는 중에 눈금이 사라진다` : "통과");
for (const r of bad) console.log("  ", r.name, "res", r.res?.on, "band", r.band?.on,
  "판을 먹은 px", r.frame?.over, "발치", r.foot?.inView, "win", r.win);
if (errs.length) console.log("errs", errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(bad.length ? 1 : 0);
