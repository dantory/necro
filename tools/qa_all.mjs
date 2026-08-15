/* necro 자 열여섯 개를 한 줄로 — 「어느 자가 죽었는지」를 그 자리에서 말한다.
 *
 *   node tools/qa_all.mjs            빠른 자만 (기본 · 2분 안쪽)
 *   node tools/qa_all.mjs --all      느린 자까지 전부 (수십 분 — detached 로 돌릴 것)
 *   node tools/qa_all.mjs --only tap_qa,log_qa
 *   node tools/qa_all.mjs --list
 *   node tools/qa_all.mjs --no-revive   썩은 브라우저를 고치지 말고 멈춰라 (진단만)
 *
 * 왜 만들었나 (2026-08-13): 「스킬 자가 죽은 것」을 한참 뒤에야 알았다. 브라우저가
 * 썩어 있었는데 자는 exit 0 으로 조용히 끝났다 — 실패가 아니라 **아무 말도 안 한
 * 것**이 문제였다. 그래서 여기서는 세 가지를 갈라 본다:
 *   FAIL  자가 스스로 「틀렸다」고 말함 (exit != 0)
 *   DEAD  시간 안에 안 끝남 / 출력이 없음 / 있어야 할 낱말이 없음  ← 오늘의 그 사고
 *   PASS  끝났고 할 말을 했다
 * DEAD 를 PASS 와 같은 칸에 두면 또 못 본다. 그래서 판정 줄에 따로 센다.
 *
 * 앞서 브라우저부터 본다 — 자가 죽는 첫째 원인이 썩은 헤드리스 크롬이라서(TOOLS.md).
 * 썩었으면 말만 하지 않고 **그 자리에서 다시 세운다**(chrome_guard.mjs).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ensureChrome } from "./chrome_guard.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const APP = "http://127.0.0.1:8774/index.html";

/* ── 자 목록 ────────────────────────────────────────────────────────────────
 * secs  : 이만큼 지나도 안 끝나면 DEAD (자가 스스로 재는 시간 + 넉넉히)
 * expect: 출력에 반드시 있어야 하는 낱말. 없으면 DEAD — exit 0 이어도.
 * tier  : fast = 기본 실행 · slow = --all 에서만
 */
const RULERS = [
  // ── 빠른 자: 켜자마자 보이는 것들 (UI · 로그 · 한 번의 조작)
  { name: "cdp_verify",   args: ["/tmp/necro_qa_ui.png", "ui"], secs: 90,  tier: "fast", expect: /errors/ },
  { name: "tap_qa",       args: [],                             secs: 90,  tier: "fast", expect: /판정:/ },
  { name: "log_qa",       args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "dismiss_qa",   args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "winscroll_qa", args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "leave_qa",     args: [],                             secs: 150, tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "offline_qa",   args: [],                             secs: 150, tier: "fast", expect: /PASS/ },
  { name: "skill_qa",     args: ["/tmp/necro_qa_skill.png"],    secs: 150, tier: "fast", expect: /판정/ },
  /* ★ skill_qa 는 「어디서 터지나」를 보고, 이건 「**무슨 그림**이 터지나」를 본다 —
     둘이 다르다. skill_qa 가 셋 다 통과하는 동안 태우기는 소환 그림, 제물은 폭발 그림으로
     나가고 저주는 아무것도 안 떴다(2026-08-15 병수님 지적). */
  { name: "fx_art",       args: [],                             secs: 150, tier: "fast", expect: /판정/ },
  { name: "icon_qa",      args: [],                             secs: 120, tier: "fast", expect: /검사한 칸/ },
  { name: "win_qa",       args: [],                             secs: 150, tier: "fast" },
  { name: "motion_qa",    args: ["8", "/tmp/necro_qa_motion.png"], secs: 150, tier: "fast", expect: /프레임/ },
  { name: "quest_qa",     args: ["1,3,9"],                      secs: 200, tier: "fast", expect: /판정/ },

  // ── 느린 자: 판을 실제로 굴려서 재는 것들 (--all)
  { name: "walk_qa",     args: ["25", "3"],       secs: 240,  tier: "slow" },
  { name: "march_qa",    args: ["40", "3"],       secs: 300,  tier: "slow" },
  { name: "boss_qa",     args: ["5", "30", "3"],  secs: 300,  tier: "slow" },
  { name: "gatelord_probe", args: ["12", "1,7,13"], secs: 900, tier: "slow", expect: /판정/ },
  { name: "unique_probe", args: [],                secs: 900, tier: "slow", expect: /판정/ },
  { name: "run_end",     args: [],                secs: 600,  tier: "slow" },
  { name: "rebirth_qa",  args: ["10", "1,7"],     secs: 1500, tier: "slow", expect: /판정/ },
  { name: "loop_health", args: [],                secs: 1500, tier: "slow" },
  { name: "corpse_probe", args: ["30", "1,13"],   secs: 1500, tier: "slow", expect: /판정/ },
];

