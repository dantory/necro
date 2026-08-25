/* ══ 자가 «설 때까지» 기다리는 문 ══ (V-57c · 2026-08-25)
 *
 * 왜 만들었나: `qa_all` 이 **판마다 다른 곳**에서 하나씩 울었다(24/25 인데 그 하나가
 * 안 고정이다). 따로 돌리면 넷·셋 판 전부 통과한다 — 고장이 아니라 **자가 너무 일찍
 * 재는 것**이었다. 두 자 모두 `await wait(4200)` 같은 **못박은 잠**으로 「이제 됐겠지」를
 * 하고 있었고, 브라우저가 바쁜 판에서는 그 4.2초가 모자랐다:
 *   · `fx_art`  — `SKILLS` 가 아직 안 채워진 채 `sk.mp` 를 읽어 터진다(`syncSkills` 전).
 *   · `bagfit_qa` — 글꼴·그림이 서기 전에 `fitDollStat` 이 돌아 18.4px 를 잃는다.
 *
 * ★ 못박은 잠은 **느린 판에서 틀리고 빠른 판에서 시간을 버린다.** 조건을 적어 두고
 *   그것이 참이 될 때까지 본다 — 보통 훨씬 빨리 끝나고, 안 되면 **그렇게 말한다.**
 * ★ 문이 안 열리면 **조용히 넘어가지 않는다** — 「못 쟀다」로 나가야 그 판정이
 *   「게임이 틀렸다」와 안 섞인다([[silent-zero-is-not-an-observation]]).
 */

/** 조건이 참이 될 때까지 본다. `ev` 는 페이지 안에서 식을 재는 함수(returnByValue).
 *  돌려주는 것: `{ok, ms, last}` — `ok:false` 면 `last` 에 **마지막으로 본 것**이 담긴다
 *  (「왜 안 열렸나」를 그 자리에서 말하기 위해서다). */
export async function waitUntil(ev, expr, { secs = 30, every = 150 } = {}) {
  const t0 = Date.now(), lim = secs * 1000;
  let last = null;
  for (;;) {
    last = await ev(`(()=>{ try { return (${expr}) } catch (e) { return "ERR " + e.message } })()`);
    if (last === true) return { ok: true, ms: Date.now() - t0, last };
    if (Date.now() - t0 >= lim) return { ok: false, ms: Date.now() - t0, last };
    await new Promise(r => setTimeout(r, every));
  }
}

/** ① **앱이 섰는가** — 모듈이 다 돌아 window 에 붙었는가.
 *  `main.js` 끝의 `Object.assign(window, …)` 가 지나야 참이 된다. */
export const BOOTED = `!!(window.S && window.META && window.SKILLS && window.saveMeta)`;

/** ② **글꼴과 그림이 섰는가** — 재기 전에 이것이 서야 크기가 안 흔들린다.
 *  ★ `document.fonts.ready` 는 약속이라 여기서 **한 번 걸어 두고** 그 뒤로는 깃발만 본다
 *    (매번 await 하면 잴 때마다 한 판씩 늦는다). */
export const PAINTED = `(() => {
  if (!window.__qaFonts) { window.__qaFonts = 1;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => window.__qaFontsOk = 1); }
  if (!window.__qaFontsOk) return "글꼴 기다림";
  const bad = [...document.images].filter(i => !i.complete);
  return bad.length ? ("그림 " + bad.length + " 장 기다림") : true;
})()`;

/** ③ **스킬 표가 채워졌는가** — `SKILLS` 는 빈 배열로 시작해 `syncSkills()` 가 채운다.
 *  나무 뒤의 것(구울·골렘)은 세이브를 심고 다시 그려야 들어오므로, **있어야 할 id 를
 *  대 놓고** 묻는다. 「배열이 있다」로는 못 막는다 — 08-25 에 그렇게 터졌다. */
export const hasSkills = (ids) => `(() => {
  const S = window.SKILLS; if (!Array.isArray(S)) return "SKILLS 없음";
  const miss = ${JSON.stringify(ids)}.filter(id => !S.some(s => s.id === id));
  return miss.length ? ("스킬 없음: " + miss.join(",")) : true;
})()`;

/** ④ **자리가 멎었는가** — 식이 돌려주는 «생김새 지문»이 잇달아 같아질 때까지 본다.
 *  글꼴이 늦게 서면 한 번 더 다시 그려지므로, 참·거짓이 아니라 **안 바뀜**을 본다. */
export async function settle(ev, expr, { need = 2, secs = 8, every = 120 } = {}) {
  const t0 = Date.now(), lim = secs * 1000;
  let prev = null, same = 0, cur = null;
  for (;;) {
    cur = await ev(`(()=>{ try { return JSON.stringify(${expr}) } catch (e) { return "ERR " + e.message } })()`);
    same = (cur === prev) ? same + 1 : 0;
    prev = cur;
    if (same >= need) return { ok: true, ms: Date.now() - t0, last: cur };
    if (Date.now() - t0 >= lim) return { ok: false, ms: Date.now() - t0, last: cur };
    await new Promise(r => setTimeout(r, every));
  }
}

/** 문이 안 열렸을 때 **말하고 나가는** 한 자리 — 자마다 다르게 적으면 또 갈린다. */
export function cannotMeasure(what, g) {
  console.log(JSON.stringify({
    판정: "못 쟀다 — 자가 고장 났다(게임 판정이 아니다)",
    까닭: `${what} 문이 ${(g.ms / 1000).toFixed(1)}초 안에 안 열렸다`,
    마지막으로_본_것: g.last,
  }, null, 1));
  process.exit(2);
}
