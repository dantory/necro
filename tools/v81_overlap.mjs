/* **V-81 — 창의 발치를 메뉴 띠가 밟는가.** (V-80b 의 「먼저 재고 정할 것」)
   그림만으로는 z 순서인지 자리인지 못 가른다. 그래서 둘을 따로 잰다:
   ① 자리 — 창틀(.frame)과 띠 단추들의 rect 가 겹치는 픽셀
   ② 눌림 — 겹친 자리 한가운데에서 `elementFromPoint` 가 **누구를** 집는지
   ★ V-77 이 도킹 창(능력치·가방)에만 `--menuH` 를 빼 줬다 — 보통 창 아홉 장을 다 본다
     ([[carry-fixes-forward]]).
   ★ 발치가 잘리지 않았는지(내용 넘침)도 같은 판에서 센다 — 자리를 51px 줄이는 고침이라
     「안 겹치는데 안 보인다」로 옮겨 갈 수 있다.
   node tools/v81_overlap.mjs [W] [H]   (tmp/v81_<창>.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
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
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
/* look_shots · v80_look 과 **같은 몸**을 심는다 — 사진끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);

/* 자를 위한 문 — 고치기 전을 **같은 자**로 재려면 옛 자리로 되돌릴 수 있어야 한다
   (V81_OLD=1 → 「어디부터」만 판 위에서 멈추고 z 25 로 내려간다). */
if (process.env.V81_OLD === "1") {
  await ev(`(()=>{const st=document.createElement("style");
    st.textContent="#winDive{inset:38px 0 var(--hudH) 0 !important;z-index:25 !important}";
    document.head.appendChild(st);})()`);
  console.log("  (V81_OLD — 옛 자리로 되돌려 잰다)");
}
const WINS = [["shop","winShop"],["forge","winForge"],["dive","winDive"],["tree","winTree"],
              ["doctrine","winDoctrine"],["tactic","winTactic"],["reborn","winReborn"],
              ["stat","winStat"],["bag","winBag"]];
const IDS = ["hName","hLv","hBag","hDoctrine","hTactic"];
const bad = [];
console.log(`${W}x${H} · 메뉴 띠 ${await ev(`getComputedStyle(document.documentElement).getPropertyValue("--menuH").trim()`)}`);
for (const [key, dom] of WINS) {
  await ev(`window.__openWin(${JSON.stringify(key)})`); await wait(450);
  const r = await ev(`(()=>{
    const win = document.getElementById(${JSON.stringify(dom)});
    if (!win) return { err: "창이 없다" };
    if (!win.classList.contains("on")) return { err: "안 열렸다" };
    const box = win.querySelector(".frame") || win;
    const wr = box.getBoundingClientRect();
    const hits = [];
    for (const id of ${JSON.stringify(IDS)}) {
      const e = document.getElementById(id);
      if (!e) continue;
      /* ★ 부모가 display:none 이어도 **제 cs.display 는 flex 로 나온다** — 자식만 보면
         상인·대장간 창에서 「띠가 겹친다」는 거짓 겹침이 나온다(V-81 에서 실제로 나왔다).
         「checkVisibility」 는 조상까지 본다. */
      if (!e.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const b = e.getBoundingClientRect();
      const ox = Math.min(wr.right, b.right) - Math.max(wr.left, b.left);
      const oy = Math.min(wr.bottom, b.bottom) - Math.max(wr.top, b.top);
      if (!(ox > 0 && oy > 0)) continue;
      const cx = (Math.max(wr.left, b.left) + Math.min(wr.right, b.right)) / 2;
      const cy = (Math.max(wr.top, b.top) + Math.min(wr.bottom, b.bottom)) / 2;
      const t = document.elementFromPoint(cx, cy);
      hits.push({ id, ov: [Math.round(ox), Math.round(oy)],
                  eats: !!(t && (t === e || e.contains(t))),
                  covered: !!(t && win.contains(t)) });
    }
    /* 발치가 잘렸나 — **창틀 자체**가 제 몫(.win 의 안쪽)을 넘는지만 본다.
       안쪽 조각을 낱낱이 세면 «구르는 칸의 아래쪽 내용»까지 넘침으로 읽는다
       (첫 판에서 「wayZ lock」 362px 이 그렇게 나왔다 — 굴리면 보이는 것이다). */
    const ar = win.getBoundingClientRect();
    const cs2 = getComputedStyle(win);
    const inner = ar.bottom - parseFloat(cs2.paddingBottom || 0);
    const panel = document.getElementById("panel"), band = document.getElementById("hudMenu");
    const vis = (e) => !!(e && e.checkVisibility({ visibilityProperty: true, opacityProperty: true }));
    return { rect: [wr.left, wr.top, wr.right, wr.bottom].map(Math.round), hits,
             clip: Math.round(wr.bottom - inner), who: "창틀",
             hud: (vis(panel) ? "판" : "") + (vis(band) ? "띠" : "") || "없음" };
  })()`);
  if (r.err) { console.log(`  ${key.padEnd(9)} ${r.err}`); bad.push(`${key}: ${r.err}`); continue; }
  const eat = r.hits.filter(h => h.eats);
  /* ★ 네모가 겹치는 것 자체는 흠이 아니다 — 상인·대장간·트리는 **일부러** 띠를 덮는다.
     흠은 「띠가 창 «위에» 서서 눌림을 먹는 것」뿐이다. */
  const tag = r.hits.length
    ? (eat.length ? `★띠가 위에 있다 ${eat.map(h => `${h.id}(${h.ov[0]}x${h.ov[1]})`).join(" ")}`
                  : `창이 띠 ${r.hits.length}칸을 덮는다`)
    : "띠와 안 겹침";
  console.log(`  ${key.padEnd(9)} 창틀 ${String(r.rect.join(",")).padEnd(22)} ${tag}${r.clip > 1 ? ` · 제 몫 밖 ${r.clip}px` : ""} · HUD ${r.hud}`);
  if (eat.length) bad.push(`${key}: 띠가 창 위에서 눌림을 먹는다(${eat.map(h => h.id).join(",")})`);
  else if (r.hits.some(h => !h.covered)) bad.push(`${key}: 겹친 자리를 창도 띠도 아닌 것이 집는다`);
  if (r.clip > 1 && r.hud !== "없음") bad.push(`${key}: 창틀이 제 몫보다 ${r.clip}px 아래로 나갔다`);
  await shot(`tmp/v81_${key}.png`);
  /* ★ `__openWin(key)` 는 **토글**이라, 열린 채로 다음 것을 열면 그 창이 닫혀 버린다
     (능력치·가방은 한 벌로 열려 「bag: 안 열렸다」가 나왔다). 손으로 걷는다. */
  await ev(`(()=>{document.querySelectorAll(".win.on").forEach(e=>e.classList.remove("on"));
    document.body.classList.remove("charOpen","winopen");})()`); await wait(200);
}
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : `통과 (${W}x${H} · 창 ${WINS.length}장)`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
