/* ══════════════════════════════════════════════════════════════
   **스킬 트리 창** — 병수님: "내가 직접 스킬트리를 찍어서 나만의 빌드를 구성하는거지"
   ──────────────────────────────────────────────────────────────
   디아블로 2 의 그 화면이 좋은 이유는 표가 아니라 **그림**이기 때문이다:

     · 세 줄기가 **나란히** 서 있어 「어디로 팔지」가 한눈에 보인다
     · 위에서 아래로 **선이 이어져** 무엇이 무엇을 여는지 보인다
     · 못 찍는 것은 어둡되 **사라지지 않는다** — 앞날이 보여야 계획을 세운다
     · 찍은 칸에는 **랭크 숫자**가 박힌다. 숫자가 늘어나는 맛이 여기 있다

   그래서 목록이 아니라 **판**으로 그린다. 상인·대장간과 같은 결(칸 + 툴팁)이되,
   칸이 격자가 아니라 **줄기**로 서 있는 것만 다르다.
   ══════════════════════════════════════════════════════════ */
import { $, exclLockedBy, META, TREE, nodeOf, rank, saveMeta, spLeft, spTotal, spUsed, syncSkills, take, takeWhy } from "./core.js";

let pick = "bone";                 // 고른 칸

/* ★ 자(`tools/icon_qa.mjs`)가 **잠긴 칸까지** 보게 노드 id 를 내놓는다. 이게 없던
   동안 자는 트리를 **0칸으로 세고** 「빠진 칸」을 belt 여섯 개에서만 찾았다 — 잠긴
   칸이 빈칸이어도 통과가 났다는 뜻이다(2026-08-13). 자는 사람이 지나는 길로 가야 한다. */
window.__TREE_IDS = Object.fromEntries(TREE.flatMap((c) => c.nodes.map((n) => [n.id, n.max])));


/** 판을 다시 그린다. **상태에서 통째로 뽑는다** — 부분 갱신은 어긋날 자리를 만든다. */
export function drawTree() {
  $("treeCols").innerHTML = TREE.map((col) => {
    /* ★ 줄기는 **줄(row) 단위**로 그린다 — 한 줄에 칸이 둘이면 그것이 «갈래»다
       (`alt:1` 이 앞 칸 옆에 선다). 목록 자체는 여전히 납작해서 core.js 의 훑기
       (NODE·관문 배율·저장 거르기)는 한 줄도 안 바뀐다 — 갈라지는 것은 **그림뿐**이다. */
    const rows = [];
    for (const nd of col.nodes) {
      if (nd.alt && rows.length) rows[rows.length - 1].push(nd);
      else rows.push([nd]);
    }
    const cells = rows.map((row, i) => {
      const tiles = row.map((nd) => {
        const r = rank(nd.id), why = takeWhy(nd.id), shut = exclLockedBy(nd.id);
        /* 상태는 넷이다: **찍음 / 찍을 수 있음 / 아직 / 갈래에서 닫힘**.
           마지막 것을 `lock` 과 같은 색으로 두면 「레벨이 모자란가」로 읽혀서,
           초기화 전에는 안 열리는 칸을 사람이 계속 기다리게 된다. */
        const cls = r >= nd.max ? "full" : r > 0 ? "some" : shut ? "xlock" : why ? "lock" : "open";
        /* ══ 디아블로 2 의 그 칸 ══ 병수님: "디2 스타일로".
           저쪽 트리는 **네모난 아이콘 단추**가 전부다. 이름은 칸에 없고(뜰 때만 나온다),
           칸에는 그림과 **모서리의 랭크 숫자**만 있다. 그리고 칸과 칸은 **화살표**로 잇는다.
           우리는 한글 이름을 아예 빼면 처음 여는 사람이 못 읽으니 작게 밑에 붙인다. */
        const rankBadge = r > 0 ? `<b class="tRank">${r}</b>` : "";
        const gate = META.lv < nd.lv ? `<i class="tGate">Lv.${nd.lv}</i>` : "";
        return `<div class="tNode ${cls}${nd.id === pick ? " sel" : ""}${nd.big ? " big" : ""}"
             data-tn="${nd.id}">
          <span class="tTile">
            <img class="tIco" src="assets/ui/tree/${nd.id}.png" alt=""
                 onerror="this.style.visibility='hidden'">
            ${rankBadge}${gate}
          </span>
          <span class="tn">${nd.n}</span>
        </div>`;
      }).join("");
      /* 잇는 선은 **선행을 찍었을 때 불이 들어온다** — 어디까지 길이 뚫렸는지가
         글자를 읽지 않아도 보인다. 갈래 줄에서는 **윗줄 아무 칸이나** 찍혔으면 켠다. */
      const lit = i && rows[i - 1].some((p) => rank(p.id) > 0) ? " lit" : "";
      const link = i ? `<div class="tLink${lit}"></div>` : "";
      return row.length > 1 ? `${link}<div class="tFork">${tiles}</div>` : `${link}${tiles}`;
    }).join("");
    return `<div class="tCol" data-k="${col.k}"><h3>${col.n}</h3>${cells}</div>`;
  }).join("");

  /* 툴팁 — 고른 칸이 **지금 무엇을 주고 있고 한 점 더 넣으면 무엇이 되는지.**
     「+10%」만 적으면 지금 몇 %인지를 사람이 암산해야 한다. */
  const nd = nodeOf(pick), r = rank(pick), why = takeWhy(pick);
  const maxed = r >= nd.max;
  /* ★ 갈래는 **찍기 전에** 말해야 한다. 찍고 나서 옆 칸이 잠긴 것을 발견하면 그건
     선택이 아니라 사고다 — 되돌리려면 트리를 통째로 초기화해야 하기 때문이다.
     그래서 아직 안 갈렸으면 「무엇을 포기하는지」를, 갈렸으면 「무엇을 골랐는지」를 적는다. */
  const twin = nd.excl && TREE.flatMap((c) => c.nodes).find((o) => o.excl === nd.excl && o.id !== nd.id);
  const forkNote = !twin ? ""
    : exclLockedBy(pick) ? `<div class="tipFork shut">갈래가 갈렸다 — 「${twin.n}」을 고른 판이다</div>`
    : rank(pick) > 0     ? `<div class="tipFork">이 갈래를 골랐다 — 「${twin.n}」은 잠겼다</div>`
    :                      `<div class="tipFork">갈래 · 찍으면 「${twin.n}」이 잠긴다</div>`;
  $("treeTip").innerHTML =
    `<div class="tipName ${maxed ? "t4" : r ? "t2" : "t0"}">${nd.n}
       <span class="lv">${r}/${nd.max}</span></div>
     <div class="tipKind">요구 레벨 ${nd.lv}${nd.req ? ` · 선행 ${nodeOf(nd.req).n}` : ""}</div>
     <div class="tipStat">${nd.d}</div>${forkNote}` +
    (maxed
      ? `<div class="tipNote">최대 단계 · 더 올릴 수 없음</div>`
      : `<div class="tipBuy"><span class="cost${why ? " no" : ""}">${why || "점수 1 소모"}</span>
           <button class="btn" data-tk="${pick}" ${why ? "disabled" : ""}>찍기</button></div>`);

  $("treeSp").textContent = spLeft();
  $("treeSpAll").textContent = `${spUsed()}/${spTotal()}`;
  edgeFade();
  /* 고른 칸이 접힌 자리에 있으면 **설명만 바뀌고 어느 칸인지 안 보인다** — 끌어온다.
     nearest 라 이미 보이는 칸은 화면이 안 흔들린다. */
  $("treeCols").querySelector(".tNode.sel")?.scrollIntoView({ block: "nearest" });
}

