/* hs/ V-202 컷 — BSP 로 갈아엎은 층이 «눈으로도» 구조가 읽히나.
 *   tmp/hs_v202_map_<seed>.png   씨앗 셋의 층 전체 조감도(방=밝은 사각형·복도=선·시작=●·계단=◆)
 *   tmp/hs_v202_ingame1.png      큰 홀 안에서 본 게임 화면
 *   tmp/hs_v202_ingame2.png      복도를 지나며 본 게임 화면
 * ★ 조감도는 게임이 실제로 만든 G.rooms/corridors 를 그대로 그려 «만든 것과 컷이 같음»을 보장한다.
 *   찍은 뒤 Read 로 열어 「갈래가 있는가 · 큰 홀과 골방이 갈리는가」를 사람이 판정한다
 *   ([[play-it-before-measuring-it]]).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEEDS = [1337, 4242, 9001];
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WD"); process.exit(9); }, 180000);

await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("to " + m)); }, 40000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seedSrc = (seed) => `Math.random=(()=>{let s=(${seed}>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`;

async function boot(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let ok = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G&&G.player&&window.HSZ&&document.getElementById('loading').style.display==='none')`)) { ok = true; break; } }
  return { targetId, S, ev, ok };
}
const shot = async (S, out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸ " + out); };

const MINIMAP = (seed) => `(()=>{
  const c=document.createElement('canvas');c.width=${VW};c.height=${VH};
  c.style.cssText='position:fixed;left:0;top:0;z-index:99999';document.body.appendChild(c);
  const x=c.getContext('2d');const P=40;
  x.fillStyle='#0d0708';x.fillRect(0,0,${VW},${VH});
  const sc=Math.min((${VW}-P*2)/G.W,(${VH}-P*2)/G.H);
  const ox=(${VW}-G.W*sc)/2, oy=(${VH}-G.H*sc)/2;
  const TX=p=>ox+p*sc, TY=p=>oy+p*sc;
  x.fillStyle='rgba(118,94,58,0.6)';
  for(const co of G.corridors)x.fillRect(TX(co.x),TY(co.y),co.w*sc,co.h*sc);
  for(const r of G.rooms){x.fillStyle='rgba(150,120,70,0.9)';x.fillRect(TX(r.x),TY(r.y),r.w*sc,r.h*sc);
    x.strokeStyle='#d8b45a';x.lineWidth=1;x.strokeRect(TX(r.x),TY(r.y),r.w*sc,r.h*sc);}
  x.fillStyle='#5ad07a';x.beginPath();x.arc(TX(G.startX),TY(G.startY),7,0,6.2832);x.fill();
  const sx=TX(G.stairs.x),sy=TY(G.stairs.y);x.fillStyle='#e0c060';x.beginPath();
  x.moveTo(sx,sy-9);x.lineTo(sx+9,sy);x.lineTo(sx,sy+9);x.lineTo(sx-9,sy);x.closePath();x.fill();
  x.fillStyle='#d8c8b0';x.font='16px serif';
  x.fillText('floor '+G.floor+'  ·  rooms '+G.rooms.length+'  ·  corridors '+G.corridors.length+'  ·  seed ${seed}',16,26);
  return G.rooms.length;})()`;

// 자리 세우기(컷용) — 걸을 수 있는 자리로 살짝 빼내고 카메라를 맞춘다.
const place = (x, y) => `(()=>{const p=G.player,Z=window.HSZ;p.x=${x};p.y=${y};p.state='idle';
  if(window.__walkable&&!window.__walkable(p.x,p.y)){for(let s=6;s<=160;s+=6)for(let a=0;a<12;a++){const an=a/12*6.2832,nx=p.x+Math.cos(an)*s,ny=p.y+Math.sin(an)*s;if(window.__walkable(nx,ny)){p.x=nx;p.y=ny;s=999;break;}}}
  cam.x=Math.max(0,Math.min(G.W-innerWidth/Z,p.x-innerWidth/(2*Z)));cam.y=Math.max(0,Math.min(G.H-innerHeight/Z,p.y-innerHeight/(2*Z)));return 1;})()`;

// ① 조감도 셋
for (const seed of SEEDS) {
  const b = await boot(seed);
  if (!b.ok) { log(`  씨앗 ${seed} 부팅 실패`); await raw("Target.closeTarget", { targetId: b.targetId }).catch(() => {}); continue; }
  await sleep(300);
  const n = await b.ev(MINIMAP(seed));
  await sleep(150);
  await shot(b.S, `tmp/hs_v202_map_${seed}.png`);
  log(`    씨앗 ${seed}: 방 ${n}`);
  await raw("Target.closeTarget", { targetId: b.targetId }).catch(() => {});
}

// ② 게임 화면 둘 — 씨앗 1337: 가장 큰 방 안 / 긴 복도 위
{
  const b = await boot(SEEDS[0]);
  if (b.ok) {
    await sleep(400);
    const big = JSON.parse(await b.ev(`(()=>{let r=G.rooms[0],a=0;for(const q of G.rooms){const qa=q.w*q.h;if(qa>a){a=qa;r=q;}}return JSON.stringify({x:Math.round(r.cx),y:Math.round(r.cy)});})()`));
    await b.ev(place(big.x, big.y)); await sleep(250); await shot(b.S, "tmp/hs_v202_ingame1.png");
    const cor = JSON.parse(await b.ev(`(()=>{let c=G.corridors[0],l=0;for(const q of G.corridors){const ql=Math.max(q.w,q.h);if(ql>l){l=ql;c=q;}}return JSON.stringify({x:Math.round(c.x+c.w/2),y:Math.round(c.y+c.h/2)});})()`));
    await b.ev(place(cor.x, cor.y)); await sleep(250); await shot(b.S, "tmp/hs_v202_ingame2.png");
    await raw("Target.closeTarget", { targetId: b.targetId }).catch(() => {});
  }
}

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close(); process.exit(0);
