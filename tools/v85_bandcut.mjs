/* **V-85 — 창이 뜨면 메뉴 띠가 «반쯤» 잘려 남는가.**
   V-81 이 편성·운용·환생의 z 를 35 로 올려 「띠가 발치를 밟던 것」을 뒤집었다.
   그런데 뒤집힌 자리에 새 흠이 남았다 — 이 창들은 **짧아서** 띠에 걸치기만 하므로,
   창틀이 단추의 «윗동»만 덮고 아랫동은 그대로 보인다. 눌리지도 않는다(창이 먹는다).
   그래서 이 자는 둘을 따로 센다:
   ① **그림** — 단추 네모와 **불투명한 창틀**(.frame) 네모가 겹치는 넓이.
      0 도 좋고(통째로 가림) 100% 도 좋다(온전히 보임). **그 사이가 흠이다.**
   ② **눌림** — 그림으로 «보이는» 단추가 정말 눌리는가(elementFromPoint).
      보이는데 안 눌리면 그것도 흠이다([[knob-that-does-nothing]] 의 뒤집힘).
   ★ 능력치·가방(도킹 한 벌)은 띠와 안 겹치므로 **띠가 살아 있어야** 한다 — 이 자는
     그쪽을 「온전히 보이고 눌린다」로 지켜, 고침이 띠를 통째로 죽이면 운다.
   node tools/v85_bandcut.mjs [W] [H]     (문: BAND_OLD=1 로 옛 결을 되돌려 잰다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
/* undici 의 WebSocket 은 error 를 듣는 이가 없으면 **프로세스를 죽인다** — 탭을 닫으며
   소켓이 끊길 때 자가 통과했는데도 exit 1 이 된다. 빈 귀를 달아 둔다. */
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* look_shots · v80_look · v81_overlap 과 **같은 몸** — 사진·수치끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
/* 자를 위한 문 — 고치기 전을 **같은 자**로 재려면 옛 결로 되돌릴 수 있어야 한다. */
if (process.env.BAND_OLD === "1") {
  await ev(`document.body.classList.add("bandold")`);
  console.log("  (BAND_OLD — 옛 결로 되돌려 잰다)");
}
const WINS = [["shop","winShop"],["forge","winForge"],["dive","winDive"],["tree","winTree"],
              ["doctrine","winDoctrine"],["tactic","winTactic"],["reborn","winReborn"],
              ["stat","winStat"],["bag","winBag"]];
const bad = [];
console.log(`${W}x${H} · 메뉴 띠 ${await ev(`getComputedStyle(document.documentElement).getPropertyValue("--menuH").trim()`)}`);
for (const [key, dom] of WINS) {
  await ev(`window.__openWin(${JSON.stringify(key)})`); await wait(450);
  const r = await ev(`(()=>{
    const win = document.getElementById(${JSON.stringify(dom)});
    if (!win) return { err: "창이 없다" };
    if (!win.classList.contains("on")) return { err: "안 열렸다" };
    const menu = document.getElementById("hudMenu");
    if (!menu) return { err: "띠가 없다" };
    /* 불투명한 것만 «가린다» — 창 겉판(.win)은 배경이 없어 그림을 안 덮는다.
       .frame 이 그 창에서 실제로 칠해지는 네모다(그림자는 뺀다 — 흐린 자리는 읽힌다). */
    const fr = win.querySelector(".frame");
    const wr = fr ? fr.getBoundingClientRect() : win.getBoundingClientRect();
    const btns = [];
    for (const b of menu.querySelectorAll("button")) {
      /* 조상까지 본다 — 부모가 숨으면 제 display 는 여전히 flex 다(v81_overlap 의 그 못). */
      if (!b.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const g = b.getBoundingClientRect();
      if (!(g.width > 0 && g.height > 0)) continue;
      const ox = Math.max(0, Math.min(wr.right, g.right) - Math.max(wr.left, g.left));
      const oy = Math.max(0, Math.min(wr.bottom, g.bottom) - Math.max(wr.top, g.top));
      const cov = (ox * oy) / (g.width * g.height);          // 창틀이 덮은 비율
      /* 눌림은 **안 덮인 쪽 한가운데**에서 본다 — 덮인 자리를 짚으면 언제나 창이 나온다. */
      const freeTop = Math.min(wr.top, g.bottom) > g.top ? g.top : wr.bottom;
      const py = cov > 0 && cov < 1 ? (Math.max(g.top, wr.bottom) + g.bottom) / 2
                                     : (g.top + g.bottom) / 2;
      const t = document.elementFromPoint((g.left + g.right) / 2, Math.min(py, g.bottom - 1));
      btns.push({ t: b.textContent.trim().slice(0, 3), cov: +(cov * 100).toFixed(0),
                  hit: !!(t && (t === b || b.contains(t))) });
    }
    return { wr: [wr.left, wr.top, wr.right, wr.bottom].map(Math.round), btns };
  })()`);
  if (r.err) { console.log(`  ${key.padEnd(9)} ${r.err}`); bad.push(`${key}: ${r.err}`); continue; }
  const half = r.btns.filter(b => b.cov > 0 && b.cov < 100);
  const dead = r.btns.filter(b => b.cov === 0 && !b.hit);
  const say = r.btns.length === 0 ? "띠가 숨었다"
    : half.length ? `**반쯤 잘림** ${half.map(b => `${b.t} ${b.cov}%`).join(" · ")}`
    : r.btns.every(b => b.cov === 100) ? "통째로 가림"
    : dead.length ? `**보이는데 안 눌림** ${dead.map(b => b.t).join(" · ")}`
    : `온전히 보이고 눌린다 (${r.btns.length}칸)`;
  console.log(`  ${key.padEnd(9)} 창틀 ${r.wr.join(",").padEnd(22)} ${say}`);
  if (half.length) bad.push(`${key}: 단추 ${half.length}칸이 반쯤 잘렸다(${half.map(b => b.cov + "%").join(",")})`);
  if (dead.length) bad.push(`${key}: 단추 ${dead.length}칸이 보이는데 안 눌린다`);
  /* 도킹 한 벌은 **띠가 살아 있어야** 한다 — 고침이 띠를 통째로 죽이면 여기서 운다. */
  if ((key === "stat" || key === "bag") && r.btns.length === 0)
    bad.push(`${key}: 띠가 숨었다 — 능력치↔가방을 오갈 길이 없다`);
  await ev(`window.__closeWins && window.__closeWins()`);
  await ev(`document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
            document.body.classList.remove("winopen","charOpen","winover")`);
  await wait(150);
}
console.log(bad.length ? `판정: 운다 (${W}x${H})\n  ${bad.join("\n  ")}` : `판정: 통과 (${W}x${H} · 창 ${WINS.length}장)`);
/* ★ **제 탭을 치우고 나간다.** 안 치우면 한 번 돌 때마다 탭이 하나씩 쌓여, 네 폭을
   이어 재는 것만으로 브라우저가 열세 장을 물고 CDP 가 끊긴다(실제로 그랬다 ·
   TOOLS.md 「검증용 헤드리스 크롬이 조용히 썩는다」의 이웃). */
try { await raw("Target.closeTarget", { targetId }); } catch {}
try { bws.close(); } catch {}
process.exit(bad.length ? 1 : 0);
