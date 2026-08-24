/* V-33 자 — **스킬트리 26칸의 그림이 정말 보이나.**
   병수님이 트리를 열면 보는 것은 「검은 네모 스물여섯」이다. hud.css:827 은
   「잠김 = 흑백으로 눌린다(**사라지진 않는다** — 앞날이 보여야 계획을 세운다)」라고
   적어 뒀는데, 원본을 오려 늘려 보니 **사라진다**. 적힌 뜻과 나온 그림이 어긋난 자리다.

   재는 법은 `tools/v33_pix.py` 에 있다 — **그림을 껐다 켜서 뺀 잉크**.
   아래 눈금을 같은 자로 둔다([[floor-far-from-threshold]]): 같은 사진 안의
   **찍은 칸(full/some)** 이 큰 값을 내야 자가 상수를 뱉는 게 아니다.

   node tools/v33_treedim.mjs            (고친 뒤)
   NOTREEDIM=1 node tools/v33_treedim.mjs (고치기 전 — 문을 닫아 옛 값으로 잰다)  */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NOTREEDIM === "1";
const fs = await import("node:fs");
const cp = await import("node:child_process");
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* `v27_panels` 와 **같은 세이브**(몇 시간 논 사람) — 다만 트리에 점을 박아
   **찍은 칸 · 찍을 수 있는 칸 · 잠긴 칸**이 한 사진에 다 들어오게 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }  /* legion 을 찍어 「닫힘(xlock)」 칸(소수 정예)까지 한 사진에 넣는다 */, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1440, 720], [1280, 620]];
const bad = [], rows = [];
let firstShots = null;

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  /* 문 — **고치기 전 값 셋을 그대로** 되돌린다. 잠김만 되돌리고 열림·닫힘을 두면
     사다리가 뒤섞여 「전」이 그 전이 아니게 된다(첫 판에 그 함정에 빠졌다). */
  if (OFF) await ev(`{const s=document.createElement("style");s.id="v33off";
     s.textContent=[
       '#winTree .tIco{opacity:.28!important;filter:grayscale(1) brightness(.72)!important}',
       '#winTree .tNode.open .tIco{opacity:.8!important;filter:grayscale(.35) brightness(.92)!important}',
       '#winTree .tNode.some .tIco,#winTree .tNode.full .tIco{opacity:1!important;filter:brightness(1.08)!important}',
       '#winTree .tNode.xlock .tIco{opacity:.16!important;filter:grayscale(1) brightness(.55)!important}'
     ].join("");
     document.head.appendChild(s);1}`);
  await ev(`window.__openWin && window.__openWin("tree")`); await wait(700);
  const on = await ev(`!!document.getElementById("winTree")?.classList.contains("on")`);
  if (!on) { bad.push(`${W}×${H}: 트리 창이 안 열렸다`); continue; }

  /* 칸마다 **그림 상자**(`.tIco`)의 자리와 상태를 받는다. */
  const nodes = await ev(`(()=>[...document.querySelectorAll("#treeCols .tNode")].map(n=>{
      const i=n.querySelector(".tIco"); if(!i) return null; const r=i.getBoundingClientRect();
      const st=["full","some","open","xlock"].find(c=>n.classList.contains(c))||"lock";
      return {id:n.dataset.tn, state:st, r:{x:r.x,y:r.y,w:r.width,h:r.height},
              nm:getComputedStyle(n.querySelector(".tn")).color,
              rank:!!n.querySelector(".tRank")};
    }).filter(Boolean))()`);
  const dpr = await ev(`window.devicePixelRatio`);
  const onPng = `tmp/v33_on_${W}.png`, offPng = `tmp/v33_off_${W}.png`;
  await shot(onPng);
  await ev(`{const s=document.createElement("style");s.id="v33hide";s.textContent=".tIco{visibility:hidden!important}";document.head.appendChild(s);1}`);
  await wait(200); await shot(offPng);
  await ev(`document.getElementById("v33hide")?.remove()`);

  const job = `tmp/v33_job_${W}.json`;
  fs.writeFileSync(job, JSON.stringify({ on: onPng, off: offPng, dpr, nodes }));
  const out = JSON.parse(cp.execFileSync("python3", ["tools/v33_pix.py", job], { encoding: "utf8" }));
  const by = {}; for (const o of out) (by[o.state] ||= []).push(o);
  const avg = (a, k) => a.length ? a.reduce((s, o) => s + (o[k] || 0), 0) / a.length : null;
  const g = {}; for (const k of ["full", "some", "open", "lock", "xlock"])
    g[k] = by[k] ? { n: by[k].length, ink: +avg(by[k], "ink").toFixed(1), top: +avg(by[k], "top").toFixed(1) } : null;
  rows.push({ size: `${W}×${H}`, g });

  /* ── 회귀: 그림 말고 다른 것이 안 움직였나 ── */
  const nmFull = nodes.find(n => n.state === "full"), nmLock = nodes.find(n => n.state === "lock");
  if (!nmFull || !nmLock) bad.push(`${W}×${H}: 찍은 칸/잠긴 칸이 둘 다 있어야 자가 선다`);
  if (nmFull && !nmFull.rank) bad.push(`${W}×${H}: 찍은 칸에 랭크 수가 없다`);
  if (nmFull && nmLock && nmFull.nm === nmLock.nm) bad.push(`${W}×${H}: 이름 글자색이 상태로 안 갈린다`);
  /* 눌러서 정말 그 칸이 골라지나([[probe-must-walk-the-real-path]]) */
  /* ★ 누르기 전에 **그 칸을 화면 안으로 굴린다.** 트리는 세로로 굴러가서, 낮은 창에서는
     잠긴 칸이 창 밖에 있다 — 안 굴리고 좌표를 쓰면 엉뚱한 칸이 눌린다(실제로 1280×620
     에서 `fury` 를 누르려다 `bone` 이 골라졌다). 굴린 **뒤에** 자리를 다시 읽는다. */
  const pickId = nodes.find(n => n.state === "lock")?.id;
  if (pickId) {
    await ev(`document.querySelector('[data-tn="${pickId}"]')?.scrollIntoView({block:"center"})`);
    await wait(350);
    const r = await ev(`(()=>{const e=document.querySelector('[data-tn="${pickId}"] .tIco').getBoundingClientRect();
                        return {x:e.x,y:e.y,w:e.width,h:e.height}})()`);
    await S("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    await wait(300);
    const sel = await ev(`document.querySelector("#treeCols .tNode.sel")?.dataset.tn`);
    if (sel !== pickId) bad.push(`${W}×${H}: 잠긴 칸을 눌러도 안 골라진다(${sel} ≠ ${pickId})`);
  }
  if (!firstShots) firstShots = onPng;
}

