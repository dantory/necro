/* V-55 자 — **스킬트리가 «한 칸에 세 갈래»를 세로로 담는데, 갈래 길이가 제각각이다.**
   세 갈래(군세 8 · 시체 8 · 주술 10)가 **한 스크롤 상자** 안에 나란히 서 있어서,
   제일 긴 갈래가 넘치는 동안 짧은 갈래 **아래는 텅 빈다.** 사람이 보는 것은
   「밑이 잘린 주술 + 빈 공간 두 칸」이다.

   재는 것(창 크기 셋 · 그리는 자리의 네모를 그대로 읽는다):
     · 갈래마다 마지막 칸이 접힌 자리(fold) 아래인가 = **안 보이는 칸 수**
     · 갈래마다 마지막 칸 아래로 남는 **빈 자리**(px) — 짧은 갈래가 버리는 높이
     · 접힌 자리 아래에 있는 **잉크 넓이의 몫**
   node tools/v55_treefold.mjs   (문 없이 · 지금 그대로) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev2 => { const m = JSON.parse(ev2.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1512, 800], [1366, 768], [1366, 700], [1440, 660], [1280, 620]];
const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`window.__openWin && window.__openWin("tree")`); await wait(700);
  if (!await ev(`!!document.getElementById("winTree")?.classList.contains("on")`)) { rows.push([`${W}×${H}`, "창이 안 열렸다"]); continue; }
  const r = await ev(`(()=>{const box=document.getElementById("treeCols");
    const br=box.getBoundingClientRect();
    const cols=[...box.querySelectorAll(".tCol")].map(c=>{
      const ns=[...c.querySelectorAll(".tNode")];
      const rs=ns.map(n=>n.getBoundingClientRect());
      const last=rs.length?Math.max(...rs.map(x=>x.bottom)):br.top;
      const lbl=[...c.querySelectorAll(".tn")].map(x=>x.getBoundingClientRect());
      const lastLbl=lbl.length?Math.max(...lbl.map(x=>x.bottom)):last;
      return {k:c.dataset.k, n:ns.length,
        below:rs.filter(x=>x.bottom>br.bottom+.5).length,             // 접힌 자리 아래로 걸친 칸
        lblCut:lbl.filter(x=>x.bottom>br.bottom+.5&&x.top<br.bottom-.5).length, // 글자가 반쯤 잘린 칸
        slack:Math.round(br.bottom-Math.max(last,lastLbl))};          // 갈래 아래 남는 빈 자리
    });
    return {h:Math.round(br.height), scroll:Math.round(box.scrollHeight), cols,
            tS:getComputedStyle(box).getPropertyValue("--tS").trim()||"(없음)",
            ico:Math.round(parseFloat(getComputedStyle(box.querySelector(".tIco")).width))};
  })()`);
  const slackSum = r.cols.reduce((a, c) => a + Math.max(0, c.slack), 0);
  rows.push([`${W}×${H}`, `상자 ${r.h} · 속 ${r.scroll} · 넘침 ${Math.max(0, r.scroll - r.h)} · 칸 ${r.tS} · 그림 ${r.ico}px`,
    ...r.cols.map(c => `${c.k} ${c.n}칸 · 접힌 아래 ${c.below} · 글자잘림 ${c.lblCut} · 빈자리 ${c.slack}px`),
    `버린 빈자리 합 ${slackSum}px (상자 높이의 ${(100 * slackSum / (r.h * 3)).toFixed(0)}%)`]);
  await shot(`tmp/v55_tree_${W}x${H}${process.env.V55TAG||""}.png`);
}
for (const r of rows) { console.log("── " + r[0]); for (const l of r.slice(1)) console.log("   " + l); }
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
