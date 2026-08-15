/* **GPU 합성을 켠** 헤드리스 크롬을 따로 세운다 — 9334.
 *
 *   node tools/gpu_chrome.mjs            없으면 세우고, 켜졌는지 확인해 낸다
 *   node tools/gpu_chrome.mjs --check    보기만
 *   node tools/gpu_chrome.mjs --force    멀쩡해도 다시 세운다
 *   node tools/gpu_chrome.mjs --stop     내린다
 *
 * 왜 (ROADMAP 「그래도 병수님 기기에서 걸리는지는 아직 모른다」):
 * `trace_probe` 가 ×6 무거운 판에서 **`Commit` 이 초당 826ms** 라고 냈는데, 그 판을
 * 재던 9333 은 `chrome_guard` 가 `--disable-gpu` 로 세운 것이다. GPU 합성이 꺼지면
 * 캔버스 한 장(828×1720)을 **CPU 로 넘긴다** — 진짜 폰은 그 자리를 GPU 가 한다.
 * 그러니 「Commit 이 1등」은 **이 헤드리스의 참**이지 폰의 참이 아니다. 같은 표를
 * GPU 합성을 켠 창에서 한 번 더 떠야 어느 쪽이 진짜인지 말할 수 있다.
 *
 * ★ 이 자의 핵심은 **켜졌는지 확인하는 것**이다. 크롬은 GPU 를 못 쓰면 말없이
 *   소프트웨어로 내려간다 — 그걸 모르고 표를 뜨면 9333 과 같은 숫자를 「GPU 켠
 *   값」이라 적게 된다. 그래서 `SystemInfo.getInfo` 로 `gpu_compositing` 을 읽어
 *   `enabled` 가 아니면 **실패로 끝낸다**([[probe-must-walk-the-real-path]] 의 같은 병).
 *
 * 9333(chrome_guard) 을 건드리지 않는다 — 포트도 user-data-dir 도 따로다.
 * 나머지 자는 그대로 9333 을 쓰고, 이 창을 쓰고 싶을 때만 `NECRO_CDP_PORT=9334`.
 */
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const PORT = 9334;
export const CDP = `http://127.0.0.1:${PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UDD = "/tmp/necro_gpu_chrome";
/* `--disable-gpu` 가 **없는** 것이 이 창의 전부다. 나머지는 9333 과 같은 판으로 맞춘다.
 * `--use-angle=metal` 은 이 맥(M2)의 기본 길이고, `--ignore-gpu-blocklist` 는 헤드리스에서
 * 목록에 걸려 조용히 내려가는 것을 막는다. */
const ARGS = [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--window-size=1280,860",
  `--user-data-dir=${UDD}`, "--no-first-run",
  "--use-angle=metal", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "about:blank",
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function version(timeoutMs = 4000) {
  try {
    const r = await fetch(CDP + "/json/version", { signal: AbortSignal.timeout(timeoutMs) });
    return (await r.json()).Browser || "?";
  } catch { return null; }
}

/* 브라우저에 붙어 GPU 칸을 읽는다 — 페이지 세션이 아니라 브라우저 소켓이라야 SystemInfo 가 있다. */
export async function gpuStatus() {
  const ver = await (await fetch(CDP + "/json/version")).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data); const p = pend.get(m.id);
    if (!p) return; pend.delete(m.id);
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
  });
  await new Promise(r => ws.addEventListener("open", r));
  const info = await new Promise((res, rej) => {
    const i = ++id; pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method: "SystemInfo.getInfo", params: {} }));
  });
  ws.close();
  const fs = info.gpu?.featureStatus || {};
  return {
    합성: fs.gpu_compositing || "?", 캔버스: fs["2d_canvas"] || "?",
    래스터: fs.rasterization || "?", 렌더러: info.gpu?.auxAttributes?.glRenderer || "?",
  };
}

async function proc() {
  const { stdout } = await pexec("bash", ["-lc",
    `ps -Ao pid,rss,etime,command | grep "[r]emote-debugging-port=${PORT}" | grep -v "type=" | head -1`]);
  const m = stdout.trim().match(/^(\d+)\s+(\d+)\s+(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)\s/);
  if (!m) return null;
  const secs = (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0);
  return { pid: +m[1], gb: +m[2] / 1024 / 1024, hours: secs / 3600 };
}

export async function stop() {
  await pexec("bash", ["-lc", `pkill -f "user-data-dir=${UDD}" || true`]);
  await sleep(800);
}

export async function restart({ log = console.log } = {}) {
  await stop();
  spawn(CHROME, ARGS, { detached: true, stdio: "ignore" }).unref();
  for (let i = 0; i < 40; i++) {          // 최대 20초
    await sleep(500);
    const v = await version(1500);
    if (v) { log(`  ↻ GPU 창을 세웠다 — ${v} (${((i + 1) * 0.5).toFixed(1)}s)`); return true; }
  }
  log("  ✗ 20초 안에 9334 가 대답하지 않는다");
  return false;
}

/* { ok, gpu } — GPU 합성이 실제로 켜져야만 ok. */
export async function ensureGpuChrome({ revive = true, force = false, log = console.log } = {}) {
  const v = await version();
  const ps = await proc();
  if (v) log(`GPU 창   ${v}${ps ? `  RSS ${ps.gb.toFixed(2)} GB · ${ps.hours.toFixed(1)}h` : ""}`);
  const RSS_LIMIT_GB = parseFloat(process.env.NECRO_RSS_LIMIT_GB || "1");
  const AGE_LIMIT_H = parseFloat(process.env.NECRO_AGE_LIMIT_H || "12");

  let why = null;
  if (force) why = "--force";
  else if (!v) why = "9334 가 대답하지 않는다";
  else if (ps && ps.gb > RSS_LIMIT_GB) why = `RSS ${ps.gb.toFixed(2)} GB > ${RSS_LIMIT_GB} GB`;
  else if (ps && ps.hours > AGE_LIMIT_H) why = `${ps.hours.toFixed(1)}h 째 떠 있다 (> ${AGE_LIMIT_H}h)`;

  if (why) {
    if (!revive) { log(`  ✗ ${why}`); return { ok: false, gpu: null }; }
    log(`  ! ${why} → 세운다`);
    if (!await restart({ log })) return { ok: false, gpu: null };
  }
  const gpu = await gpuStatus();
  const 켜짐 = gpu.합성 === "enabled";
  log(`  합성 ${gpu.합성} · 2d캔버스 ${gpu.캔버스} · 래스터 ${gpu.래스터}`);
  log(`  ${gpu.렌더러}`);
  if (!켜짐) log("  ✗ GPU 합성이 안 켜졌다 — 이 창으로 뜬 표는 9333 과 같은 소프트웨어 값이다");
  return { ok: 켜짐, gpu };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  if (argv.includes("--stop")) { await stop(); console.log("내렸다"); process.exit(0); }
  const r = await ensureGpuChrome({ revive: !argv.includes("--check"), force: argv.includes("--force") });
  console.log(r.ok ? "PASS — GPU 합성 켜짐" : "FAIL — GPU 합성 꺼짐");
  process.exit(r.ok ? 0 : 1);
}
