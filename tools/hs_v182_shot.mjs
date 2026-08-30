/* V-182 — 창 두 장을 남긴다(V-181 shot 뼈대: CDP 9333 + 8774/hs).
     · tmp/v182_inv.png     — I 로 연 격자에 물건 여러 개 + 착용 칸이 찬 상태
     · tmp/v182_compare.png — SHIFT 로 같은 슬롯 물건을 나란히(차이 초록/빨강)
   더해서 재는 것: 툴팁 둘이 떠 있나 · 창이 열린 동안 좌클릭이 «공격으로 새지» 않나 · 콘솔 오류 0.
     node tools/hs_v182_shot.mjs */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG 120s"); process.exit(9); }, 120000);
const VW = 1512, VH = 863;

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?"));
  if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "assert")) errs.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" ")); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL });
for (let i = 0; i < 30; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
await wait(600);

/* 조용한 바닥 + 가방/착용을 손으로 채운다(연출용 물건). 착용은 창을 통해서만 바꾸므로
   여기선 그림을 위해 직접 놓되, recalc 을 한 번 지나 HUD 도 맞춘다. */
await ev(`(() => {
  const G = window.G, p = G.player;
  G.packs = []; G.golds = []; G.parts = []; G.floats = []; G.spears = []; G.items = [];
  const R = { white:{color:'#e6e0d0',key:'white',name:'평범'}, blue:{color:'#6fa8ff',key:'blue',name:'매직'},
              yellow:{color:'#e8cf52',key:'yellow',name:'레어'}, gold:{color:'#d8934a',key:'gold',name:'유니크'} };
  const mk = (name, slot, rk, af) => ({ name, slot, rarity: R[rk], unique: null, affixes: af });
  p.equipped = {
    weapon: mk('Grim Reaver of Fury','weapon','yellow',[{key:'dmg',label:'피해 +12%',value:12},{key:'atkSpeed',label:'공격 속도 +5%',value:5}]),
    armor:  mk('Iron Vestment of the Dead','armor','blue',[{key:'maxHp',label:'최대 생명 +60',value:60}]),
    helm:   mk('Bone Cowl of Ruin','helm','white',[]),
  };
  p.bag = [
    mk('Savage Cleaver of the Grave','weapon','gold',[{key:'dmg',label:'피해 +18%',value:18},{key:'atkSpeed',label:'공격 속도 +9%',value:9},{key:'maxHp',label:'최대 생명 +40',value:40}]),
    mk('Plague Mail of Blight','armor','yellow',[{key:'maxHp',label:'최대 생명 +95',value:95},{key:'minionDmg',label:'소환수 피해 +14%',value:14}]),
    mk('Dread Visage of King','helm','blue',[{key:'novaRadius',label:'시체 폭발 범위 +8%',value:8}]),
    mk('Corpse Grip of the Void','gloves','blue',[{key:'atkSpeed',label:'공격 속도 +7%',value:7}]),
    mk('Wraith Greaves of Marrow','boots','white',[]),
    mk('Iron Signet of Skill','ring','yellow',[{key:'gold',label:'금 획득 +22%',value:22}]),
    mk('Locket of the Legion','amulet','gold',[{key:'minionDmg',label:'소환수 피해 +26%',value:26},{key:'maxHp',label:'최대 생명 +70',value:70}]),
    mk('Hollow Fang of Gore','weapon','white',[]),
  ];
  return true;
})()`);

/* I 로 연다(키를 얹었다 뗀다 — 한 프레임 이상 눌린 상태로 handleSkills 가 토글하게). */
async function press(key, ms = 220) {
  await S("Input.dispatchKeyEvent", { type: "keyDown", key, code: "Key" + key.toUpperCase() });
  await wait(ms);
  await S("Input.dispatchKeyEvent", { type: "keyUp", key, code: "Key" + key.toUpperCase() });
}
await press("i");
await wait(400);

const invOn = await ev(`document.getElementById('inv').classList.contains('on')`);
const counts = JSON.parse(await ev(`JSON.stringify({
  bagCells: document.querySelectorAll('#baggrid .icell').length,
  dollFilled: document.querySelectorAll('#paperdoll .dollcell .icell').length })`));
log(`창 열림=${invOn} · 격자 물건 ${counts.bagCells}칸 · 착용 칸 찬 것 ${counts.dollFilled}`);

let shot = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/v182_inv.png", Buffer.from(shot.data, "base64"));
log("saved tmp/v182_inv.png");

/* 좌클릭이 «공격으로 새는지» — 창이 열린 채 board 에 mousedown. spears 가 안 늘어야 한다. */
const spears0 = await ev(`window.G.spears.length`);
await S("Input.dispatchMouseEvent", { type: "mousePressed", x: 300, y: 700, button: "left", clickCount: 1, buttons: 1 });
await wait(500);
await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: 300, y: 700, button: "left", clickCount: 1, buttons: 0 });
const spears1 = await ev(`window.G.spears.length`);
const noLeak = spears1 === 0;
log(`좌클릭 샘 검사 — spears ${spears0}→${spears1} (창 열림 중 공격 ${noLeak ? "안 샘 ✓" : "샜다 ✗"})`);

/* SHIFT 비교 — 첫 격자 칸(무기)에 마우스를 얹고 SHIFT 를 눌러 툴팁 둘을 나란히. */
await ev(`(() => {
  const c = document.querySelector('#baggrid .icell');
  const b = c.getBoundingClientRect();
  c.dispatchEvent(new MouseEvent('mouseenter', { bubbles:true, clientX:b.left+8, clientY:b.top+8 }));
  return true;
})()`);
await S("Input.dispatchKeyEvent", { type: "keyDown", key: "Shift", code: "ShiftLeft" });
await wait(400);

const tips = JSON.parse(await ev(`(() => {
  const t1 = document.getElementById('tooltip'), t2 = document.getElementById('tooltip2');
  const up = document.querySelectorAll('#tooltip .tipdiff.up').length;
  const dn = document.querySelectorAll('#tooltip .tipdiff.down').length;
  return JSON.stringify({ t1: getComputedStyle(t1).display, t2: getComputedStyle(t2).display,
    t1w: t1.offsetWidth, t2w: t2.offsetWidth, up, dn,
    t1txt: t1.textContent.replace(/\\s+/g,' ').slice(0,60) });
})()`));
log(`비교 툴팁 — 왼 display=${tips.t1}(${tips.t1w}) 오 display=${tips.t2}(${tips.t2w}) · 차이 초록 ${tips.up}·빨강 ${tips.dn}`);

shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("tmp/v182_compare.png", Buffer.from(shot.data, "base64"));
log("saved tmp/v182_compare.png");
await S("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft" });

const twoTips = tips.t1 === "block" && tips.t2 === "block" && tips.t1w > 0 && tips.t2w > 0;
const diffShown = tips.up + tips.dn > 0;
log(errs.length ? "콘솔 오류:\n  " + errs.slice(0, 6).join("\n  ") : "콘솔 오류 0");
const ok = invOn && counts.bagCells >= 3 && counts.dollFilled >= 2 && noLeak && twoTips && diffShown && !errs.length;
log(ok ? "\n✓ 창·착용·비교·좌클릭 가드·콘솔0 전부 통과" : "\n✗ 실패 — 위 값 확인");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(ok ? 0 : 1);
