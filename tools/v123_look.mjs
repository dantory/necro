/* V-123 탐색 — **켜서 본다.** V-121·V-122 가 「사는 것을 정하는 창」의 수를 고쳤으니,
   이번엔 **되돌릴 수 없는 것을 정하는 창** — 스킬 트리다. 점을 한 번 넣으면 초기화
   말고는 못 빼므로, 틀린 수는 그대로 «망친 빌드»가 된다([[play-it-before-measuring-it]]). */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v123_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

/* 오래 논 사람 — 세 줄기를 다 조금씩 팠고 갈래도 하나 골랐다(정예). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;
  M.up={hp:12,mp:9,dmg:14,army:6};
  M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,fury:2,
          rot:4,harvest:3, wand:6,swift:4,weaken:1,deep:1};
  C.syncSkills&&C.syncSkills();C.saveMeta();return C.spLeft()+'/'+C.spTotal()})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("씨앗 · 남은점/전체", await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2600);

/* 창을 연다 — 열렸는지 **자가 스스로 확인**한다(V-120 에서 배운 자리: __openWin 은 토글이다) */
const r0 = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin("tree");
  const w=document.getElementById("winTree");
  if(!w||!w.classList.contains('on')) throw new Error('창이 안 섰다: winTree');
  return 'ok'})()`);
console.log("트리", r0); await wait(700); await shot("tree_open");

const pick = async (nid) => {
  const info = await ev(`(()=>{const q=()=>document.querySelector('[data-tn=${JSON.stringify(nid)}]');
    const c=q(); if(!c) return 'no cell'; c.click();
    /* ★ 누르면 drawTree 가 격자를 통째로 다시 그린다 — 잡아 둔 칸은 **떨어져 나간다**
       (V-122 상인 창에서 열 칸이 다 같은 수를 낸 그 자리). 그러니 **다시 찾아** 확인한다. */
    if(!q()?.classList.contains('sel')) throw new Error('안 골렸다: ${nid}');
    const t=document.getElementById('treeTip');
    return t? t.innerText.replace(/\\n/g,' | ') : 'no tip';})()`);
  await wait(250);
  console.log("  " + nid.padEnd(8) + " → " + info);
};
for (const n of ["bone", "elite", "swift", "cheap", "marrow", "deep", "harvest", "wand", "ghoul"]) await pick(n);
await shot("tree_bone");
await S("Target.closeTarget", { targetId });
process.exit(0);
