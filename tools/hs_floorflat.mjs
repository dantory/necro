/* hs/ 바닥이 «밋밋»한지 재는 컷 (V-176)
 *
 *   node tools/hs_floorflat.mjs [태그]
 *     → tmp/hs_floor_<태그>.png      가장 넓은 방 한가운데의 바닥(소품·몹 없음)
 *     → tmp/hs_floor_<태그>.json     그 방의 얼룩 목록 + 방 넓이
 *
 * 왜 따로 만드나 — V-175 가 얼룩 색을 바닥에 맞추자 이번엔 «거의 안 보인다».
 * 얼룩이 있는 까닭은 32px 격자를 끊는 것인데(map.js scatter 머리글) 지금은 못 끊는다.
 * 밝기는 이미 띠 안이므로(V-175) 건드리지 않고 «덮는 넓이»만 잰다 — 그러려면
 * 사람·소품이 안 가린 순수 바닥 컷이 있어야 한다. ★ [[probe-must-walk-the-real-path]]
 * 는 지름길을 금하지만, 여기서 재는 것은 「바닥이 어떻게 보이는가」 하나뿐이라
 * 실제 렌더 경로(main.js 의 floorBase→tile→decal→floorTint)를 그대로 지난다.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const TAG = process.argv[2] || "now";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const HARD = setTimeout(() => { log("WATCHDOG 90s — 강제 종료"); process.exit(9); }, 90000);
const VW = 1512, VH = 863;

await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const INJECT = `(()=>{ let s=1337>>>0; Math.random=function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s);
  t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; })();`;

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
await S("Page.navigate", { url: URL });
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
for (let i = 0; i < 24; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
await wait(600);

// 가장 넓은 방으로 카메라를 옮기고 **가리는 것을 전부 치운다** — 몹·소환수·소품·상자.
// 소품을 치우는 까닭: 재려는 것이 「바닥 무늬」 하나라서, 기둥·화로가 든 픽셀이
// 표준편차를 통째로 뒤흔든다(그 큰 수에 밀려 얼룩 차이가 안 보인다).
const SETUP = `window.__floor=function(){
  let br=G.rooms[0],a=0; for(const r of G.rooms){const ar=r.w*r.h; if(ar>a){a=ar;br=r;}}
  const cx=br.x+br.w/2, cy=br.y+br.h/2;
  G.packs=[]; G.minions=[]; G.props=[]; G.chests=[];
  // ★ 빛은 «주인공을 중심으로» 깔린다(main.js drawLight). 주인공을 화면 밖으로 치우면
  //   방 전체가 캄캄해져 자가 near-black 을 잰다(첫 판이 평균L 6.6 이었다).
  //   그래서 주인공은 방 한가운데 그대로 두고 **키만 0 으로 줄여** 안 보이게 한다.
  G.player.x=cx; G.player.y=cy; G.player.h=0.001;
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, cx-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, cy-innerHeight/(2*HSZ)));
  const inside=(G.decals||[]).filter(d=>d.x>=br.x&&d.x<=br.x+br.w&&d.y>=br.y&&d.y<=br.y+br.h);
  return { room:{x:br.x,y:br.y,w:br.w,h:br.h}, area:br.w*br.h, HSZ,
           cam:{x:cam.x,y:cam.y}, vw:innerWidth, vh:innerHeight,
           n:inside.length, decals:inside.map(d=>({img:d.img,s:d.s,a:d.a,x:d.x,y:d.y})) }; };`;
await ev(SETUP);
const info = JSON.parse(await ev("JSON.stringify(__floor())"));
await wait(900);
const s = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(`tmp/hs_floor_${TAG}.png`, Buffer.from(s.data, "base64"));
fs.writeFileSync(`tmp/hs_floor_${TAG}.json`, JSON.stringify(info, null, 1));
log(`  ▸ tmp/hs_floor_${TAG}.png · .json   방넓이 ${info.area} · 방 안 얼룩 ${info.n}개`);
clearTimeout(HARD);
process.exit(0);
