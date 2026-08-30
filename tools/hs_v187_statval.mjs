/* V-187/188 「스탯 칸은 그 스탯의 순수 몫만·툴팁은 단추를 안 덮는다」의 자.
 * 창의 + 단추를 «사람과 같은 문»으로 실클릭해 칸 표시 문자열을 읽고, 한 점마다 정확히
 * 표(ATTRS)의 계수만큼 늘어나는지 · 빌드 드롭에 오염되지 않는지 · 방어 상한이 보이는지 ·
 * 툴팁이 Reset/Close 단추와 겹치지 않는지 · 창을 여닫으며 60초가 매끄러운지를 수로 잰다.
 *
 *   node tools/hs_v187_statval.mjs [초] [씨앗]
 *   node tools/hs_v187_statval.mjs 60 7        (기본)
 *
 * ★ hs_v186_tree.mjs 를 본떴다(CDP 9333 · chrome_guard 먼저 · 씨앗 틀 · 자동조종은
 *   hs_v183_density 에서 떼어 쓴다). 내부 함수를 부르지 않고 창의 단추를 실클릭한다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 60);
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

const num = s => { const m = String(s).match(/[-+]?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
const near = (a, b) => Math.abs(a - b) < 1e-6;

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
  const statval = async (key) => ev(`document.querySelector('.statrow[data-stip="${key}"] .statval')?.textContent || ''`);
  const resetOpen = async (pts) => ev(`(() => {
    if (document.getElementById('char').classList.contains('on')) window.toggleChar();
    G.player.attr = {str:0,dex:0,int:0,sta:0,def:0,vit:0};
    G.player.skill = {slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0}; G.player.grade = 0;
    G.player.buildSlots = 0; G.player.mult = {dmg:1,body:1,minionDmg:1};
    G.player.attrPts = ${pts}; G.player.sklPts = ${pts}; window.recalc();
    window.toggleChar();
  })()`);

  log(`■ hs_v187_statval — 씨앗 ${SEED} · 창 ${VW}×${VH}\n`);

  // ① 한 점 몫이 정확하다 — 표(ATTRS.per)만큼만 늘어난다. per: str3·dex2·int2·sta40·def1.2·vit120
  const PER = { str: 3, dex: 2, int: 2, sta: 40, def: 1.2, vit: 120 };
  await resetOpen(60);
  const oneRows = [], oneBad = [];
  for (const key of Object.keys(PER)) {
    const v0 = num(await statval(key));
    await click(`.plus[data-a="${key}"]`);
    const v1 = num(await statval(key));
    await click(`.plus[data-a="${key}"]`);
    const v2 = num(await statval(key));
    const d1 = v1 - v0, d2 = v2 - v1;
    const ok = near(d1, PER[key]) && near(d2, PER[key]);
    if (!ok) oneBad.push(key);
    oneRows.push(`  ${ok ? "✔" : "✘"} ${key}  0→1→2 = ${v0} → ${v1} → ${v2}  (한 점 +${d1}, 표 +${PER[key]})`);
  }
  const onePass = oneBad.length === 0;
  log("① 한 점 몫(창의 + 실클릭, 칸 표시에서 뽑은 수):");
  for (const r of oneRows) log(r);
  log(`  ${onePass ? "표의 계수와 정확히 일치 ✔" : "어긋난 칸 ✘ — " + oneBad.join(", ")}`);

  // ② 빌드 드롭에 오염되지 않는다 — p.mult.minionDmg ×100 해도 지능 칸은 그대로,
  //    좌상단 HUD 통합 배수(#enh)는 반드시 움직인다.
  const intCell0 = await statval("int");
  const enh0 = await ev(`document.getElementById('enh').textContent`);
  const minMul0 = await ev(`G.player.minionMul`);
  await ev(`(() => { G.player.mult.minionDmg *= 100; window.recalc();
    window.toggleChar(); window.toggleChar(); })()`);
  await sleep(180);
  const intCell1 = await statval("int");
  const enh1 = await ev(`document.getElementById('enh').textContent`);
  const minMul1 = await ev(`G.player.minionMul`);
  const cellHeld = intCell0 === intCell1;
  const hudMoved = enh0 !== enh1 && minMul1 > minMul0 * 50;
  const twoPass = cellHeld && hudMoved;
  log(`\n② 빌드 드롭(p.mult.minionDmg ×100) 오염:`);
  log(`  지능 칸  "${intCell0}" → "${intCell1}"  — ${cellHeld ? "안 변함 ✔" : "변함 ✘"}`);
  log(`  HUD #enh "${enh0}" → "${enh1}"`);
  log(`  minionMul ${minMul0.toFixed(2)} → ${minMul1.toFixed(2)}  — HUD 통합 배수 ${hudMoved ? "움직임 ✔" : "안 움직임 ✘"}`);

  // ③ 방어 상한 — 63점(63×1.2=75.6 ≥ 75)까지 실클릭하면 칸이 상한을 보인다.
  await resetOpen(100);
  for (let i = 0; i < 63; i++) await click('.plus[data-a="def"]');
  const defCell = await statval("def");
  const dr = await ev(`G.player.dr`);
  const capShown = /상한/.test(defCell) && near(dr, 0.75);
  log(`\n③ 방어 상한(63점 실클릭):`);
  log(`  방어 칸 "${defCell}" · dr ${dr}  — ${capShown ? "상한이 보임 ✔" : "상한 안 보임 ✘"}`);

  // ④ 툴팁이 단추를 안 덮는다 — 창 안 모든 칸에 커서를 올려 chartip 사각형이
  //    Reset/Close 단추 사각형과 교집합 0 인지 확인.
  await resetOpen(40);
  await click('.splus[data-s="slot"]'); await click('.splus[data-s="grade"]'); await click('.splus[data-s="spear"]');
  const tipHit = await ev(`(() => {
    const root = document.getElementById('char'), tip = document.getElementById('chartip');
    const btns = [...root.querySelectorAll('.charbtns button')];
    const cells = [...root.querySelectorAll('[data-stip],[data-tip]')];
    const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const bad = [];
    for (const c of cells) {
      c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      const tr = tip.getBoundingClientRect();
      for (const bt of btns) { if (hit(tr, bt.getBoundingClientRect())) { bad.push((c.dataset.stip || c.dataset.tip) + '→' + bt.textContent.trim()); break; } }
    }
    return { total: cells.length, bad };
  })()`);
  const fourPass = tipHit.bad.length === 0;
  log(`\n④ 툴팁 vs 단추(칸 ${tipHit.total}개 전부 커서 올림):`);
  log(`  ${fourPass ? "겹치는 칸 없음 ✔" : "겹친 칸 ✘ — " + tipHit.bad.join(", ")}`);

  // 컷 두 장: 스탯(순수 몫 보이고 HUD 통합 배수 그대로) · 툴팁(단추 안 덮음)
  await ev(`(() => { G.player.mult.minionDmg = 5; window.recalc();
    if (!document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
  await click('.plus[data-a="str"]'); await click('.plus[data-a="int"]'); await click('.plus[data-a="vit"]');
  await sleep(200); await shot("tmp/v187_stats.png");
  await ev(`(() => { const n = document.querySelector('.snode[data-tip="curse"]') || document.querySelector('.snode');
    if (n) n.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); })()`);
  await sleep(200); await shot("tmp/v187_tip.png");

  // ⑥ 창을 여닫으며 60초 자동조종 — frame p95 ≤16.7 · 콘솔 오류 0
  await resetOpen(0);
  await ev(`(() => { if (document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
  await S("Runtime.evaluate", { expression: AUTO });
  const t0 = Date.now(); let toggles = 0;
  while (Date.now() - t0 < SEC * 1000) { await ev(`window.toggleChar()`); toggles++; await sleep(1500); }
  const prof = await ev(`window.__prof && window.__prof.summary ? window.__prof.summary() : null`);
  const framep95 = prof?.phase?.total?.p95 ?? 999;
  const sixPass = framep95 <= 16.7 && errs.length === 0;
  log(`\n⑥ 60초 자동조종(창 ${toggles}번 여닫음):`);
  log(`  frame p95 ${framep95}ms (예산 ≤16.7)  ·  콘솔 오류 ${errs.length}${errs.length ? " — " + errs.slice(0, 3).join(" | ") : ""}`);

  const pass = onePass && twoPass && capShown && fourPass && sixPass;
  log(`\n▣ 판정 — ${pass ? "통과 ✅" : "실패 ❌"}` +
    `  (① ${onePass ? "○" : "✘"} · ② ${twoPass ? "○" : "✘"} · ③ ${capShown ? "○" : "✘"} · ④ ${fourPass ? "○" : "✘"} · ⑥ p95 ${framep95}≤16.7·오류 ${errs.length} ${sixPass ? "○" : "✘"})`);
  fs.writeFileSync("tmp/v187_statval.json", JSON.stringify({ onePass, oneBad, twoPass, cellHeld, hudMoved, capShown, defCell, fourPass, tipHit, framep95, errs, pass }, null, 1));
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return pass;
}

const pass = await main();
bws.close();
process.exit(pass ? 0 : 2);
