/* **「더 있다」가 정작 필요한 창에서만 꺼져 있었다.** (V-90)
   저주나무는 `--tS`(칸 크기)를 44 → 22 까지 내려 창에 맞춘다. 22 는 **바닥**이라
   (그보다 작으면 그림이 안 읽힌다) 낮은 창에서는 아무리 줄여도 안 들어간다 —
   1152×648 에서 스물일곱 칸 중 하나(「어둠의 지배」)가 23px 잘린 채 선다.
   그때 밑자락 흐림(#treeWrap::after)이 「더 있다」를 말해야 하는데, 그 표식은
   **창이 닫혀 있는 동안**(drawTree → edgeFade · clientHeight 0) 「다 봤다」로 정해지고
   여는 길(win())이 `fitTree` 만 다시 부르느라 **한 번도 안 고쳐졌다.**

     node tools/v90_treefade.mjs              네 폭 전부
     node tools/v90_treefade.mjs 1152 648     한 폭만
     node tools/v90_treefade.mjs old          ★ 문 — `__TREE_OLD` 로 옛 꼴을 되살린다(울어야 눈금)

   재는 것 — 창 하나마다 셋:
     ① 넘침px(`#treeCols` scrollHeight − clientHeight) · ② 잘린 칸의 이름과 px
     ③ **흐림이 켜져 있나**(`#treeWrap::after` 의 실제 opacity)
   문(둘 다여야 통과):
     · 넘치면(>2px) 흐림이 **켜져** 있어야 한다(opacity ≥ .9)
     · 안 넘치면 흐림이 **꺼져** 있어야 한다(≤ .05) — 다 보이는데 흐리면 「잘렸나」로 읽힌다
     · 끝까지 굴리면 흐림이 꺼져야 한다(넘치는 창에서만 본다)
   ★ 사진으로 판정하지 않는다 — 흐림은 26px 그라디언트라 줄인 그림에서는 안 보인다
     (V-87 이 겪은 그 자리). 값으로 잰다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const A = process.argv.slice(2);
const OLD = A.includes("old");
const nums = A.filter((s) => /^\d+$/.test(s)).map(Number);
const SIZES = nums.length >= 2 ? [[nums[0], nums[1]]]
  : [[1512, 863], [1366, 700], [1280, 720], [1152, 648]];

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise((r) => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* 심는 몸 — 레벨이 낮으면 잠긴 칸뿐이라 자리가 안 바뀐다. look_shots 와 같은 한 벌. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* 흐림은 `::after` 라 자바스크립트로 자리를 못 잡는다 — **계산된 opacity** 를 읽는다.
   `.atEnd` 가 붙으면 0 이 되도록 CSS 가 짜여 있어(hud.css) 값 하나로 켜짐/꺼짐이 갈린다. */
const READ = `(() => {
  const w = document.getElementById("treeWrap"), c = document.getElementById("treeCols");
  if (!w || !c) return { err: "창이 없다" };
  const cb = c.getBoundingClientRect();
  let cut = null;
  for (const n of document.querySelectorAll("#treeCols .tNode")) {
    const b = n.getBoundingClientRect();
    if (b.bottom > cb.bottom + 0.5 && b.top < cb.bottom - 0.5) {
      const over = +(b.bottom - cb.bottom).toFixed(1);
      if (!cut || over > cut.over) cut = { n: (n.textContent || "").trim().split("\\n")[0].slice(0, 14), over };
    }
  }
  return { over: c.scrollHeight - c.clientHeight, top: c.scrollTop, cut,
           fade: +getComputedStyle(w, "::after").opacity,
           tS: getComputedStyle(c).getPropertyValue("--tS").trim(),
           open: document.getElementById("winTree").classList.contains("on") };
})()`;

const bad = []; const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1300);
  if (OLD) await ev(`window.__TREE_OLD = 1`);
  await ev(`window.__openWin("tree")`); await wait(500);
  const r = await ev(READ);
  if (!r || r.err || !r.open) { bad.push(`${W}x${H} 창이 안 열렸다 (${r && r.err})`); continue; }
  const need = r.over > 2;                       // 넘치면 켜져 있어야 한다
  const on = r.fade >= 0.9, off = r.fade <= 0.05;
  if (need && !on)  bad.push(`${W}x${H} 넘치는데(${r.over}px) 흐림이 꺼져 있다 — 잘린 칸 「${r.cut ? r.cut.n : "?"}」 ${r.cut ? r.cut.over : 0}px`);
  if (!need && !off) bad.push(`${W}x${H} 다 보이는데 흐림이 켜져 있다(${r.fade})`);
  /* 끝까지 굴리면 꺼져야 한다 — 넘치는 창에서만 볼 일이 있다. */
  let endFade = null;
  if (need) {
    await ev(`document.getElementById("treeCols").scrollTop = 99999`); await wait(250);
    const r2 = await ev(READ); endFade = r2 ? r2.fade : null;
    if (endFade > 0.05) bad.push(`${W}x${H} 끝까지 굴렸는데 흐림이 그대로다(${endFade})`);
    await ev(`document.getElementById("treeCols").scrollTop = 0`); await wait(150);
  }
  rows.push(`${String(W + "x" + H).padEnd(9)} 칸 ${String(r.tS).padEnd(5)} 넘침 ${String(r.over).padStart(3)}px  흐림 ${r.fade}${endFade !== null ? ` → 끝 ${endFade}` : ""}${r.cut ? `  잘림 「${r.cut.n}」 ${r.cut.over}px` : ""}`);
}
for (const l of rows) console.log(l);
if (errs.length) { console.log("errs", errs.slice(0, 3)); bad.push("페이지가 던졌다"); }
if (OLD) {
  console.log(bad.length ? `판정: 문 통과 — 옛 꼴에서 ${bad.length}곳이 운다` : "판정: ★문이 안 운다 — 자가 눈금이 아니다");
  for (const b of bad) console.log("  " + b);
  process.exit(bad.length ? 0 : 1);
}
console.log(bad.length ? "판정: 미달" : "판정: 통과 (넘치는 창에서만 흐림이 켜진다)");
for (const b of bad) console.log("  " + b);
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad.length ? 1 : 0);
