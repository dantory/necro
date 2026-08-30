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

/* 조용한 바닥 + 가방/착용을 **실제 loot.js 로 굴려** 채운다(V-182b).
   앞판은 손으로 지은 물건(`unique: null`)이라 유니크의 규칙줄·이야기줄 경로를 한 번도
   안 지났다 — 컷은 통과인데 그 길은 안 재진 셈이었다([[probe-must-walk-the-real-path]]).
   이제 rollItem() 이 굴린 것만 쓰고, 착용은 recalc() 한 문을 지난다. */
const seeded = JSON.parse(await ev(`(async () => {
  const L = await import('/hs/loot.js');
  const G = window.G, p = G.player;
  G.packs = []; G.golds = []; G.parts = []; G.floats = []; G.spears = []; G.items = [];

  // 비교 짝 — 같은 «무기» 슬롯의 레어 하나와 유니크 하나를 실제 굴림에서 뽑는다.
  let uniqW = null, rareW = null;
  for (let i = 0; i < 8000 && !(uniqW && rareW); i++) {
    if (!uniqW) L.resetUniques();
    const it = L.rollItem(10, true);
    if (it.slot !== 'weapon') continue;
    if (it.unique && !uniqW) uniqW = it;
    else if (!it.unique && it.rarity.key === 'yellow' && !rareW) rareW = it;
  }
  if (!uniqW || !rareW) return JSON.stringify({ ok: false, uniqW: !!uniqW, rareW: !!rareW });

  p.equipped = { weapon: rareW };
  for (const s of ['armor', 'helm']) {
    for (let i = 0; i < 4000; i++) { const it = L.rollItem(10, false); if (it.slot === s) { p.equipped[s] = it; break; } }
  }
  // 가방 — 굴린 것 그대로. 유니크 무기를 맨 앞에 두어 SHIFT 비교가 그 길을 지나게.
  const bag = [uniqW];
  for (let i = 0; i < 400 && bag.length < 8; i++) bag.push(L.rollItem(10, true));
  p.bag = bag;

  window.recalc();
  return JSON.stringify({ ok: true, uniq: uniqW.name, note: uniqW.unique.note, lore: uniqW.unique.lore,
    rare: rareW.name, bag: bag.length, dmgMul: +p.dmgMul.toFixed(3),
    uniqLeak: [...p.uniques], gear: p.gear, spd: +p.spd.toFixed(3), atkCd: +p.atkCd.toFixed(3) });
})()`));
if (!seeded.ok) { log("✗ 실제 굴림에서 비교 짝을 못 뽑았다 " + JSON.stringify(seeded)); process.exit(1); }
log(`실제 굴림 — 유니크 «${seeded.uniq}»(규칙: ${seeded.note}) · 레어 «${seeded.rare}» · 가방 ${seeded.bag}개 · 착용 뒤 피해 ×${seeded.dmgMul}`);
// 착용이 «파생 배수»를 실제로 움직였나 — 옵션 합이 0 이면 recalc 이 안 돈 것과 구별이 안 된다.
const gearSum = Object.values(seeded.gear).reduce((a, b) => a + Math.abs(b), 0);
log(`착용 옵션 합 ${JSON.stringify(seeded.gear)} → 합계 ${gearSum} · 이동 ${seeded.spd} · 공격쿨 ${seeded.atkCd}`);
log(`가방에만 있는 유니크가 규칙을 켜는지 — p.uniques=[${seeded.uniqLeak}] (비어야 맞다 ${seeded.uniqLeak.length === 0 ? "✓" : "✗"})`);

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
  // 유니크 길 — 주황 규칙줄(.tipmod)과 회색 이탤릭 이야기줄(.tiplore)이 실제로 그려졌나.
  const mod = document.querySelector('#tooltip .tipmod'), lore = document.querySelector('#tooltip .tiplore');
  return JSON.stringify({ t1: getComputedStyle(t1).display, t2: getComputedStyle(t2).display,
    t1w: t1.offsetWidth, t2w: t2.offsetWidth, up, dn,
    modTxt: mod ? mod.textContent.trim() : null,
    loreTxt: lore ? lore.textContent.trim() : null,
    loreItalic: lore ? getComputedStyle(lore).fontStyle : null,
    t1txt: t1.textContent.replace(/\\s+/g,' ').slice(0,60) });
})()`));
log(`비교 툴팁 — 왼 display=${tips.t1}(${tips.t1w}) 오 display=${tips.t2}(${tips.t2w}) · 차이 초록 ${tips.up}·빨강 ${tips.dn}`);
log(`유니크 길 — 규칙줄 «${tips.modTxt}» · 이야기줄 «${tips.loreTxt}» (${tips.loreItalic})`);

shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("tmp/v182_compare.png", Buffer.from(shot.data, "base64"));
log("saved tmp/v182_compare.png");
await S("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft" });

const twoTips = tips.t1 === "block" && tips.t2 === "block" && tips.t1w > 0 && tips.t2w > 0;
const diffShown = tips.up + tips.dn > 0;
log(errs.length ? "콘솔 오류:\n  " + errs.slice(0, 6).join("\n  ") : "콘솔 오류 0");
const uniqPath = !!tips.modTxt && !!tips.loreTxt && tips.loreItalic === "italic";
const noUniqLeak = seeded.uniqLeak.length === 0;
const gearApplied = gearSum > 0;   // 합이 0 이면 착용이 아무것도 안 바꾼 것 → 자로 못 본다
const ok = invOn && counts.bagCells >= 3 && counts.dollFilled >= 2 && noLeak && twoTips && diffShown
  && uniqPath && noUniqLeak && gearApplied && !errs.length;
log(ok ? "\n✓ 창·착용·비교·유니크 규칙/이야기줄·누수0·좌클릭 가드·콘솔0 전부 통과" : "\n✗ 실패 — 위 값 확인");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(ok ? 0 : 1);