console.log(`${OFF ? "【문 닫음 — 옛 값】" : "【지금】"}  잉크 = 그림을 껐다 켜서 뺀 |ΔL| 평균 · top = 상위 10% 평균`);
console.log("창 크기      | 찍음(full)   | 조금(some)   | 열림(open)   | 잠김(lock)   | 닫힘(xlock)");
for (const r of rows) {
  const c = (k) => r.g[k] ? `${String(r.g[k].ink).padStart(5)}/${String(r.g[k].top).padStart(5)}` : "     ·     ";
  console.log(`${r.size.padEnd(12)} | ${c("full")}  | ${c("some")}  | ${c("open")}  | ${c("lock")}  | ${c("xlock")}`);
}
/* ── 판정 ── 잠긴 칸도 **보여야** 한다(hud.css:820 이 스스로 그렇게 적었다).
   ① 절대: 잠김 top ≥ 26 (제일 밝은 획이 바탕에서 이만큼은 떠야 획으로 읽힌다)
   ② 상대: 잠김 ink ≥ 찍은 칸 ink 의 30% (「눌렸으되 사라지진 않았다」의 뜻) */
const LO_TOP = 26, LO_REL = 0.30;
for (const r of rows) {
  const L = r.g.lock, F = r.g.full || r.g.some;
  if (!L || !F) continue;
  if (L.top < LO_TOP) bad.push(`${r.size}: 잠긴 칸 top ${L.top} < ${LO_TOP}`);
  if (L.ink < F.ink * LO_REL) bad.push(`${r.size}: 잠긴 칸 잉크 ${L.ink} < 찍은 칸 ${F.ink} 의 ${LO_REL * 100}%`);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 (잠긴 칸의 그림이 바탕에서 뜬다 · 회귀 넷 그대로)"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
