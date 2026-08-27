/* V-128 — **빈손으로 돌아온 사람의 정산 창이 낮은 화면에서 세로로 넘치는가.**
   V-100b 가 적어 둔 것(1280×620 에서 330>292)을 **판정을 내는 자**로 세운다. V-100 의
   자(`v100_firstend`)는 좌판 «밀림»만 판정하고 넘침은 「곁들여 본 것」으로만 적었다 —
   그래서 이 결함은 자가 있어도 **아무도 안 울었다**. 한 자에 한 물음이라 자를 따로 둔다.
   ★ 판을 **한 번만** 돌리고 화면 크기만 갈아 끼운다 — 크기마다 새로 돌리면 판이 갈려
     (같은 씨앗도 같은 판이 아니다 [[same-seed-is-not-same-run]]) 수를 견줄 수 없다.
   ★ **자가 스스로 지는 겹** — 문(`body.v100bold`)으로 옛 결(두 줄 × 두 칸)을 세워
     1280×620 에서 **울지 않으면 그때도 진다**([[silent-zero-is-not-an-observation]]).
   node tools/v128_endfit.mjs [--shot]        (tmp/v128_cmp_old.png · _new.png) */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SHOT = process.argv.includes("--shot");
const SIZES = [[1280, 620], [1152, 648], [1366, 700], [1512, 863]];
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const metrics = (w, h) => S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
/* 처음 켠 사람 그대로 — 아무것도 안 심는다. */
await metrics(1512, 863);
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`window.__toDungeon(); window.__S.speed = 8; 1`); await wait(6000);
await ev(`window.__die(); 1`); await wait(600);
/* ★ **빈손을 심는다** — 이 창의 빈손 결은 「한 판 돌렸는데 아무것도 못 건졌다」이고,
   첫 판은 8초 만에 끝나며 하나쯤 건지는 일이 잦다. 판을 다시 돌리는 대신 **좌판만
   비운다** — 층·잡은 수·금·경험치·자취 넉 장은 전부 방금 그 판이 남긴 진짜 수다. */
const redraw = `(()=>{window.__LASTRUN.loot=[];window.__openWin("end");return !!document.querySelector('#winEnd .eEmpty');})()`;
/* 창이 제 그릇 안에 드는가 — 두루마리 막대가 서는 그 자리를 그대로 읽는다. */
const FIT = `(()=>{const f=document.querySelector('#winEnd .frame');
  if(!f) return {err:"창이 없다"};
  const cs=[...document.querySelectorAll('#winEnd .cell.run')];
  const foot=document.querySelector('#winEnd .winFoot');
  const fb=f.getBoundingClientRect(), tb=foot?foot.getBoundingClientRect():null;
  return {need:f.scrollHeight, have:f.clientHeight, over:Math.max(0,f.scrollHeight-f.clientHeight),
    rows:new Set(cs.map(c=>Math.round(c.getBoundingClientRect().top))).size, cells:cs.length,
    /* 넘치면 **밑자락(가진 금 · 마을로)이 잘린다** — 두루마리를 굴리기 전에는 안 보인다. */
    footCut: tb ? Math.max(0, Math.round(tb.bottom - fb.bottom)) : -1};})()`;
const rows = [];
for (const [w, h] of SIZES) {
  await metrics(w, h); await wait(250);
  const empty = await ev(redraw); await wait(250);
  const r = await ev(FIT);
  rows.push({ w, h, empty, ...r });
  console.log(`  ${w}×${h}  속 ${r.need} / 자리 ${r.have}` + (r.over ? `  ↕넘침 ${r.over}px` : "  안 넘침")
    + `  · 자취 ${r.rows}줄 × ${r.cells}칸` + (r.footCut > 0 ? `  · 밑자락 잘림 ${r.footCut}px` : "") + (empty ? "" : "  ★빈손 결이 안 섰다"));
  if (SHOT && w === 1280) { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v128_cmp_new.png", Buffer.from(data, "base64")); }
}
/* ★ 보정 — 문으로 옛 결을 세우면 **울어야 한다.** 안 울면 이 자는 그 결함을 못 잡는 자다. */
await metrics(1280, 620); await wait(200);
await ev(`document.body.classList.add("v100bold"); 1`); await ev(redraw); await wait(300);
const old = await ev(FIT);
if (SHOT) { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v128_cmp_old.png", Buffer.from(data, "base64")); }
await ev(`document.body.classList.remove("v100bold"); 1`);
console.log(`  옛 결(문 v100bold · 1280×620)  속 ${old.need} / 자리 ${old.have}  ↕넘침 ${old.over}px`
  + `  · 자취 ${old.rows}줄 × ${old.cells}칸` + (old.footCut > 0 ? `  · 밑자락 잘림 ${old.footCut}px` : ""));
console.log("예외: " + (errs.length ? errs.join(" | ") : "없음"));
const over = rows.filter(r => r.over > 0);
const noEmpty = rows.filter(r => !r.empty);
const blind = old.over > 0 ? 0 : 1;                 // 보정에서 안 울면 자가 진 것이다
const fail = over.length + noEmpty.length + blind;
if (blind) console.log("  ★ 이 자는 옛 결을 못 잡는다 — 아래 「0」은 관찰이 아니다");
console.log(fail ? `판정: 미달 ${fail} (넘침 ${over.length} · 빈손 결 못 섬 ${noEmpty.length} · 보정 ${blind})`
                 : `판정: 통과 — 화면 ${rows.length} 전부 안 넘침(보정 ${old.over}px 로 울었다)`);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(fail ? 1 : 0);
