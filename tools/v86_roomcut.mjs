/* **V-86 — 자리가 남는데 글을 자르는 창.**
   1366×700 에서 편성·운용을 켜서 보니 설명칸의 셋째 줄이 «가로로 반» 잘려 있었다
   (`tmp/v80_doctrine.png`). 그런데 그 창 **아래로 화면이 258px 이나 비어 있다** —
   더 있어서 자른 게 아니라 **안 쓰고 자른** 것이다.
   그래서 이 자는 창마다 둘을 나란히 센다:
   ① **넘침** — 창 안에서 구르는 칸의 `scrollHeight - clientHeight`(안 보이는 글의 키).
   ② **남는 자리** — 창이 **설 수 있는 판**(`.win`)의 밑에서 화면 바닥까지 비어 있는 px.
      창틀(`.frame`)이 아니라 겉판으로 재는 까닭: 창틀은 가운데 서느라 위아래로 여백을
      남기는데 그건 «쓸 수 있는 자리»가 아니다. 겉판이 화면 끝에서 멈춘 만큼만 흠이다.
   ③ **반 잘린 줄** — 칸의 보이는 밑금을 «가로지르는» 글줄이 있으면 그 줄이 잘린 px.
   흠의 뜻: **넘침이 있는데 남는 자리가 그보다 크다.** 자리를 안 쓰고 글을 자른 것이다
   ([[knob-that-does-nothing]] 의 이웃 — 있는 자리를 안 쓴다).
   ★ 능력치·가방(도킹 한 벌)은 판 위에 붙는 결이라 여기서 뺀다 — 그 둘은 `--menuH` 와
     묶여 있어 자리를 넓히면 다른 자가 운다(V-85 의 그 자리).
   node tools/v86_roomcut.mjs [W] [H]     (문: ROOM_OLD=1 로 옛 결을 되돌려 잰다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* look_shots · v80_look · v85_bandcut 과 **같은 몸** — 수치끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
if (process.env.ROOM_OLD === "1") {
  await ev(`document.body.classList.add("roomold")`);
  console.log("  (ROOM_OLD — 옛 결로 되돌려 잰다)");
}
const WINS = [["doctrine","winDoctrine"],["tactic","winTactic"],["reborn","winReborn"],
              ["shop","winShop"],["forge","winForge"],["dive","winDive"],["tree","winTree"]];
const bad = [];
console.log(`${W}x${H}`);
console.log("  창        창틀키 겉판밑남음  넘침  반잘린줄  칸");
for (const [key, dom] of WINS) {
  await ev(`window.__openWin(${JSON.stringify(key)})`); await wait(450);
  const r = await ev(`(()=>{
    const win = document.getElementById(${JSON.stringify(dom)});
    if (!win) return { err: "창이 없다" };
    if (!win.classList.contains("on")) return { err: "안 열렸다" };
    const fr = win.querySelector(".frame");
    if (!fr) return { err: "창틀이 없다" };
    const F = fr.getBoundingClientRect(), Wn = win.getBoundingClientRect();
    const free = Math.round(innerHeight - Wn.bottom);
    /* 구르는 칸을 **다 찾는다** — 이름을 못박으면 새 칸이 생겼을 때 조용히 놓친다. */
    let worst = null;
    for (const el of fr.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (!/auto|scroll/.test(cs.overflowY)) continue;
      const over = el.scrollHeight - el.clientHeight;
      if (over <= 2) continue;
      /* 반 잘린 줄 — 보이는 밑금을 가로지르는 «글줄»의 잘린 px */
      const box = el.getBoundingClientRect();
      const edge = box.bottom - parseFloat(cs.paddingBottom || 0);
      let cut = 0;
      const wk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = wk.nextNode(); n; n = wk.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const lr of rg.getClientRects()) {
          if (lr.height < 4) continue;
          if (lr.top < edge - 1.5 && lr.bottom > edge + 1.5)
            cut = Math.max(cut, Math.round(lr.bottom - edge));
        }
      }
      const name = "." + (el.className || "").toString().split(/\\s+/).filter(Boolean)[0] || el.tagName;
      if (!worst || over > worst.over) worst = { over: Math.round(over), cut, name };
    }
    return { h: Math.round(F.height), free, over: worst ? worst.over : 0,
             cut: worst ? worst.cut : 0, box: worst ? worst.name : "-" };
  })()`);
  await ev(`window.__closeWin && window.__closeWin()`); await wait(120);
  if (r.err) { bad.push(`${key}: ${r.err}`); console.log(`  ${key.padEnd(9)} ${r.err}`); continue; }
  /* 흠 = 넘침이 있는데 **그보다 큰 자리가 밑에 남아 있다.** */
  const ill = r.over > 2 && r.free >= r.over;
  console.log(`  ${key.padEnd(9)} ${String(r.h).padStart(5)} ${String(r.free).padStart(10)} ` +
              `${String(r.over).padStart(6)} ${String(r.cut).padStart(8)}  ${r.box}${ill ? "   ← 흠" : ""}`);
  if (ill) bad.push(`${key}: 넘침 ${r.over}px 인데 밑에 ${r.free}px 이 남는다(반잘린줄 ${r.cut}px)`);
}
console.log(bad.length ? `판정: 운다 (${bad.length})\n  ` + bad.join("\n  ") : "판정: 통과");
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(bad.length ? 1 : 0);
