/* **군세의 종류가 실제로 어떻게 서는가** — loop_health 의 뼈대(tools/loop_health.mjs)를
   그대로 베껴 30분을 빨리 감으면서, 이번엔 **종별 점유·일·화력**만 잰다.
   로드맵 ③(군세의 종류): 해골만 판에 선다. 구울·골렘은 표에 있으나 접혀 있다.
   목표(다음 회차): 30분에 어느 종도 시간가중 머릿수 70% 를 넘지 않고, 구울·골렘이
   각각 한 자리 %% 라도 선다. **이 회차는 진단만 한다 — 게임 코드는 손대지 않는다.**

     AP_MIN=30 node tools/army_probe.mjs [분] [out.json]     (씨앗은 AP_SEED, 없으면 3·9·5)

   재는 것(전부 검수기 안에서만 — js/ 아래는 한 글자도 안 건드린다):
     · 시간가중 머릿수 %% (종별 마리·초 / 총 마리·초, 지배 소환수 own 은 따로)
     · 종별 일 — 받은 피해합(hp 감소 누적)·죽음·평균 생존시간·평균 선 수
     · 종별 준 피해 — battle.js 의 impact 해소를 검수기에서 흉내(근사, 아래 주석)
     · 최고층·판수(깊이가 안 무너졌음을 뒤에서 증명하려면 필요)·찍은 트리 랭크
   ★ **게임 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 된다**
     (loop_health 가 2026-08-12 에 밟은 함정). 그래서 모든 셈은 window.__AP 안에만 둔다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const MIN = +(process.argv[2] || process.env.AP_MIN || 30);
const SEEDS = process.env.AP_SEED ? [+process.env.AP_SEED] : [3, 9, 5];
const DEBUG = !!process.env.AP_DEBUG;

/* ── CDP 배관(loop_health 와 동일) ── */
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));

/* ★ **판을 혼자 쓰게 한다** — 죽거나 잘린 지난 판이 탭을 남기면 같은 렌더러 프레임을
   나눠 먹어 씨앗이 같아도 판이 달라진다(loop_health 주석). 뜨기 전에 쓴다. */
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
if (stale.length) console.log(`(남아 있던 판 ${stale.length} 개를 닫았다)`);

/* 잘려도(SIGTERM·예외) 지금 열려 있는 탭은 두고 가지 않는다 — curl 로 닫는다. */
let currentTarget = null;
{ const { execFileSync } = await import("node:child_process");
  const shut = () => { if (currentTarget) try { execFileSync("curl", ["-s", `${CDP}/json/close/${currentTarget}`]); } catch {} };
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(sig, () => { shut(); process.exit(1); });
  process.on("uncaughtException", (e) => { console.error(e); shut(); process.exit(1); }); }

/* ── **한 판(=한 씨앗)을 처음부터 30분** ── loop_health 의 t=0 규율을 그대로 따른다:
   ① 페이지 뜨기 전에 Math.random 을 씨앗으로 갈아 끼우고
   ② localStorage 메타를 지워 막 시작한 사람으로 만들고
   ③ rAF 를 끊어 「빨리 감기만이 유일한 시간」이 되게 하고
   ④ 난수를 다시 심고 B.newRun() 으로 진짜 0분을 정한다. */
