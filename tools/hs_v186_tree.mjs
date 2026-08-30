/* V-186 「스킬·스탯 창」의 자 — 손잡이가 다 실제 수를 움직이나, Reset 이 정확히
 * 되돌리나, 잠금이 지켜지나, 창을 연 채 전투가 도나를 «사람과 같은 문»으로 잰다.
 *
 *   node tools/hs_v186_tree.mjs [초] [씨앗]
 *   node tools/hs_v186_tree.mjs 60 7        (기본)
 *
 * ★ hs_v184_labels.mjs 를 본떴다(CDP 9333 · chrome_guard 먼저 · 씨앗 틀). 자동조종은
 *   V-183 밀도 자의 것을 그대로 떼어 쓴다(움직임·전투로 레벨을 올려 «실제로 얻은» 점수를 만든다).
 *
 * 재는 것:
 *   ① 안 움직이는 손잡이가 없다 — 스탯 여섯·스킬 일곱을 창의 + 단추를 실클릭해서 1점씩 찍고
 *      찍기 전/후의 실제 수(dmgMul·maxhp·slots·소환수 피해…)를 견줘 안 움직인 칸을 이름으로 뱉는다.
 *   ② 검수기가 내부 함수를 부르지 않고 창의 단추를 실제로 클릭한다(walk the real path).
 *   ③ Reset — 40점을 무작위로 찍고 Reset 한 뒤 모든 수·점수가 처음과 같아야 한다.
 *   ④ 잠금 — 앞 칸 0점인데 뒤 칸을 클릭하면 안 찍혀야 한다.
 *   ⑤ 창을 여닫으며 60초 자동조종 — frame p95 ≤ 16.7ms · 콘솔 오류 0 · 창 연 채 처치 계속. */
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
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();
if (!/requestAnimationFrame\(tick\)/.test(AUTO)) { log("자동조종을 못 떼어냈다"); process.exit(1); }

// 손잡이 → 「실클릭할 단추 셀렉터」 · 「움직여야 할 실제 수 식」. 클릭 차례는 잠금을 지킨다
// (자리→등급→소환수피해→소환수생명 · 뼈창→시체폭발→저주).
const F = { dmgMul: "G.player.dmgMul", atkCd: "G.player.atkCd", minionMul: "G.player.minionMul",
  maxmana: "G.player.maxmana", dr: "G.player.dr", maxhp: "G.player.maxhp", slots: "G.player.slots",
  maxGrade: "G.player.maxGrade", minionHpMul: "G.player.minionHpMul", spearMul: "G.player.spearMul", novaDmgMul: "G.player.novaDmgMul" };
