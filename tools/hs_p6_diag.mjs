/* 진단 자 — runFloor 의 evaluate 가 왜 타임아웃하나. 입력을 흉내내며 프레임 예외와
   eval 왕복 시간을 잰다. node tools/hs_p6_diag.mjs */
import { CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?").slice(0, 200)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: URL });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const key = (k, down) => S("Input.dispatchKeyEvent", { type: down ? "keyDown" : "keyUp", key: k, code: "Key" + k.toUpperCase(), windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: k.toUpperCase().charCodeAt(0) });
const mouse = (x, y, type, btn) => S("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, buttons: btn });

for (let i = 0; i < 20 && !(await ev("!!(window.G&&G.player&&G.floor)")); i++) await wait(300);
console.log("boot:", await ev("!!(window.G&&G.player)"), "floor", await ev("G.floor"));
await ev("window.__t=function(){const p=G.player;let n=0;for(const pk of G.packs){if(!pk.awake)continue;for(const e of pk.enemies)if(e.alive)n++;}return JSON.stringify({x:Math.round(p.x),y:Math.round(p.y),awake:n,sp:G.spears.length,pt:G.parts.length});};true");
const MODE = process.argv[2] || "hold";
console.log("mode:", MODE);
if (MODE === "standwake") {
  await ev(`(()=>{const p=G.player;let b=null,bd=1e18;for(const pk of G.packs){const d=(pk.x-p.x)**2+(pk.y-p.y)**2;if(d<bd){bd=d;b=pk;}}p.x=b.x;p.y=b.y-40;cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ,p.x-innerWidth/(2*HSZ)));cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ,p.y-innerHeight/(2*HSZ)));})();true`);
  for (let i = 0; i < 20; i++) {
    const t = Date.now(); let r; try { r = await ev("window.__t()"); } catch (e) { r = "ERR " + e.message; }
    if (i % 2 === 0) console.log(`stand ${i}: ${Date.now() - t}ms  ${r}`);
    await wait(160);
  }
  await S("Target.closeTarget", { targetId }); process.exit(0);
}
if (MODE === "domdrive") {
  await ev(`window.__cur=new Set(); window.__ptaps=[]; window.__md=false;
    window.__act=function(hold,tap,fx,fy,fire){ const cv=document.getElementById('board');
      for(const k of window.__ptaps) window.dispatchEvent(new KeyboardEvent('keyup',{key:k})); window.__ptaps=[];
      const want=new Set(hold);
      for(const k of [...window.__cur]) if(!want.has(k)){ window.dispatchEvent(new KeyboardEvent('keyup',{key:k})); window.__cur.delete(k); }
      for(const k of want) if(!window.__cur.has(k)){ window.dispatchEvent(new KeyboardEvent('keydown',{key:k})); window.__cur.add(k); }
      for(const k of (tap||[])){ window.dispatchEvent(new KeyboardEvent('keydown',{key:k})); window.__ptaps.push(k); }
      if(fire){ cv.dispatchEvent(new MouseEvent('mousemove',{clientX:fx,clientY:fy,bubbles:true}));
        if(!window.__md){ cv.dispatchEvent(new MouseEvent('mousedown',{button:0,buttons:1,clientX:fx,clientY:fy,bubbles:true})); window.__md=true; } }
      else if(window.__md){ window.dispatchEvent(new MouseEvent('mouseup',{button:0,clientX:fx||0,clientY:fy||0,bubbles:true})); window.__md=false; }
      return window.__t(); };
    true`);
  const x0 = JSON.parse(await ev("window.__t()")).x;
  let maxL = 0;
  for (let i = 0; i < 20; i++) {
    const t = Date.now(); let r; try { r = await ev(`window.__act(['d'],[],760,400,true)`); } catch (e) { r = "ERR " + e.message; }
    const l = Date.now() - t; maxL = Math.max(maxL, l);
    if (i % 4 === 0) console.log(`dom ${i}: ${l}ms  ${r}`);
    await wait(400);
  }
  await ev(`window.__act([],[],0,0,false)`);
  const x1 = JSON.parse(await ev("window.__t()")).x;
  console.log(`최대 eval ${maxL}ms · 걸은 x ${x0}→${x1} (Δ${x1 - x0})`);
  await S("Target.closeTarget", { targetId }); process.exit(0);
}
if (MODE === "pulse") {
  let maxL = 0;
  for (let i = 0; i < 24; i++) {
    await key("d", false);                      // eval 전에 키를 뗀다
    const t = Date.now(); let r; try { r = await ev("window.__t()"); } catch (e) { r = "ERR " + e.message; }
    const l = Date.now() - t; maxL = Math.max(maxL, l);
    await key("d", true);                        // 버스트 동안 다시 누른다(그 사이 eval 없음)
    if (i % 4 === 0) console.log(`pulse ${i}: ${l}ms  ${r}`);
    await wait(300);
  }
  await key("d", false);
  console.log("최대 eval:", maxL, "ms");
  await S("Target.closeTarget", { targetId }); process.exit(0);
}
if (MODE === "movecheck") {
  await ev(`window.__ft=[];(function s(t){if(window.__lt)window.__ft.push(t-window.__lt);window.__lt=t;requestAnimationFrame(s);})(performance.now());true`);
  await wait(600);
  await key("d", true);                       // 4초 동안 evaluate 없이 그냥 걷게 둔다
  await wait(4000);
  await key("d", false);
  const stat = await ev(`(()=>{const a=window.__ft.slice().sort((x,y)=>x-y);const p=q=>a.length?a[Math.floor(a.length*q)]:0;let aw=0;for(const pk of G.packs){if(!pk.awake)continue;for(const e of pk.enemies)if(e.alive)aw++;}return JSON.stringify({frames:a.length,p50:Math.round(p(0.5)),p95:Math.round(p(0.95)),max:Math.round(a[a.length-1]||0),awake:aw,sp:G.spears.length,minions:G.minions.length});})()`);
  console.log("4초 걷기 프레임:", stat);
  await S("Target.closeTarget", { targetId }); process.exit(0);
}
await key("d", true);
if (MODE !== "keyonly") await mouse(760, 400, "mousePressed", 1);
let maxL = 0;
for (let i = 0; i < 30; i++) {
  const t = Date.now();
  let r; try { r = await ev("window.__t()"); } catch (e) { r = "ERR " + e.message; }
  const l = Date.now() - t; maxL = Math.max(maxL, l);
  if (MODE === "hold") await mouse(760, 400, "mouseMoved", 1);
  else if (MODE === "tap") { await mouse(760, 400, "mousePressed", 1); await mouse(760, 400, "mouseReleased", 0); }
  if (i % 3 === 0) console.log(`tick ${i}: ${l}ms  ${r}  예외누적 ${errs.length}`);
  await wait(110);
}
await key("d", false); if (MODE !== "keyonly") await mouse(760, 400, "mouseReleased", 0);
console.log("최대 eval 왕복:", maxL, "ms · 예외 총", errs.length);
console.log("예외 표본:", errs.slice(0, 6));
await S("Target.closeTarget", { targetId });
process.exit(0);