async function runSeed(seed) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  currentTarget = targetId;
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  const seedSrc = `Math.random = (() => { let s = (${seed} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });   // ① 뜨기 전
  await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
  await S("Page.navigate", { url: PAGE });
  await new Promise(r => setTimeout(r, 1500));
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });  // ② 처음부터
  await S("Page.reload", { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4500));
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await new Promise(r => setTimeout(r, 900));
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });     // ③ rAF 끊기
  await new Promise(r => setTimeout(r, 200));
  await S("Runtime.evaluate", { awaitPromise: true, expression:                              // ④ 재심기 + newRun
    `(async()=>{ const B = await import("/js/battle.js"); ${seedSrc} B.newRun(); return "ok"; })()` });

  const rows = [];
  for (let m = 1; m <= MIN; m++) {
    const r = await S("Runtime.evaluate", { expression: TICK(60), awaitPromise: true, returnByValue: true });
    const v = r.result.value;
    if (typeof v === "string" && v.startsWith("ERR")) { console.log(`씨앗 ${seed} ${m}분`, v); break; }
    rows.push(JSON.parse(v));
    if (DEBUG) { const o = rows[rows.length - 1]; console.log(`  씨앗${seed} ${String(m).padStart(2)}분 층${o.floor}(최고${o.deepest}) Lv${o.lv} 판${o.runs} 군세${o.army}`); }
  }
  const fin = JSON.parse((await S("Runtime.evaluate", { expression: FINAL, awaitPromise: true, returnByValue: true })).result.value);
  await raw("Target.closeTarget", { targetId }); currentTarget = null;
  return fin;
}

/* ── **한 분(60초)을 0.05 초씩 빨리 감는다** ── 셈은 전부 window.__AP 에 쌓여
   evaluate 호출 사이에도 남는다. auto()/트리찍기는 main.js 의 그리는 고리가 하던
   0.35 초 박자로 부른다(loop_health 와 같은 이유 — step 만 돌리면 군대가 안 선다). */
const TICK = (sec) => `(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.__S; let n = Math.round(${sec} / 0.05), at = 0;
  const impactAt = B.SWING_T * (1 - B.IMPACT_AT);   // 팔이 뻗는 칸 = 0.6*0.45 = 0.27
  const A = window.__AP || (window.__AP = {
    sec:{skel:0,ghoul:0,golem:0,own:0}, taken:{skel:0,ghoul:0,golem:0,own:0},
    dealt:{skel:0,ghoul:0,golem:0,own:0}, deaths:{skel:0,ghoul:0,golem:0,own:0},
    survSum:{skel:0,ghoul:0,golem:0,own:0}, survN:{skel:0,ghoul:0,golem:0,own:0},
    births:{skel:0,ghoul:0,golem:0,own:0},
    live:new Map(), T:0, totSec:0, took:[] });
  const buck = (u) => u.own ? "own" : (A.sec[u.kind]!==undefined ? u.kind : "own");

  /* ── **군세의 트리를 사람처럼 찍는다** ── 검수기(loop_health)는 트리를 안 찍어
     구울/골렘이 영영 안 열려 해골만 나온다. 여기서는 **군세 가지를 먼저 뚫어**
     둘을 다 해금하고(bone→armor→ghoul→legion→golem, 각 1랭크), 남는 점수는
     되풀이 노드(bone 5·armor 5·legion 3)에 붓는다. take() 는 결정적(난수 없음). */
  const pick = () => {
    while (C.spLeft() > 0) {
      let did = false;
      for (const gid of ["bone","armor","ghoul","legion","golem"])   // 등뼈: 각 1랭크 먼저
        if (C.rank(gid) < 1 && !C.takeWhy(gid)) { C.take(gid); A.took.push(gid); did = true; break; }
      if (did) continue;
      for (const fid of ["bone","armor","legion"])                    // 채우기: 되풀이 노드
        if (!C.takeWhy(fid)) { C.take(fid); A.took.push(fid); did = true; break; }
      if (!did) break;   // 지금은 레벨에 막혀 못 찍음 — 다음 틱에서 다시 본다
    }
  };

  for (let i = 0; i < n; i++) {
    try {
      /* ── **종별 준 피해**(근사) ── battle.js 568~597 의 impact 해소를 step **전에** 흉내낸다.
         step 안에서 swing 이 먼저 dt 만큼 줄고(561줄) 그 뒤 (swing>impactAt)면 건너뛴다 —
         즉 이번 프레임에 터지는 조건은 (현재 swing - dt) <= impactAt. pending 이 있고
         표적이 아직 살아 있으면 p.dmg 를 종에 붙인다. ★ 근사인 이유: 같은 프레임에서
         다른 소환수가 먼저 그 표적을 죽이면 실제로는 허공을 치지만(tgt.hp<=0 → continue)
         step 전 스냅샷에서는 아직 살아 있어 과다 계상될 수 있다. 그래서 준 피해는 **근사**. */
      for (const u of S.minions) {
        const p = u.pending;
        if (p && (u.swing - 0.05) <= impactAt && p.tgt && p.tgt.hp > 0 && !p.core)
          A.dealt[buck(u)] += p.dmg || 0;
      }

      B.step(0.05); A.T += 0.05; A.totSec += 0.05;

      if (S.dead) {                                   // 판이 끝났다 — 사람이 「다시」를 누르는 몫
        C.META.runs++; B.newRun();
        /* 판 끝에 살아 있던 군세는 개별로 죽은 게 아니라 newRun 이 지운 것이라
           죽음/생존에 안 센다 — live 를 비워 다음 틱의 죽음 판정에 안 걸리게 한다. */
        A.live.clear();
        continue;
      }

      /* ── **머릿수·받은 피해·태어남** ── step 뒤의 판이 이 0.05 초의 상태다. */
      const cur = new Set();
      for (const u of S.minions) {
        const b = buck(u); cur.add(u.id); A.sec[b] += 0.05;
        const L = A.live.get(u.id);
        if (L) { const d = L.hp - u.hp; if (d > 0.0001) A.taken[b] += d; L.hp = u.hp; }
        else { A.births[b]++; A.live.set(u.id, { b, birth: A.T, hp: u.hp }); }
      }
      /* ── **죽음·생존시간** ── live 에 있는데 판에서 사라진 id 는 싸우다 죽은 것이다. */
      for (const [uid, L] of Array.from(A.live))
        if (!cur.has(uid)) { A.deaths[L.b]++; A.survSum[L.b] += A.T - L.birth; A.survN[L.b]++; A.live.delete(uid); }

      if ((at += 0.05) >= 0.35) { at = 0; pick(); window.auto(); }   // 그리는 고리가 하던 일
    } catch (e) { return "ERR " + e.message; }
  }
  return JSON.stringify({ floor: S.floor, deepest: C.META.deepest, runs: C.META.runs, lv: C.META.lv, army: S.minions.length });
})()`;

/* ── **판이 끝난 뒤 한 번** — window.__AP 를 걷어 종별 요약과 찍은 트리 랭크를 낸다. */
const FINAL = `(async()=>{ const C = await import("/js/core.js"); const A = window.__AP || {};
  const tree = {}; for (const idn of ["bone","armor","ghoul","legion","golem"]) tree[idn] = C.rank(idn);
  return JSON.stringify({
    sec: A.sec, taken: A.taken, dealt: A.dealt, deaths: A.deaths,
    survSum: A.survSum, survN: A.survN, births: A.births,
    totSec: A.totSec, tree,
    deepest: C.META.deepest, runs: C.META.runs, lv: C.META.lv,
  });
})()`;

/* ── **출력** — 씨앗마다 몇 줄, 그리고 셋 평균 한 뭉치. 종은 skel·ghoul·golem 만
   퍼센트로(지배 소환수 own 은 따로 표시 — 원래 적이라 「군세의 종류」 밖이다). */
const SPS = ["skel", "ghoul", "golem"];
const NM = { skel: "해골", ghoul: "구울", golem: "골렘", own: "지배" };
const results = [];
console.log(`\n■ army_probe — ${MIN}분 · 씨앗 ${SEEDS.join("·")} · (%% = 시간가중 머릿수, 종별 마리·초 / 해골+구울+골렘 마리·초)\n`);
for (const seed of SEEDS) {
  const R = await runSeed(seed); results.push({ seed, R });
  const denom = SPS.reduce((a, k) => a + R.sec[k], 0) || 1;
  const pct = (k) => Math.round(R.sec[k] / denom * 1000) / 10;
  const avgAlive = (k) => R.sec[k] / Math.max(0.05, R.totSec);
  const surv = (k) => R.survN[k] ? R.survSum[k] / R.survN[k] : 0;
  const ownPctAll = Math.round(R.sec.own / (denom + R.sec.own) * 1000) / 10;
  console.log(`씨앗 ${seed}  최고층 ${R.deepest} · 판 ${R.runs} · Lv ${R.lv} · 트리[bone${R.tree.bone}/armor${R.tree.armor}/ghoul${R.tree.ghoul}/legion${R.tree.legion}/golem${R.tree.golem}]`);
  console.log(`  머릿수%%  해골 ${pct("skel")}%% · 구울 ${pct("ghoul")}%% · 골렘 ${pct("golem")}%%   (지배 own ${ownPctAll}%% of 전체·따로)`);
  console.log(`  선 수평균 해골 ${avgAlive("skel").toFixed(2)} · 구울 ${avgAlive("ghoul").toFixed(2)} · 골렘 ${avgAlive("golem").toFixed(2)}   소환성공 구울×${R.births.ghoul} 골렘×${R.births.golem} 해골×${R.births.skel}`);
  console.log(`  받은피해 해골 ${Math.round(R.taken.skel)} · 구울 ${Math.round(R.taken.ghoul)} · 골렘 ${Math.round(R.taken.golem)}   죽음 해골${R.deaths.skel}/구울${R.deaths.ghoul}/골렘${R.deaths.golem}`);
  console.log(`  생존초평균 해골 ${surv("skel").toFixed(1)} · 구울 ${surv("ghoul").toFixed(1)} · 골렘 ${surv("golem").toFixed(1)}   준피해(근사) 해골 ${Math.round(R.dealt.skel)} · 구울 ${Math.round(R.dealt.ghoul)} · 골렘 ${Math.round(R.dealt.golem)}`);
}
/* ── 셋 평균 ── 머릿수%% 는 각 씨앗의 마리·초를 합쳐서 낸다(마리·초 가중). */
if (results.length > 1) {
  const sum = (sel) => results.reduce((a, r) => a + sel(r.R), 0);
  const secTot = (k) => sum(R => R.sec[k]);
  const denom = SPS.reduce((a, k) => a + secTot(k), 0) || 1;
  const pct = (k) => Math.round(secTot(k) / denom * 1000) / 10;
  const ownPctAll = Math.round(secTot("own") / (denom + secTot("own")) * 1000) / 10;
  const deepSum = sum(R => R.deepest), runSum = sum(R => R.runs);
  console.log(`\n▣ 셋 평균(마리·초 가중)`);
  console.log(`  머릿수%%  해골 ${pct("skel")}%% · 구울 ${pct("ghoul")}%% · 골렘 ${pct("golem")}%%   (지배 own ${ownPctAll}%%)`);
  console.log(`  받은피해 해골 ${Math.round(sum(R => R.taken.skel))} · 구울 ${Math.round(sum(R => R.taken.ghoul))} · 골렘 ${Math.round(sum(R => R.taken.golem))}`);
  console.log(`  소환성공 합 구울×${sum(R => R.births.ghoul)} 골렘×${sum(R => R.births.golem)} 해골×${sum(R => R.births.skel)}`);
  console.log(`  최고층 합 ${deepSum} (${results.map(r => r.R.deepest).join("+")}) · 판수 합 ${runSum}`);
  const worst = SPS.map(k => [k, pct(k)]).sort((a, b) => b[1] - a[1])[0];
  const over = SPS.filter(k => pct(k) > 70).map(k => NM[k]);
  console.log(`  → 판정: 최다 ${NM[worst[0]]} ${worst[1]}%% · 70%% 초과 ${over.length ? over.join("·") : "없음"} · 구울>0 ${pct("ghoul") > 0 ? "예" : "아니오"} · 골렘>0 ${pct("golem") > 0 ? "예" : "아니오"}`);
}
fs.writeFileSync(process.argv[3] || "/tmp/army_probe.json", JSON.stringify(results, null, 1));
console.log("\nerrors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
bws.close();