/* 아래 끝의 흐림은 **더 있을 때만** 켠다 — 다 보이는데도 흐려져 있으면
   「뭔가 잘렸나」로 읽힌다. 창을 그릴 때와 구를 때 둘 다에서 본다. */
function edgeFade() {
  const w = $("treeWrap"), c = $("treeCols"); if (!w || !c) return;
  const more = c.scrollHeight - c.clientHeight - c.scrollTop > 2;
  w.classList.toggle("atEnd", !more);
}
/* 모듈은 defer 라 여기 올 때 DOM 이 이미 있다 — 기다릴 것 없이 바로 건다. */
$("treeCols")?.addEventListener("scroll", edgeFade, { passive: true });
addEventListener("resize", edgeFade);

/** 남은 점수가 있으면 **레벨 옆에 점**을 띄운다 — 창을 안 열어도 알 수 있어야
 *  「찍을 게 생겼다」가 전달된다(안 그러면 레벨업이 아무 일도 아닌 게 된다). */
let lastSp = -1;
export function markSp() {
  const n = spLeft();
  if (n === lastSp) return;                 // **바뀔 때만** 손댄다 — hud 는 매 프레임 돈다
  lastSp = n;
  const el = $("spDot"); if (!el) return;
  el.classList.toggle("on", n > 0);
  el.textContent = n > 0 ? n : "";
}

document.addEventListener("click", (e) => {
  const n = e.target.closest && e.target.closest("[data-tn]");
  if (n) { pick = n.getAttribute("data-tn"); drawTree(); return; }
  const tk = e.target.getAttribute && e.target.getAttribute("data-tk");
  if (tk && take(tk)) { drawTree(); markSp(); document.dispatchEvent(new Event("treeChanged")); }
});

/* 초기화 — 찍은 것을 전부 되돌린다(점수는 레벨에서 나오므로 그대로 살아난다).
   ★ 「자동 배분」 단추는 없앴다(2026-08-18 · core.js autoSpend 머리말). 예전에는 여기서
     자동을 같이 꺼야 했다 — 안 끄면 누른 순간 같은 계획이 다시 서서 **아무 일도 안 한
     단추**가 되었기 때문이다. 이제 그럴 자리가 없다. */
$("treeWipe")?.addEventListener("click", () => {
  META.tree = {};
  syncSkills(); saveMeta();
  drawTree(); markSp(); document.dispatchEvent(new Event("treeChanged"));
});