/* ── 인자 ── */
const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? new Set((argv[onlyIdx + 1] || "").split(",").filter(Boolean)) : null;

if (argv.includes("--list")) {
  for (const r of RULERS) console.log(`${r.tier.padEnd(4)}  ${r.name.padEnd(13)} ${r.secs}s  node tools/${r.name}.mjs ${r.args.join(" ")}`);
  console.log(`\n총 ${RULERS.length} 자 (fast ${RULERS.filter(r => r.tier === "fast").length} · slow ${RULERS.filter(r => r.tier === "slow").length})`);
  process.exit(0);
}

const pick = RULERS.filter(r => (ONLY ? ONLY.has(r.name) : ALL || r.tier === "fast"));
if (ONLY) {
  const unknown = [...ONLY].filter(n => !RULERS.some(r => r.name === n));
  if (unknown.length) { console.error("모르는 자: " + unknown.join(", ") + "  (--list 로 확인)"); process.exit(2); }
}

/* ── 앞서 보기: 브라우저와 서버가 살아 있나 ────────────────────────────────
 * 죽은 브라우저에 열여섯 번 절하고 「전부 DEAD」를 받아 봐야 원인은 하나다.
 * 브라우저는 **여기서 고친다** — 진단(RSS·나이·CDP)이 곧 처방이라서(chrome_guard).
 * 고쳐지지 않을 때만 멈춘다. 앱 서버는 여전히 멈춤 사유다(띄우는 자리가 사람 쪽).
 */
async function preflight() {
  const bad = [];
  const g = await ensureChrome({ revive: !argv.includes("--no-revive") });
  if (!g.ok) bad.push(`브라우저를 세우지 못했다 — ${g.notes.join(" · ")}`);

  try {
    const r = await fetch(APP, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) bad.push(`앱 서버 HTTP ${r.status}`); else console.log(`앱 서버  200  ${APP}`);
  } catch (e) { bad.push(`앱 서버 8774 응답 없음 (${e.message}) — python3 -m http.server 8774 를 띄울 것`); }
  return bad;
}

/* ── 자 하나 돌리기 ── */
function run(r) {
  return new Promise(res => {
    const t0 = Date.now();
    const p = spawn("node", [`tools/${r.name}.mjs`, ...r.args], { cwd: REPO });
    let out = "", killed = false;
    const timer = setTimeout(() => { killed = true; p.kill("SIGKILL"); }, r.secs * 1000);
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => out += d);
    p.on("close", code => {
      clearTimeout(timer);
      const sec = Math.round((Date.now() - t0) / 1000);
      const lines = out.split("\n").filter(l => l.trim()).length;
      let verdict, why = "";
      if (killed)                          { verdict = "DEAD"; why = `${r.secs}s 안에 안 끝났다`; }
      else if (lines < 2)                  { verdict = "DEAD"; why = `아무 말도 안 했다 (${lines}줄)`; }
      else if (r.expect && !r.expect.test(out)) { verdict = "DEAD"; why = `있어야 할 낱말이 없다 ${r.expect}`; }
      else if (code !== 0)                 { verdict = "FAIL"; why = `exit ${code}`; }
      else                                 { verdict = "PASS"; }
      res({ ...r, verdict, why, sec, lines, out });
    });
  });
}

/* ── 본문 ── */
const bad = await preflight();
if (bad.length) {
  console.log("\n═══ 앞서 보기에서 멈춘다 ═══");
  for (const b of bad) console.log("  ✗ " + b);
  process.exit(3);
}
console.log(`\n자 ${pick.length} 개 ${ALL ? "(전부)" : ONLY ? "(고른 것)" : "(빠른 것만 — 전부는 --all)"}\n`);

const results = [];
for (const r of pick) {
  process.stdout.write(`  … ${r.name.padEnd(13)}`);
  const x = await run(r);
  results.push(x);
  process.stdout.write(`\r  ${x.verdict === "PASS" ? "ok  " : x.verdict === "FAIL" ? "FAIL" : "DEAD"} ${r.name.padEnd(13)} ${String(x.sec).padStart(4)}s  ${x.why}\n`);
}

/* 틀린 자·죽은 자만 말을 다시 들려 준다 — 통과한 자의 수다까지 다 찍으면 안 읽는다. */
for (const x of results.filter(v => v.verdict !== "PASS")) {
  console.log(`\n──── ${x.name} (${x.verdict}: ${x.why}) ────`);
  console.log(x.out.split("\n").slice(-25).join("\n").trimEnd() || "(출력 없음)");
}

const fail = results.filter(v => v.verdict === "FAIL").length;
const dead = results.filter(v => v.verdict === "DEAD").length;
console.log(`\n═══ ${results.length - fail - dead}/${results.length} 통과 · 틀림 ${fail} · ★죽음 ${dead} ═══`);
if (dead) console.log("★ 죽은 자는 「통과」가 아니다 — 자가 먼저 고장 났다는 뜻이다.");
process.exit(fail || dead ? 1 : 0);
