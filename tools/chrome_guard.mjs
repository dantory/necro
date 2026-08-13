/* 헤드리스 크롬 파수꾼 — 썩었으면 **말만 하지 말고 다시 세운다**.
 *
 *   node tools/chrome_guard.mjs           보고 · 필요하면 재기동
 *   node tools/chrome_guard.mjs --check   보기만 (재기동 안 함)
 *   node tools/chrome_guard.mjs --force   멀쩡해도 재기동
 *   NECRO_RSS_LIMIT_GB=0.1 node tools/chrome_guard.mjs   씨앗 시험용 상한 낮추기
 *
 * 왜 (2026-08-13, ROADMAP 상시 ②): qa_all 의 앞서 보기가 **진단까지만** 했다 —
 * 「RSS 2.4 GB 다, pkill 하고 다시 띄워라」를 찍고 exit 3. 그런데 그 말을 읽는 건
 * 30분 뒤 깨어난 세션이라, 그 사이 감시 한 바퀴가 통째로 헛돈다. 진단이 곧
 * 처방인 자리라서(할 일이 하나뿐이다) 여기서 바로 세운다.
 *
 * 썩는 이유 두 가지 (TOOLS.md):
 *   ① DOM 을 많이 만드는 연출을 반복해 재면 렌더러가 GB 단위로 부푼다 → RSS 로 잡힌다
 *   ② 중단한 Runtime.evaluate 가 페이지 안에서 계속 돈다 → RSS 는 멀쩡한데 느리다.
 *      이건 밖에서 못 본다. 그래서 「오래 떠 있었으면」도 재기동 사유로 둔다(기본 12시간).
 * 어느 쪽이든 처방은 하나 — 재기동.
 */
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const CDP = "http://127.0.0.1:9333";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UDD = "/tmp/delve_chrome";
const ARGS = [
  "--headless=new", "--remote-debugging-port=9333", "--window-size=1280,860",
  `--user-data-dir=${UDD}`, "--no-first-run", "--disable-gpu", "about:blank",
];
const RSS_LIMIT_GB = parseFloat(process.env.NECRO_RSS_LIMIT_GB || "1");
const AGE_LIMIT_H = parseFloat(process.env.NECRO_AGE_LIMIT_H || "12");

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* CDP 가 대답하나 — 브라우저 이름을 돌려주면 살아 있는 것. */
async function version(timeoutMs = 4000) {
  try {
    const r = await fetch(CDP + "/json/version", { signal: AbortSignal.timeout(timeoutMs) });
    return (await r.json()).Browser || "?";
  } catch { return null; }
}

/* 우리가 띄운 그 크롬(브라우저 프로세스 하나)의 pid · RSS · 떠 있은 시간.
 * `type=` 이 붙은 것은 렌더러/GPU 자식이라 뺀다 — 부푸는 건 자식이지만
 * 죽이고 세우는 단위는 부모다(pkill 이 프로세스 무리를 통째로 걷어간다). */
async function proc() {
  const { stdout } = await pexec("bash", ["-lc",
    `ps -Ao pid,rss,etime,command | grep "[r]emote-debugging-port=9333" | grep -v "type=" | head -1`]);
  // macOS 의 ps 에는 etimes(초) 가 없다 — etime 은 [[dd-]hh:]mm:ss 꼴이라 손으로 푼다.
  // (처음에 etimes 를 썼다가 ps 가 통째로 실패해 이 함수가 늘 null 이었다. 씨앗 시험에서 잡혔다.)
  const m = stdout.trim().match(/^(\d+)\s+(\d+)\s+(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)\s/);
  if (!m) return null;
  const secs = (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0);
  return { pid: +m[1], gb: +m[2] / 1024 / 1024, hours: secs / 3600 };
}

/* 세운다 — 죽이고, 띄우고, **대답할 때까지 기다린다.**
 * 띄우자마자 돌아오면 다음 자가 「CDP 응답 없음」을 맞는다(재기동이 아니라 자리만 옮긴 셈). */
export async function restart({ log = console.log } = {}) {
  await pexec("bash", ["-lc", `pkill -f "user-data-dir=${UDD}" || true`]);
  await sleep(1200);
  const p = spawn(CHROME, ARGS, { detached: true, stdio: "ignore" });
  p.unref();
  for (let i = 0; i < 40; i++) {          // 최대 20초
    await sleep(500);
    const v = await version(1500);
    if (v) { log(`  ↻ 다시 세웠다 — ${v} (${((i + 1) * 0.5).toFixed(1)}s)`); return true; }
  }
  log("  ✗ 다시 세웠는데 20초 안에 CDP 가 대답하지 않는다");
  return false;
}

/* 앞서 한 번 부르는 자리. { ok, revived, notes } 를 돌려준다. */
export async function ensureChrome({ revive = true, force = false, log = console.log } = {}) {
  const notes = [];
  const v = await version();
  const ps = await proc();
  if (v) log(`브라우저  ${v}${ps ? `  RSS ${ps.gb.toFixed(2)} GB · ${ps.hours.toFixed(1)}h` : ""}`);

  let why = null;
  if (force) why = "--force";
  else if (!v) why = "CDP 9333 이 대답하지 않는다";
  else if (ps && ps.gb > RSS_LIMIT_GB) why = `RSS ${ps.gb.toFixed(2)} GB > ${RSS_LIMIT_GB} GB — 렌더러가 부풀었다`;
  else if (ps && ps.hours > AGE_LIMIT_H) why = `${ps.hours.toFixed(1)}h 째 떠 있다 (> ${AGE_LIMIT_H}h) — 남은 평가가 돌고 있을 수 있다`;

  if (!why) return { ok: true, revived: false, notes };

  notes.push(why);
  if (!revive) { log(`  ✗ ${why}`); return { ok: false, revived: false, notes }; }
  log(`  ! ${why} → 재기동`);
  const ok = await restart({ log });
  return { ok, revived: ok, notes };
}

/* 직접 부르면 CLI */
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const r = await ensureChrome({ revive: !argv.includes("--check"), force: argv.includes("--force") });
  if (r.ok && !r.revived) console.log("  ok  멀쩡하다");
  process.exit(r.ok ? 0 : 1);
}
