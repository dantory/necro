/* V-191 「성장 창 스킬 칸이 아이콘 격자다」의 자.
 * 창을 실클릭으로 열어 일곱 칸의 <img.sicon> 이 실제로 그려졌는지(naturalWidth>0),
 * 칸을 삐져나오지 않는지, 잠긴 칸이 어두운지를 수로 잰다. 단추를 하단으로 옮긴 뒤
 * V-188(툴팁이 단추를 안 덮음)이 그대로인지도 다시 확인한다. 컷 두 장을 남긴다.
 *
 *   node tools/hs_v191_icons.mjs [초] [씨앗]     (기본 30 7)
 *
 * ★ hs_v187_statval.mjs 를 본떴다(CDP 9333 · chrome_guard 먼저 · 씨앗 틀 · 자동조종은
 *   hs_v183_density 에서 떼어 쓴다). 내부 함수를 부르지 않고 창의 단추를 실클릭한다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 30);
const SEED = +(process.argv[3] || 7);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC + 240) * 1000);

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?").slice(0, 160));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push("console.error " + (m.params.args?.[0]?.value || "?")); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();
if (!/requestAnimationFrame\(tick\)/.test(AUTO)) { log("자동조종을 못 떼어냈다"); process.exit(1); }

async function main() {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log("부팅 실패"); process.exit(1); }

  const shot = async (path) => { const r = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path, Buffer.from(r.data, "base64")); log("  컷 " + path); };
  const click = async (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const resetOpen = async (pts) => ev(`(() => {
    if (document.getElementById('char').classList.contains('on')) window.toggleChar();
    G.player.attr = {str:0,dex:0,int:0,sta:0,def:0,vit:0};
    G.player.skill = {slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0}; G.player.grade = 0;
    G.player.buildSlots = 0; G.player.mult = {dmg:1,body:1,minionDmg:1};
    G.player.attrPts = ${pts}; G.player.sklPts = ${pts}; window.recalc();
    window.toggleChar();
  })()`);

  log(`■ hs_v191_icons — 씨앗 ${SEED} · 창 ${VW}×${VH}\n`);

  // ① 일곱 칸에 <img.sicon> 이 실제로 그려졌나 — 순서대로 실클릭해 사슬을 다 연다.
  await resetOpen(40);
  for (const k of ["slot", "grade", "mdmg", "mhp", "spear", "nova", "curse"]) await click(`.splus[data-s="${k}"]`);
  await sleep(300);
  const icons = await ev(`(() => {
    const nodes = [...document.querySelectorAll('#char .snode')];
    return nodes.map(n => {
      const key = n.dataset.tip, im = n.querySelector('img.sicon');
      if (!im) return { key, has: false };
      const nr = n.getBoundingClientRect(), ir = im.getBoundingClientRect();
      const over = ir.left < nr.left - 0.5 || ir.right > nr.right + 0.5 || ir.top < nr.top - 0.5 || ir.bottom > nr.bottom + 0.5;
      return { key, has: true, loaded: im.complete && im.naturalWidth > 0,
        nw: im.naturalWidth, w: Math.round(ir.width), h: Math.round(ir.height), over };
    });
  })()`);
  const drawn = icons.filter(i => i.has && i.loaded).length;
  const overflow = icons.filter(i => i.over).map(i => i.key);
  const missing = icons.filter(i => !i.has || !i.loaded).map(i => i.key);
  log(`① 일곱 칸 아이콘(사슬 다 열고 실측):`);
  for (const i of icons) log(`  ${i.has && i.loaded ? "✔" : "✘"} ${i.key.padEnd(6)} ` +
    (i.has ? `naturalW ${i.nw} · 그려진 ${i.w}×${i.h}px${i.over ? " ⚠삐져나감" : ""}` : "img 없음"));
  log(`  그려진 칸 ${drawn}/7 · 삐져나온 칸 ${overflow.length}${overflow.length ? " (" + overflow.join(",") + ")" : ""}`);
  const onePass = drawn === 7 && overflow.length === 0;
  await sleep(150); await shot("tmp/v191_char.png");

  // ② 잠긴 칸 — 새 창(0점)이면 slot·spear 만 열리고 다섯이 잠긴다. 잠긴 칸의 아이콘이 어둡나.
  await resetOpen(0);
  await sleep(250);
  const locks = await ev(`(() => {
    const nodes = [...document.querySelectorAll('#char .snode')];
    const locked = nodes.filter(n => n.classList.contains('locked')).map(n => n.dataset.tip);
    const dark = nodes.filter(n => n.classList.contains('locked')).every(n => {
      const im = n.querySelector('img.sicon'); if (!im) return false;
      return getComputedStyle(im).filter.includes('grayscale') || getComputedStyle(n).opacity < 0.95; });
    const anyLockedHasIcon = nodes.filter(n => n.classList.contains('locked')).every(n => n.querySelector('img.sicon'));
    return { locked, dark, anyLockedHasIcon };
  })()`);
  log(`\n② 잠긴 칸(새 창 0점):`);
  log(`  잠긴 칸 ${locks.locked.length}개 [${locks.locked.join(", ")}] · 아이콘 있음 ${locks.anyLockedHasIcon ? "✔" : "✘"} · 어둡게 ${locks.dark ? "✔" : "✘"}`);
  const twoPass = locks.locked.length >= 4 && locks.anyLockedHasIcon && locks.dark;
  await sleep(150); await shot("tmp/v191_locked.png");

  // ③ Rename 단추가 있고 하단에 있다 — charbtns 가 창 아래쪽, 트리보다 밑인가.
  const layout = await ev(`(() => {
    const root = document.getElementById('char');
    const btns = [...root.querySelectorAll('.charbtns button')].map(b => b.textContent.trim());
    const bt = root.querySelector('.charbtns').getBoundingClientRect();
    const tree = root.querySelector('.treecols').getBoundingClientRect();
    return { btns, below: bt.top >= tree.bottom - 2 };
  })()`);
  const hasRename = layout.btns.includes("Rename");
  log(`\n③ 단추: [${layout.btns.join(" · ")}] · Rename ${hasRename ? "있음 ✔" : "없음 ✘"} · 트리 아래 ${layout.below ? "✔" : "✘"}`);
  const threePass = hasRename && layout.below;

  // ④ V-188 회귀 — 단추를 하단으로 옮긴 뒤 툴팁이 단추를 덮지 않는가(모든 칸 커서 올림).
  await resetOpen(40);
  await click('.splus[data-s="slot"]'); await click('.splus[data-s="spear"]');
  const tipHit = await ev(`(() => {
    const root = document.getElementById('char'), tip = document.getElementById('chartip');
    const btns = [...root.querySelectorAll('.charbtns button')];
    const cells = [...root.querySelectorAll('[data-stip],[data-tip]')];
    const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const bad = [];
    for (const c of cells) { c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      const tr = tip.getBoundingClientRect();
      for (const bt of btns) { if (hit(tr, bt.getBoundingClientRect())) { bad.push((c.dataset.stip || c.dataset.tip) + '→' + bt.textContent.trim()); break; } } }
    return { total: cells.length, bad };
  })()`);
  const fourPass = tipHit.bad.length === 0;
  log(`\n④ V-188 회귀 — 툴팁 vs 하단 단추(칸 ${tipHit.total}개): ${fourPass ? "겹침 없음 ✔" : "겹친 칸 ✘ " + tipHit.bad.join(",")}`);

  // ⑤ 30초 자동조종 — frame p95 ≤16.7 · 콘솔 오류 0 · 죽음 0
  await ev(`(() => { if (document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
  await S("Runtime.evaluate", { expression: AUTO });
  const t0 = Date.now(); let toggles = 0;
  while (Date.now() - t0 < SEC * 1000) { await ev(`window.toggleChar()`); toggles++; await sleep(1500); }
  const dead = await ev(`!!G.dead`);
  const prof = await ev(`window.__prof && window.__prof.summary ? window.__prof.summary() : null`);
  const framep95 = prof?.phase?.total?.p95 ?? 999;
  const fivePass = framep95 <= 16.7 && errs.length === 0 && !dead;
  log(`\n⑤ ${SEC}초 자동조종(창 ${toggles}번 여닫음): frame p95 ${framep95}ms · 오류 ${errs.length}${errs.length ? " — " + errs.slice(0, 3).join(" | ") : ""} · 죽음 ${dead ? "있음 ✘" : "0 ✔"}`);

  const pass = onePass && twoPass && threePass && fourPass && fivePass;
  log(`\n▣ 판정 — ${pass ? "통과 ✅" : "실패 ❌"}  (① ${onePass ? "○" : "✘"} · ② ${twoPass ? "○" : "✘"} · ③ ${threePass ? "○" : "✘"} · ④ ${fourPass ? "○" : "✘"} · ⑤ ${fivePass ? "○" : "✘"})`);
  fs.writeFileSync("tmp/v191_icons.json", JSON.stringify({ icons, drawn, overflow, missing, locks, layout, tipHit, framep95, errs, dead, pass }, null, 1));
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return pass;
}

const pass = await main();
bws.close();
process.exit(pass ? 0 : 2);
