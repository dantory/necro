/* V-125 그림 — **같은 사람 · 같은 순간**에 `__TACFX_OLD` 문만 여닫아 나란히 찍는다.
   왼쪽이 옛 결(「폭발 시체 20% 이상 · 저주 군세가 상한일 때」), 오른쪽이 지금.
   운용 창만 오려 두 장을 옆으로 잇는다 — 전체 화면을 두 장 보내면 정작 볼 곳이 작아진다. */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const WHICH = process.argv[2] || "gate";
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL }); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=46;M.gold=999999;M.deepest=34;M.best=34;
  M.up={hp:12,mp:9,dmg:14,army:6};M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,weaken:1,decrep:1,rot:4,wand:6};
  C.syncSkills&&C.syncSkills();C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
const shots = [];
for (const old of [1, 0]) {
  const box = await ev(`(()=>{globalThis.__TACFX_OLD=${old};
    [...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin('tactic');
    const g=document.querySelector('#tacGrid [data-tac="${WHICH}"]'); g.click();
    const fr=document.querySelector('#winTactic .frame').getBoundingClientRect();
    return {x:Math.round(fr.x),y:Math.round(fr.y),width:Math.round(fr.width),height:Math.round(fr.height)}})()`);
  await wait(180);
  const s = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 2 } });
  const f = `tmp/v125_${old ? "old" : "new"}.png`; fs.writeFileSync(f, Buffer.from(s.data, "base64")); shots.push(f);
}
await raw("Target.closeTarget", { targetId });
console.log(shots.join(" "));
process.exit(0);