const KNOBS = [
  { label: "힘 str",        sel: '.plus[data-a="str"]',   field: "dmgMul" },
  { label: "민첩 dex",      sel: '.plus[data-a="dex"]',   field: "atkCd" },
  { label: "지능 int",      sel: '.plus[data-a="int"]',   field: "minionMul" },
  { label: "기력 sta",      sel: '.plus[data-a="sta"]',   field: "maxmana" },
  { label: "방어 def",      sel: '.plus[data-a="def"]',   field: "dr" },
  { label: "활력 vit",      sel: '.plus[data-a="vit"]',   field: "maxhp" },
  { label: "군세:자리",     sel: '.splus[data-s="slot"]',  field: "slots" },
  { label: "군세:등급",     sel: '.splus[data-s="grade"]', field: "maxGrade" },
  { label: "군세:소환수피해", sel: '.splus[data-s="mdmg"]',  field: "minionMul" },
  { label: "군세:소환수생명", sel: '.splus[data-s="mhp"]',   field: "minionHpMul" },
  { label: "죽음:뼈창",     sel: '.splus[data-s="spear"]', field: "spearMul" },
  { label: "죽음:시체폭발",  sel: '.splus[data-s="nova"]',  field: "novaDmgMul" },
  { label: "죽음:저주",     sel: '.splus[data-s="curse"]', field: "dmgMul" },
];

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

  // ── 자동조종 없이(팩은 잠자고 p.mult 고정) 손잡이·잠금·Reset 을 잰다 ──────────────
  log(`■ hs_v186_tree — 씨앗 ${SEED} · 창 ${VW}×${VH}\n`);

  // ④ 잠금: 아무 점도 안 쓴 상태에서 잠긴 뒤칸(소환수피해)을 클릭 → 안 찍혀야 한다
  await ev(`(() => { G.player.sklPts = 5; window.toggleChar(); })()`);
  const lockBefore = await ev(`G.player.skill.mdmg`);
  await click('.splus[data-s="mdmg"]');
  const lockAfter = await ev(`G.player.skill.mdmg`);
  const lockHeld = lockBefore === 0 && lockAfter === 0;
  await ev(`(() => { G.player.sklPts = 0; G.player.skill.slot = 0; window.recalc(); if (window.renderCharForce) 0; })()`);

  // ① 안 움직이는 손잡이 — 점수를 넉넉히 주고 차례로 실클릭, 전/후 수를 견준다
  await ev(`(() => { G.player.attrPts = 60; G.player.sklPts = 60; })()`);
  const moved = [], stuck = [];
  const rows = [];
  for (const k of KNOBS) {
    const before = await ev(F[k.field]);
    const ok = await click(k.sel);
    const after = await ev(F[k.field]);
    const did = ok && before !== after;
    (did ? moved : stuck).push(k.label);
    rows.push(`  ${did ? "✔" : "✘"} ${k.label.padEnd(12)} ${k.field.padEnd(12)} ${fmt(before)} → ${fmt(after)}`);
  }
  log("① 손잡이 하나씩 1점 (실클릭, 전→후):");
  for (const r of rows) log(r);
  log(`  움직인 칸 ${moved.length}/13 · 안 움직인 칸 ${stuck.length ? stuck.join(", ") : "없음"}`);
  log(`④ 잠금(앞칸 0점에 뒤칸 클릭) — ${lockHeld ? "지켜짐 ✔" : "뚫림 ✘"}`);

  // ③ Reset: 처음(0점) 수를 찍어 두고 → 40점 무작위 클릭 → Reset → 처음과 같아야
  await ev(`(() => { window.resetAll_probe = () => {}; G.player.attr = {str:0,dex:0,int:0,sta:0,def:0,vit:0};
    G.player.skill = {slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0}; G.player.grade = 0;
    G.player.buildSlots = 0; G.player.mult = {dmg:1,body:1,minionDmg:1}; G.player.attrPts = 0; G.player.sklPts = 0; window.recalc(); })()`);
  const snap = async () => ev(`(() => { const p = G.player; return { dmgMul:p.dmgMul, atkCd:p.atkCd, minionMul:p.minionMul,
    maxmana:p.maxmana, dr:p.dr, maxhp:p.maxhp, slots:p.slots, maxGrade:p.maxGrade, minionHpMul:p.minionHpMul,
    spearMul:p.spearMul, novaDmgMul:p.novaDmgMul, attrPts:p.attrPts, sklPts:p.sklPts }; })()`);
  const before = await snap();
  await ev(`(() => { G.player.attrPts = 40; G.player.sklPts = 40; window.renderCharProbe && 0; if (window.toggleChar && !document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
  // 무작위 40번 클릭(잠긴 칸은 no-op — 그래도 Reset 이 되돌려야 한다). 순서 있는 스킬은 앞칸부터.
  const attrSel = KNOBS.slice(0, 6).map(k => k.sel);
  const armySel = ['.splus[data-s="slot"]', '.splus[data-s="grade"]', '.splus[data-s="mdmg"]', '.splus[data-s="mhp"]'];
  const deathSel = ['.splus[data-s="spear"]', '.splus[data-s="nova"]', '.splus[data-s="curse"]'];
  let rng = SEED >>> 0 || 1; const rnd = () => (rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 40; i++) {
    const pick = rnd();
    let sel;
    if (pick < 0.5) sel = attrSel[(rnd() * 6) | 0];
    else if (pick < 0.75) sel = armySel[(rnd() * 4) | 0];
    else sel = deathSel[(rnd() * 3) | 0];
    await click(sel);
  }
  const spent = await snap();
  await ev(`(() => {
    const root = document.getElementById('char');
    root.querySelector('[data-reset="attr"]').click();
    root.querySelector('[data-reset="skill"]').click();
  })()`);
  const after = await snap();
  // 파생 수만 견준다(점수 주머니는 찍기 전 0 → 되돌린 뒤 40 이라 당연히 다르다 · 따로 40/40 확인).
  const keys = Object.keys(before).filter(k => k !== "attrPts" && k !== "sklPts");
  const diffs = keys.filter(k => Math.abs((after[k] ?? 0) - (before[k] ?? 0)) > 1e-9);
  const resetOk = diffs.length === 0 && after.attrPts === 40 && after.sklPts === 40;
  log(`\n③ Reset(무작위 40점 → Reset):`);
  log(`  처음   ${JSON.stringify(before)}`);
  log(`  40점찍음 ${JSON.stringify(spent)}`);
  log(`  Reset후 ${JSON.stringify(after)}`);
  log(`  ${resetOk ? "정확히 되돌림 ✔" : "어긋남 ✘ — " + diffs.join(",")}`);

  // 창 닫고 판을 새로(자동조종 씨앗과 섞이지 않게) — 처음 상태로 재기동
  await ev(`(() => { if (document.getElementById('char').classList.contains('on')) window.toggleChar(); window.start && 0; })()`);

  // ── ⑤ 창을 여닫으며 60초 자동조종 · 실제 플레이로 점수를 벌어 컷 세 장 ─────────────
  await ev(`(() => { G.player.attr = {str:0,dex:0,int:0,sta:0,def:0,vit:0};
    G.player.skill = {slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0}; G.player.grade = 0;
    G.player.attrPts = 0; G.player.sklPts = 0; G.player.mult = {dmg:1,body:1,minionDmg:1}; window.recalc(); })()`);
  await S("Runtime.evaluate", { expression: AUTO });
  const t0 = Date.now(); let toggles = 0, killsWhileOpen = 0;
  while (Date.now() - t0 < SEC * 1000) {
    const isOpen = await ev(`document.getElementById('char').classList.contains('on')`);
    await ev(`window.toggleChar()`); toggles++;
    const k0 = await ev(`G.kills`);
    await sleep(1500);
    const k1 = await ev(`G.kills`);
    if (!isOpen) killsWhileOpen += Math.max(0, k1 - k0);   // 방금 열린 구간의 처치
  }
  const combatRuns = killsWhileOpen > 0;
  const prof = await ev(`window.__prof && window.__prof.summary ? window.__prof.summary() : null`);
  const framep95 = prof?.phase?.total?.p95 ?? 999;
  const pts = await ev(`({ a: G.player.attrPts, s: G.player.sklPts, lvl: G.player.level, kills: G.kills })`);
  log(`\n⑤ 60초 자동조종(창 ${toggles}번 여닫음):`);
  log(`  창 연 채 처치 +${killsWhileOpen} — 전투 ${combatRuns ? "계속 돈다 ✔" : "멈춘다 ✘"}`);
  log(`  레벨 ${pts.lvl} · 벌어들인 점수 스탯 ${pts.a}/스킬 ${pts.s} · 처치 ${pts.kills}`);
  log(`  frame p95 ${framep95}ms (예산 ≤16.7)  ·  콘솔 오류 ${errs.length}${errs.length ? " — " + errs.slice(0, 3).join(" | ") : ""}`);

  // 컷 — 실제로 번 점수로. 스탯 컷은 몇 점 실클릭해 수가 움직인 걸 보인다.
  await ev(`(() => { if (!document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
  await click('.plus[data-a="str"]'); await click('.plus[data-a="vit"]'); await click('.plus[data-a="int"]');
  await sleep(200); await shot("tmp/v186_stats.png");
  await click('.splus[data-s="slot"]'); await click('.splus[data-s="grade"]'); await click('.splus[data-s="spear"]');
  await sleep(200); await shot("tmp/v186_tree.png");
  await ev(`(() => { const n = document.querySelector('.snode[data-tip="spear"]'); if (n) n.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); })()`);
  await sleep(200); await shot("tmp/v186_tip.png");

  const pass = moved.length === 13 && lockHeld && resetOk && combatRuns && framep95 <= 16.7 && errs.length === 0;
  log(`\n▣ 판정 — ${pass ? "통과 ✅" : "실패 ❌"}` +
    `  (손잡이 ${moved.length}/13 · 잠금 ${lockHeld ? "○" : "✘"} · Reset ${resetOk ? "○" : "✘"} · 전투 ${combatRuns ? "○" : "✘"} · p95 ${framep95}≤16.7 ${framep95 <= 16.7 ? "○" : "✘"} · 오류 ${errs.length})`);
  fs.writeFileSync("tmp/v186_tree.json", JSON.stringify({ moved, stuck, lockHeld, resetOk, before, after, combatRuns, framep95, errs, pts, pass }, null, 1));
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return pass;
}
function fmt(v) { return typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(3)) : v; }

const pass = await main();
bws.close();
process.exit(pass ? 0 : 2);
