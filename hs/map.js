import { bossKindFor } from "./loot.js";

// ★ V-183 — 이동 속도를 올린다. V-183 의 자(tools/hs_v183_density.mjs)로 재 보니
//   화면 안 동시 적 p50 이 **0** 이었다(깬 팩은 8인데). 까닭은 적이 플레이어(268)보다
//   너무 느려(46~78) 깨어난 뒤에도 못 붙고 지도 곳곳에 꼬리처럼 늘어져 화면 밖으로
//   샜기 때문이다 — 「뒤처진 놈이 안 붙으면 떼가 안 된다」. 대략 1.6~1.7배 올려 붙게 한다
//   (그래도 플레이어보다 느리다 — 도망은 여전히 되지만 서서 싸우면 몰려든다).
// ★ V-183b — 다시 재 보니 이걸로도 화면 안 동시 적 **중앙값**은 13 뿐이었다(봉우리 p95 는
//   58 로 넉넉한데). 까닭: 깬 팩이 21개(=산 적 수백)인데도 대부분 **화면 밖에 꼬리처럼**
//   늘어져 있었다 — 플레이어(268)가 다음 팩으로 옮길 때마다 앞 무리를 두고 가서 화면이
//   빈다. 봉우리가 아니라 **골(중앙값)**을 메우려면 뒤처진 놈이 이동 중에도 붙어 있어야
//   한다 → 속도를 한 번 더 올린다(여전히 플레이어보단 느리다).
// ★ V-183c — 속도만으로는 봉우리(p95 72)만 커지고 **중앙값은 13** 그대로였다. 분포가
//   둘로 갈렸다: 몰려든 무리를 군세+뼈창이 «한 번에» 녹이고 → 빈 골. 화면에 «동시에»
//   남는 수 = 도착률 × 화면 체류시간(리틀의 법칙)인데, 체류시간이 즉사라 0 에 가까웠다.
//   그래서 **체력을 올려** 무리가 화면에 더 오래 남게 한다(골이 메워진다). 죽는 데 여러
//   대 맞아야 하니 몰살감(처치 연쇄)도 실제로 «잇달아» 터진다. em(엘리트 3.2배)·층 배수는
//   그대로라 위층에서 과하지 않게 기본값만 손댄다.
// ★ V-208 — 몸 크기를 일제히 ×0.72 로 내렸다(병수님 「캐릭터 크기가 너무 과하다」).
//   재 보니 화면의 13~26% 였는데 레퍼런스는 8~10% 다. 부딪히는 반지름(r)은 그대로 둔다 —
//   그것은 「몸이 얼마나 자리를 차지하나」라 그림 크기와 따로 잡아야 붐빔이 안 흔들린다.
const MOB_TYPES = [
  { base: "mob/fallen", hp: 42, dmg: 6, spd: 178, h: 53, r: 16, gold: [4, 9] },
  { base: "mob/zombie", hp: 70, dmg: 9, spd: 138, h: 66, r: 20, gold: [5, 11] },
  { base: "mob/skelarch", hp: 48, dmg: 8, spd: 166, h: 59, r: 16, gold: [5, 10] },
  { base: "mob/shaman", hp: 54, dmg: 10, spd: 156, h: 60, r: 17, gold: [7, 13] },
  { base: "mob/brute", hp: 190, dmg: 18, spd: 116, h: 85, r: 26, gold: [12, 22] },
];
const BOSS_TYPE = { base: "mob/boss", hp: 900, dmg: 34, spd: 88, h: 108, r: 40, gold: [80, 140] };
// ★ V-230 — 층 주인 넷. 이름은 화면에 뜨고(들어설 때·머리 위), 색은 그리는 쪽(main.js drawEnemy)에서
//   갈린다(새 에셋 없이 색조로). 여기선 이름·몸피만 — 몸피를 갈라 실루엣도 서로 다르게 한다.
const BOSS_NAMES = ["뼈 왕", "역병 주술사", "무덤 도살자", "저주받은 사제"];
const BOSS_SIZE = [1.12, 0.98, 1.20, 1.06];   // 도살자가 가장 크고 역병술사가 가장 여위게

// ★ V-183 — 네임드(champion) 이름을 굴린다: 형용사 + 종족 + 칭호, 대문자(HS 의
//   「SLITHER COMMANDER」꼴). 색은 그리는 쪽(drawEnemy)에서 HS_STYLE 「빛깔·글꼴」의
//   초록을 준다. 이미 있는 m.elite 위에 얹기만 한다 — 새 종을 만들지 않는다.
// ★ V-209 — 정예 이름도 한글로(병수님 「영어랑 한글 섞였네」). 「[꾸밈] [종족] [칭호]」.
const ELITE_ADJ = ["썩어가는", "저주받은", "비열한", "사나운", "음산한", "비참한", "피에 젖은", "창백한", "음침한", "곪아터진"];
const ELITE_TITLE = ["지휘관", "군주", "포식자", "도살자", "전령", "폭군", "약탈자", "재앙"];
const ELITE_SPECIES = { "mob/fallen": "타락자", "mob/zombie": "썩은것", "mob/skelarch": "뼈술사", "mob/shaman": "주술사", "mob/brute": "야수", "mob/boss": "대군주" };
function rollEliteName(base) {
  const sp = ELITE_SPECIES[base] || "공포";
  return `${ELITE_ADJ[(Math.random() * ELITE_ADJ.length) | 0]} ${sp} ${ELITE_TITLE[(Math.random() * ELITE_TITLE.length) | 0]}`;
}

function rint(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); }

// ★★ V-202 — genFloor 를 BSP(공간을 재귀로 쪼개기)로 다시 썼다. 병수님 「맵도 좀 이상하고」
//   (2026-08-31 11:36). 옛 방식은 방을 무작위 자리에 뿌리고(겹침만 피함) 복도를 방중심→
//   방중심 L 로 이어, 자(tools/hs_v202_map.mjs)로 재 보니:
//     · 관통 복도 층10 평균 1.63(최대 3) — L 이 남의 방을 가로질렀다
//     · 방 넓이 최대/최소 비 2.0 언저리 — 방이 다 비슷했다(큰 홀도 골방도 없다)
//     · 바닥 비율 36.9%(층1) → 16.7%(층10) — 깊을수록 W·H 만 커져 휑해졌다
//   값을 만져선 「무작위로 뿌린 사각형」을 못 벗어난다([[seam-not-values]]). 구조를 바꿨다:
//   ① 층 전체를 한 칸으로 두고 가로/세로로 재귀 분할(분할비 0.35~0.65, 최소칸 아래론 안 쪼갬).
//      깊이·최소칸을 층 번호로 조절해 «깊을수록 방이 많아지게» 한다(넓어지기만 하던 꼴을 고침).
//   ② 잎 칸마다 그 칸의 40~90% 를 차지하는 방을 하나 — 큰 홀과 좁은 골방이 저절로 갈린다.
//   ③ 복도는 형제 서브트리를 이을 때만, «쪼갠 경계 위»로 낸다(H-V-H). 왼쪽에선 경계에 가장
//      가까운 방(cx 최대), 오른쪽에선 cx 최소를 골라 이으므로 «제3의 방을 관통하지 않는다».
//   방∪복도 꼴({x,y,w,h})·room.cx/cy/dead/visited/cleared 는 그대로 — V-201 충돌 코드가 쓴다.
const CORRIDOR_W = 150, HW = CORRIDOR_W / 2, LEAF_PAD = 36;

function bspSplit(cell, depth, maxDepth, minW, minH) {
  const node = { ...cell, axis: null, mid: 0, left: null, right: null, room: null };
  const canV = cell.w >= minW * 2;
  const canH = cell.h >= minH * 2;
  if (depth >= maxDepth || (!canV && !canH)) return node;
  const cutV = canV && canH ? Math.random() < cell.w / (cell.w + cell.h) : canV;   // 긴 쪽을 더 자주 쪼갠다
  const ratio = 0.35 + Math.random() * 0.30;
  if (cutV) {
    const mid = Math.min(Math.max(Math.round(cell.x + cell.w * ratio), cell.x + minW), cell.x + cell.w - minW);
    node.axis = "v"; node.mid = mid;
    node.left = bspSplit({ x: cell.x, y: cell.y, w: mid - cell.x, h: cell.h }, depth + 1, maxDepth, minW, minH);
    node.right = bspSplit({ x: mid, y: cell.y, w: cell.x + cell.w - mid, h: cell.h }, depth + 1, maxDepth, minW, minH);
  } else {
    const mid = Math.min(Math.max(Math.round(cell.y + cell.h * ratio), cell.y + minH), cell.y + cell.h - minH);
    node.axis = "h"; node.mid = mid;
    node.left = bspSplit({ x: cell.x, y: cell.y, w: cell.w, h: mid - cell.y }, depth + 1, maxDepth, minW, minH);
    node.right = bspSplit({ x: cell.x, y: mid, w: cell.w, h: cell.y + cell.h - mid }, depth + 1, maxDepth, minW, minH);
  }
  return node;
}
function bspLeaves(node, out) {
  if (!node.left && !node.right) { out.push(node); return; }
  bspLeaves(node.left, out); bspLeaves(node.right, out);
}
// 서브트리에서 어떤 축의 중심이 최대/최소인 방 — 경계에 가장 가까운 방을 고른다.
function pickExtreme(node, key, wantMax) {
  let best = null;
  (function rec(n) {
    if (!n) return;
    if (n.room && (!best || (wantMax ? n.room[key] > best[key] : n.room[key] < best[key]))) best = n.room;
    rec(n.left); rec(n.right);
  })(node);
  return best;
}

export function genFloor(floor) {
  // ★ 넓이는 조금만 키우고 방 수는 «깊이·최소칸»으로 늘린다 — 옛 꼴의 «넓어지기만」을 뒤집는다.
  const W = 3000 + floor * 180, H = 2000 + floor * 120;
  const maxDepth = Math.min(13, 5 + floor);
  const minW = Math.max(600, 700 - floor * 8);
  const minH = Math.max(500, 600 - floor * 7);
  const root = bspSplit({ x: 80, y: 80, w: W - 160, h: H - 160 }, 0, maxDepth, minW, minH);

  // ── V-239 ② 21층+ 곡선 — 20층 이하는 손대지 않는다(그 층에선 deep=false → byte-동일). ──
  //   깊이는 여태 «수만» 커졌다(hp 스케일 1+0.35f 가 직선으로 뻗어 40층=×15, 50층=×18.5 →
  //   같은 놈이 두꺼워지기만 해 지루했다). 21층부터 세 가지로 «판을 바꾼다»:
  //     ⓐ hp 팽창을 꺾는다 — 20층(×8.0)에서 기울기 0.35→0.22 로 눕힌다(40층 ×12.4·50층 ×14.6 →
  //        옛 ×15/×18.5 대비 −17%/−21%. dmg 곡선은 그대로 둬 «위험»은 유지, «부풀기»만 깎는다).
  //     ⓑ 엘리트 비율 0.25→0.42 · 무리 3~4(옛 2~3) — 밀도로 압박을 준다(수 아닌 «떼»).
  //     ⓒ 30층+ 주인 둘(다른 주인·다른 방) — 관문이 사건이 되게.
  //   되돌림: globalThis.__DEEPCURVE===false → deep 상수가 늘 false → 옛 경로만 탄다(어느 층이든 지문 동일).
  const deep = globalThis.__DEEPCURVE !== false && floor > 20;
  // ── V-239 ① 회차(승천) 배수 — 회차마다 적이 세진다. 회차 0 → ascMul=1(곱해도 값 불변 → 지문 동일). ──
  //   RNG 를 한 톨도 안 건드린다(스케일 «값»만 곱한다·Math.random 호출 수 불변). start()가 __asc 를 심는다.
  const ascMul = 1 + 0.12 * (globalThis.__asc || 0);

  const rooms = [];
  const leafList = [];
  bspLeaves(root, leafList);
  for (const leaf of leafList) {
    const availW = leaf.w - LEAF_PAD * 2, availH = leaf.h - LEAF_PAD * 2;
    const w = Math.round(availW * (0.32 + Math.random() * 0.63));   // 칸의 32~95% — 큰 홀과 좁은 골방을 벌린다
    const h = Math.round(availH * (0.32 + Math.random() * 0.63));
    const x = leaf.x + LEAF_PAD + Math.round(Math.random() * (availW - w));
    const y = leaf.y + LEAF_PAD + Math.round(Math.random() * (availH - h));
    const r = { x, y, w, h, cx: x + w / 2, cy: y + h / 2, dead: false, visited: false, cleared: false };
    leaf.room = r;
    rooms.push(r);
  }
  // 시작 방을 배열 맨 앞으로 — 좌상단에 가장 가까운 방(pk.room 인덱스가 어긋나지 않게 여기서만 옮긴다).
  let si = 0;
  for (let i = 1; i < rooms.length; i++) if (rooms[i].cx + rooms[i].cy < rooms[si].cx + rooms[si].cy) si = i;
  if (si !== 0) { const t = rooms[0]; rooms[0] = rooms[si]; rooms[si] = t; }

  // 복도 — 쪼갠 경계 위로만(H-V-H / V-H-V). 형제의 «경계에 가장 가까운» 두 방을 잇는다.
  const corridors = [];
  const hRect = (x1, x2, y, link) => corridors.push({ x: Math.min(x1, x2), y: y - HW, w: Math.abs(x2 - x1), h: CORRIDOR_W, horiz: true, link });
  const vRect = (y1, y2, x, link) => corridors.push({ x: x - HW, y: Math.min(y1, y2), w: CORRIDOR_W, h: Math.abs(y2 - y1), horiz: false, link });
  (function connect(node) {
    if (!node.left && !node.right) return;
    connect(node.left); connect(node.right);
    if (node.axis === "v") {
      const A = pickExtreme(node.left, "cx", true), B = pickExtreme(node.right, "cx", false);
      if (!A || !B) return;
      const link = [rooms.indexOf(A), rooms.indexOf(B)];
      hRect(A.cx, node.mid, A.cy, link);
      if (A.cy !== B.cy) vRect(A.cy, B.cy, node.mid, link);   // 세로 기둥을 «경계 위»에 둬 어떤 방도 관통하지 않는다
      hRect(node.mid, B.cx, B.cy, link);
    } else {
      const A = pickExtreme(node.left, "cy", true), B = pickExtreme(node.right, "cy", false);
      if (!A || !B) return;
      const link = [rooms.indexOf(A), rooms.indexOf(B)];
      vRect(A.cy, node.mid, A.cx, link);
      if (A.cx !== B.cx) hRect(A.cx, B.cx, node.mid, link);
      vRect(node.mid, B.cy, B.cx, link);
    }
  })(root);

  for (let i = 2; i < rooms.length; i++) rooms[i].dead = Math.random() < 0.45;

  const start = rooms[0];
  const startX = start.cx, startY = start.cy;

  let far = rooms[1] || rooms[0], fd = 0;
  for (const r of rooms) {
    const d = (r.cx - startX) ** 2 + (r.cy - startY) ** 2;
    if (d > fd) { fd = d; far = r; }
  }
  const stairs = { x: far.cx, y: far.cy - 10, r: 46 };
  far.dead = false;

  const packs = [];
  const chests = [];
  let eid = 0;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    if (room.dead && Math.random() < 0.8) {
      chests.push({ x: room.cx, y: room.cy, opened: false, r: 26 });
    }
    // ★ V-183 — 방당 팩 1~2 → 3~4, 팩당 5~12 → 14~24. 깨우는 반경(WAKE, main.js)을 넓혀
    //   한 방에 든 팩이 함께 깨어나므로, 한 자리에 몰리는 수가 곱으로 는다.
    //   자로 재며 잡았다: 2~3×10~18·WAKE 900 은 p50 16.5·p95 32(미달), 3~4×14~24·WAKE 1050
    //   은 p50 50·p95 134(과함 — 온 층이 한꺼번에 몰려 「벽」이 된다). 그 사이로 내린다.
    // ★ V-202b — 방당 팩 3~4 → 2~3, 팩당 14~24 → 10~14. 자로 재니 층당 놓인 적이 330~762 마리로
    //   «던전 파밍이 아니라 벌판 학살»이었다(tmp/hs_v202b_before.json). 방 수가 깊이로 느는 건 그대로
    //   두고(V-202) 방당 마릿수만 낮춰 층당 ~300 언저리로 내린다. WAKE·팩 배치 꼴은 안 건드린다.
    const n = deep ? rint(3, 4) : rint(2, 3);
    for (let p = 0; p < n; p++) {
      const count = rint(10, 14);
      const px = rint(room.x + 60, room.x + room.w - 60);
      const py = rint(room.y + 60, room.y + room.h - 60);
      const enemies = [];
      const elite = floor >= 1 && Math.random() < (deep ? 0.42 : 0.25);
      for (let k = 0; k < count; k++) {
        const t = MOB_TYPES[Math.min(MOB_TYPES.length - 1,
          Math.floor(Math.random() * (MOB_TYPES.length - (floor < 1 ? 1 : 0)) * (0.6 + Math.random() * 0.4)))];
        let scale = 1 + floor * 0.35;
        if (deep) scale = 8.0 + (floor - 20) * 0.22;
        // ★ V-226 — 깊이 곡선이 «사람보다 가파른가»를 재서 답이 나왔다(2026-09-01 tmp/hs_v226_curves2.json):
        //   층1→층5 에서 적 dmg 중앙은 11→22~25(×2.09) 인데 사람 maxhp 는 4515→4635(×1.03).
        //   점수를 다 vit 에 부어도 사람이 닿는 천장이 ×1.13 이라, 깊이는 «어려워지는 것»이 아니라
        //   사람이 자란 만큼을 통째로 지우고 그 위에 두 배를 더 얹고 있었다(죽은 층 80~87%).
        //   그래서 **hp 곡선은 그대로 두고 dmg 곡선만 눕힌다** — 층5 적은 여전히 두꺼워(×2.75) 싸움이
        //   길고, 다만 한 대가 사람의 성장을 앞지르지 않는다(dmg ×1.49 대 사람 ×1.13 → 순 압박 ×1.32).
        //   되돌릴 손잡이: globalThis.__V226B = false → 옛 «한 곡선» 으로 되돌아간다.
        const dmgScale = (globalThis.__V226B === false ? scale : 1 + floor * 0.14) * ascMul;
        enemies.push(makeMob(t, px + rint(-90, 90), py + rint(-90, 90), scale * ascMul, eid++, elite && k === 0, dmgScale));
      }
      spreadPack(enemies);
      packs.push({ x: px, y: py, enemies, room: i, awake: false });
    }
  }
  if (floor >= 2) {
    const br = far;
    const bhp = (1 + floor * 0.4) * ascMul;
    const bdmg = (globalThis.__V226B === false ? 1 + floor * 0.4 : 1 + floor * 0.16) * ascMul;
    const bm = makeMob(BOSS_TYPE, br.cx, br.cy + 40, bhp, eid++, true, bdmg);
    const kind = bossKindFor(floor);
    bm.boss = true; bm.bossKind = kind; bm.name = BOSS_NAMES[kind];
    bm.h *= BOSS_SIZE[kind]; bm.r *= BOSS_SIZE[kind];
    packs.push({ x: br.cx, y: br.cy + 40, awake: false, room: rooms.indexOf(br), enemies: [bm], boss: true });
    if (deep && floor >= 30) {   // V-239 ⓒ — 30층+ 주인 둘. 시작·계단 방이 아닌 다른 방에 다음 순번 주인.
      let r2 = null;
      for (let i = 1; i < rooms.length; i++) { const rm = rooms[i]; if (rm !== far && !rm.dead) { r2 = rm; break; } }
      if (r2) {
        const bm2 = makeMob(BOSS_TYPE, r2.cx, r2.cy + 40, bhp, eid++, true, bdmg);
        const k2 = (kind + 1) % BOSS_NAMES.length;
        bm2.boss = true; bm2.bossKind = k2; bm2.name = BOSS_NAMES[k2];
        bm2.h *= BOSS_SIZE[k2]; bm2.r *= BOSS_SIZE[k2];
        packs.push({ x: r2.cx, y: r2.cy + 40, awake: false, room: rooms.indexOf(r2), enemies: [bm2], boss: true });
      }
    }
  }

  // ── V-234 뼈 제단 — 층마다 하나(피/뼈/재 셋 중 굴림). 금을 쓰는 첫 자리(상자와 같은 길). ──
  // 되돌림: globalThis.__ALTAR === false 면 이 블록이 통째로 건너뛰어 RNG 를 한 톨도 안 건드린다 → 옛 판과 byte-동일.
  const altars = [];
  if (globalThis.__ALTAR !== false) {
    const cand = [];   // 계단 방(far)·시작 방(rooms[0]) 아님 · 상자가 이미 선 방 아님(가운데가 겹친다)
    for (let i = 1; i < rooms.length; i++) {
      const rm = rooms[i];
      if (rm === far) continue;
      if (chests.some((c) => c.x === rm.cx && c.y === rm.cy)) continue;
      cand.push(rm);
    }
    if (cand.length) {
      const rm = cand[(Math.random() * cand.length) | 0];
      const kind = ALTAR_KINDS[(Math.random() * ALTAR_KINDS.length) | 0];
      altars.push({ x: rm.cx, y: rm.cy, r: 26, used: false, kind });
    }
  }

  const { decals, props } = scatter(rooms, stairs, chests, altars);
  return { W, H, rooms, corridors, packs, chests, altars, stairs, startX, startY, decals, props };
}
const ALTAR_KINDS = ["blood", "bone", "ash"];

// ── V-238 마을 — 안전 지대(적 0 · 위험 장판 0). 고정된 한 방 + 문(계단)으로 가장 깊었던 층 복귀. ──
// genFloor 를 «건드리지 않으려고» 따로 둔다 — genFloor 씨앗 지문은 이 함수가 있든 없든 그대로다
//   (되돌림: main.js __TOWN=false 면 이 함수를 아예 안 부른다). rooms/corridors/props 꼴을 그대로
//   내어 drawWorld·미니맵이 손 하나 안 대고 마을을 그린다. 자리는 «고정»이라 들를 때마다 같다.
export function genTown() {
  const W = 1680, H = 1180;
  const rm = { x: 300, y: 260, w: 1080, h: 640, dead: false, visited: true, cleared: false };
  rm.cx = rm.x + rm.w / 2; rm.cy = rm.y + rm.h / 2;
  const rooms = [rm];
  const startX = rm.cx, startY = rm.cy + 170;             // 문(아래) 조금 위 — 상인 둘 사이로 들어선다
  const stairs = { x: rm.cx, y: rm.y + rm.h - 64, r: 46, town: true };   // 던전으로 돌아가는 문(아래 벽)
  // 고정 배치 소품 — «마을답게»(화톳불 둘 · 기둥 둘 · 석상 · 관 · 항아리). scatter 안 씀 → 자리 늘 같음.
  const props = [
    { img: "decor/brazier.png", x: rm.x + 205, y: rm.cy - 30, h: 90, brazier: true },
    { img: "decor/brazier.png", x: rm.x + rm.w - 205, y: rm.cy - 30, h: 90, brazier: true },
    { img: "decor/pillar.png",  x: rm.x + 92,  y: rm.y + 150, h: 205 },
    { img: "decor/pillar.png",  x: rm.x + rm.w - 92, y: rm.y + 150, h: 205 },
    { img: "decor/statue.png",  x: rm.cx, y: rm.y + 104, h: 150 },
    { img: "decor/coffin.png",  x: rm.x + 168, y: rm.y + rm.h - 150, h: 64 },
    { img: "decor/urn.png",     x: rm.x + rm.w - 168, y: rm.y + rm.h - 160, h: 62 },
    { img: "decor/bones.png",   x: rm.cx + 300, y: rm.cy + 165, h: 44 },
    { img: "decor/rubble.png",  x: rm.cx - 300, y: rm.cy + 175, h: 40 },
    { img: "decor/statue.png",  x: rm.cx, y: rm.cy - 130, h: 168, shrine: true },
  ];
  const ascendSpot = { x: rm.cx, y: rm.cy - 130, r: 46 };
  // 상인 둘 — 같은 스프라이트에 «색조·이름표»로 가른다(장물장수 호박빛 · 잡화상 청록). 컷에서 눈으로 갈린다.
  const merchants = [
    { kind: "fence", name: "장물장수", base: "mob/shaman", r: 26, h: 96,
      filt: "sepia(1) saturate(2.1) hue-rotate(-6deg) brightness(1.12) contrast(1.05)", col: "#e8b24a",
      x: rm.cx - 260, y: rm.cy - 10, dx: 1, dy: 0.2, state: "idle", anim: 0, stock: null },
    { kind: "general", name: "잡화상", base: "mob/shaman", r: 26, h: 96,
      filt: "saturate(1.7) hue-rotate(122deg) brightness(1.1) contrast(1.05)", col: "#6fd0a8",
      x: rm.cx + 260, y: rm.cy - 10, dx: -1, dy: 0.2, state: "idle", anim: 0 },
  ];
  return { W, H, rooms, corridors: [], packs: [], chests: [], altars: [], stairs,
    startX, startY, decals: [], props, town: true, merchants, ascendSpot };
}

// ★★ V-164 — `decal/stain.png` 를 **줄에서 뺀다.** 그 장은 굽기가 실패한 것이다:
//   112×112 · 1639B 인데 **안쪽이 통째로 투명하고 스캘럽 윤곽선만** 남았다. 화면에서는
//   따뜻한 바닥 위에 뜬 «구름 모양 테두리»로 보인다 — 병수님이 말한 「둥둥 떠 있는 것」의
//   한 몫이고, 소품이 아니라 얼룩이라 여태 아무도 안 봤다.
//   ★ 다시 구우려고 두 판을 돌렸는데 **둘 다 더 나빴다**(V-164 기록 참조) — 색을 앞에
//     세우면 «돌덩어리», 어둠을 앞에 세우면 «청록/남색». `assets/decal_v3` 에 남겨 뒀다.
//     제대로 구워질 때까지는 **없는 편이 낫다** — 빈 테는 고칠 수 없는 결함이다.
// ★★ V-174 — **여섯 판을 색으로 다퉜는데 결함은 «꼴»이었다.** 얼룩 일곱 장을 바닥 위에
//   같은 알파(0.59)로 얹어 한 장에 늘어놓고 보니(`tmp/v174_decal_sheet.png`) 판정이
//   단숨에 갈렸다:
//   · `crack`·`pebble` — 금·자갈이 **동그란 회색 접시** 안에 들었다. 바닥에 «파인 것»이
//     아니라 **얹은 판**으로 읽힌다. 원형 실루엣이 남는 한 색을 아무리 맞춰도 뜬다.
//   · `mud` — 픽셀 결이 아예 없는 **뿌연 갈색 원반**. 게임 컷에서 「안개 덩어리」로 보이던
//     것이 이것이다.
//   · `dust`·`stain` — 둘 다 **테두리가 불규칙**하고 결이 픽셀이다. 크립트 바닥에 맞다.
//   그런데 이 좋은 둘이 **여태 화면에 한 번도 안 나왔다** — `dust` 는 목록에 든 적이 없고,
//   `stain` 은 「빈 테」라 V-164 가 뺐는데 V-173b 가 채워 놓고 **되돌려 넣질 않았다.**
//   즉 V-172~V-173b 가 «dust 를 +44→+24 로 내렸다»고 적은 그 일은 **화면에 없는 그림**을
//   고친 것이다. ★ [[knob-that-does-nothing]] · [[carry-fixes-forward]]
//   → 그리는 것을 좋은 둘로 바꾼다. `crack`·`pebble`·`mud` 는 «원형 접시»를 벗겨 다시
//     구울 때까지 뺀다(파일은 `assets/decal/` 에 그대로 있다).
// ★ V-176 — `dust` 를 뺐다(봉우리 +29.5, 띠 +14). ★ V-178 — 되돌렸다.
//   V-176 은 배경 어둡기 한 손잡이로 두 판을 태웠다 — dust 가 「흩뿌린 점」이라
//   어둡게 할수록 속 대비가 오히려 커져 밝기 축으로는 영영 안 들어왔다.
//   고친 것은 밝기가 아니라 **꼴**이다 — 통과한 `stain` 과 같은 «뭉친 덩어리» 로
//   다시 구웠다(조리법에서 "pale"·"scattered"·"grit" 을 뺐다). 평균 −4.1 · 봉우리 −0.1.
// ★ V-179 — `pebble` 을 되돌렸다. 옛 장은 V-164 가 잡은 «둥근 회색 접시» 그대로였고
//   (봉우리 +16.2), V-178 의 «꼴» 처방을 그대로 옮겨 한 판에 들어왔다(봉우리 −0.1).
//   덤으로 새 자(`hs_decaldiff.py`)가 걸린 것: 지금 살아 있는 `stain`·`dust` 가
//   실루엣 겹침 **0.781** 로 이미 «같은 그림»이다. pebble 은 0.58 이라 오히려 더 다르다.
const DEC_IMG = ["decal/stain.png", "decal/crack.png", "decal/dust.png", "decal/pebble.png"];
const PROP_IMG = ["decor/pillar.png", "decor/column2.png", "decor/bones.png", "decor/bones2.png",
  "decor/urn.png", "decor/coffin.png", "decor/rubble.png", "decor/statue.png"];

// 방 한가운데에 놓아도 싸움을 안 가리는 «낮은» 소품 (V-169)
// ★ V-171 — 그림을 열어 보고 다시 짰다. `bones2.png` 는 무더기가 아니라 **서 있는 해골
//   전신**이다 — 방 가운데 세우면 소환한 해골과 헷갈리므로 벽으로 뺀다. 대신 누워
//   부서진 기둥(`column2.png`)은 눕는 물건이니 안쪽으로 넣는다.
const LOW_PROP = new Set(["decor/bones.png", "decor/column2.png", "decor/urn.png",
  "decor/rubble.png", "decor/coffin.png"]);

// ★★ V-171 — 소품 키를 **종마다** 정한다. 여태 아홉 종이 `rint(76,132)` 한 주머니에서
//   키를 뽑았고, `PLAYER_H = 104` 이므로 항아리가 사람보다 크고(132) 서 있는 기둥이
//   사람보다 작았다(76). 손잡이 하나에 뜻이 아홉 개면 어느 쪽으로 돌려도 절반은 틀린다.
//   기준은 «사람 키(104) 대비».
const PROP_H = {
  "decor/pillar.png":  [170, 215],   // 서 있는 기둥 — 사람의 1.6~2.1배
  "decor/statue.png":  [132, 168],   // 후드 석상 — 사람보다 조금 큼
  "decor/bones2.png":  [ 88, 104],   // 서 있는 해골 전신 — 사람 크기
  "decor/brazier.png": [ 76,  94],   // 화로 — 가슴 높이
  "decor/column2.png": [ 56,  78],   // 누워 부서진 기둥
  "decor/coffin.png":  [ 54,  72],   // 석관 — 무릎~허리
  "decor/urn.png":     [ 50,  70],   // 항아리 — 허리 높이
  "decor/bones.png":   [ 34,  50],   // 해골 무더기 — 발밑
  "decor/rubble.png":  [ 28,  44],   // 잡석 — 발밑
};

// ★★ V-171b — `scatter` 가 **이미 놓인 것을 안 봤다.** V-169 가 밀도를 2.5배 올리자
//   겹침이 드러났다 — 컷에서 화로 둘이 한 덩어리로 뭉치고, 석상이 화로를 뚫고 섰고,
//   해골 무더기가 **계단 구멍 테두리 위**에 걸쳐 있었다. 자리를 뽑을 때 몇 번 다시
//   던져서(최대 12회) 앞서 놓인 소품·계단·상자와 «발자국»이 겹치면 버린다.
//   발자국은 그림의 가로폭 대신 **밑동 반지름**(h 대비)으로 잡는다 — 위로 솟은 부분은
//   겹쳐도 되고(원근), 바닥에서 겹치는 것만 어색하다.
const STAIR_R = 92, CHEST_R = 46;
// ★ V-180 — `footR` 이 **키에서 폭을 짐작**하고 있었다(`h * 0.30`). 넘어진 기둥처럼
//   옆으로 긴 그림에서는 이게 3.8배 과소평가라, 밀도를 올리자마자 둘이 겹쳐 놓였다.
//   아래 표는 짐작이 아니라 **각 그림의 불투명 bbox 를 재서** 낸 반폭비(w/h/2)다.
//   ★ [[cause-written-in-the-item-is-a-guess]] — 표에 없는 그림만 옛 0.30 으로 떨어진다.
const PROP_HALFW = {
  "decor/bones.png":   0.64, "decor/bones2.png": 0.39, "decor/brazier.png": 0.36,
  "decor/chest.png":   0.53, "decor/coffin.png": 0.69, "decor/column2.png": 1.15,
  "decor/pillar.png":  0.18, "decor/rubble.png": 0.88, "decor/stairs.png":  0.49,
  "decor/statue.png":  0.21, "decor/urn.png":    0.34,
};
function footR(pr) { return Math.max(16, pr.h * (PROP_HALFW[pr.img] ?? 0.30)); }
function propFits(pr, placed, stairs, chests, altars) {
  for (const q of placed) {
    const r = footR(pr) + footR(q);
    // y(깊이)는 조금만 봐도 된다 — 앞뒤로 놓인 건 겹쳐 보이지 않는다.
    if (Math.abs(pr.x - q.x) < r && Math.abs(pr.y - q.y) < r * 0.62) return false;
  }
  if (stairs && Math.hypot(pr.x - stairs.x, pr.y - stairs.y) < STAIR_R + footR(pr)) return false;
  for (const c of chests || []) if (Math.hypot(pr.x - c.x, pr.y - c.y) < CHEST_R + footR(pr)) return false;
  for (const a of altars || []) if (Math.hypot(pr.x - a.x, pr.y - a.y) < (a.r || 26) + 20 + footR(pr)) return false;   // V-234 — 제단 위에 소품이 겹쳐 놓이지 않게(상자와 같은 길)
  return true;
}

function scatter(rooms, stairs, chests, altars) {
  const decals = [], props = [];
  for (const room of rooms) {
    const area = room.w * room.h;
    // ★ V-176 — 자로 재 보니 방 하나를 덮는 얼룩 넓이가 **0.6%** 였다(`hs_flatruler.py`).
    //   그림 셋의 «채움»이 dust 12.6% · stain 15.2% · crack 2.1% 로 원래 성기기 때문에,
    //   여덟 개를 뿌려도 사실상 아무것도 안 덮는다 — V-175 가 색을 바닥 띠 안으로 넣은
    //   뒤로는 더더욱 안 보인다. 수를 3배(40000→13000), 크기를 1.6배(48~100→64~140)로
    //   올려 5% 언저리를 겨눈다. **색·투명도는 그대로** — 그건 V-175 가 여섯 판에 걸쳐
    //   맞춰 놓은 축이라 여기서 건드리면 도로 밖으로 나간다. ★ [[carry-fixes-forward]]
    for (let i = 0; i < Math.round(area / 13000); i++) {
      decals.push({ x: rint(room.x + 30, room.x + room.w - 30), y: rint(room.y + 30, room.y + room.h - 30),
        img: DEC_IMG[(Math.random() * DEC_IMG.length) | 0], s: rint(64, 140), a: 0.42 + Math.random() * 0.34 });
    }
    // ★ V-169 — 소품을 벽에만 붙여 놨더니 카메라가 방 가운데를 볼 때 **화면 밖**이었다.
    //   재 보니 방당 2.11개인데 화면에 보이는 건 평균 1.30개, 16% 자리에서는 하나도 안 보였다.
    //   아홉 종을 굽고도 화면에 안 나오면 없는 것과 같다(V-167a).
    //   · 수를 올린다(150000 → 60000).
    //   · **키 큰 것은 벽에, 낮은 것은 방 안쪽에.** 기둥·석상·화로가 방 한가운데 서면
    //     싸움을 가린다 — 뼈·잔해·항아리·관처럼 발밑에 눕는 것만 안쪽으로 보낸다.
    let tries = 0;                                     // 방마다 다시 던진 횟수
    for (let i = 0; i < Math.round(area / 34000); i++) {
      const brazier = Math.random() < 0.22;
      const img = brazier ? "decor/brazier.png" : PROP_IMG[(Math.random() * PROP_IMG.length) | 0];
      const low = !brazier && LOW_PROP.has(img);
      const inner = low && Math.random() < 0.62;      // 낮은 것만 방 안쪽으로
      let px, py;
      if (inner) {
        px = rint(room.x + 70, room.x + room.w - 70);
        py = rint(room.y + 70, room.y + room.h - 70);
      } else {
        const onX = Math.random() < 0.5;
        px = onX ? rint(room.x + 26, room.x + room.w - 26) : (Math.random() < 0.5 ? room.x + rint(24, 64) : room.x + room.w - rint(24, 64));
        py = onX ? (Math.random() < 0.5 ? room.y + rint(24, 64) : room.y + room.h - rint(24, 64)) : rint(room.y + 26, room.y + room.h - 26);
      }
      const hr = PROP_H[img] || [76, 132];              // 표에 없는 그림은 옛 자로 떨어진다
      const pr = { x: px, y: py, img, h: rint(hr[0], hr[1]), brazier };
      // 자리가 겹치면 **같은 소품을 다른 자리에** 다시 던진다(수는 안 줄인다 — V-169 의
      // 밀도가 그대로 남아야 한다). 열여섯 번 다 막히면 그 방은 빽빽한 것이니 포기한다.
      if (!propFits(pr, props, stairs, chests, altars)) { if (++tries < 16) i--; continue; }
      props.push(pr);
    }
  }
  return { decals, props };
}

// ★ 스프라이트가 작아 보여서(task 5) 몸을 1.4배 키운다. 충돌 반지름은 살짝만(1.15) —
//   너무 키우면 서로 밀려나 무리가 흩어진다.
const BODY = 1.4, HITR = 1.15;
// ★ V-203 — 팔②·③ 태그 비율(main.js 손잡이가 켜졌을 때만 읽힌다). 새 에셋 없이 색·크기로 갈라 표시한다.
const RANGED_FRAC = 0.35, CHARGER_FRAC = 0.18, BOMBER_FRAC = 0.12;   // V-231 — 돌진 0.30→0.18(특수 53% 는 과함) · 자폭 새로 0.12
// ★ V-237 — 시체 도둑(주술사) 갈래. 위 셋 뒤에 «얹는다» — __MOBKIND=false 면 && 가 Math.random 앞에서
//   끊겨 RNG 순서가 옛 그대로라 옛 판과 byte-동일하다. 재서 정한 값(로그): 이 넷을 다 지나면 잡몹 ~40%,
//   갈래 ~60%(사수 35 · 돌진 12 · 자폭 6 · 도둑 7 %p). 도둑만 시체를 먹으니 실제 압박은 방에 시체가 있을 때만 붙는다.
const THIEF_FRAC = 0.14;
// ★ V-226 — `dmgScale` 이 없으면 옛 그대로 `scale` 한 곡선을 쓴다(호출부를 안 고쳐도 안 깨진다).
function makeMob(t, x, y, scale, id, elite, dmgScale) {
  const em = elite ? 3.2 : 1;
  const m = {
    id, base: t.base, x, y, hp: t.hp * scale * em, maxhp: t.hp * scale * em,
    dmg: t.dmg * (dmgScale == null ? scale : dmgScale), spd: t.spd * (elite ? 0.9 : 1), h: t.h * BODY * (elite ? 1.25 : 1),
    r: t.r * HITR * (elite ? 1.2 : 1), gold: t.gold, dx: 0, dy: 1, elite,
    hit: 0, kb: { x: 0, y: 0 }, atk: 0, anim: (id * 2.3) % 6, alive: true,
    tb: id & 3, name: elite ? rollEliteName(t.base) : null,
  };
  // ★ 손잡이가 꺼져 있으면 && 가 Math.random 앞에서 끊겨 RNG 순서가 옛 그대로다 → off 행이 판을 한 톨도 안 바꾼다.
  if (!elite && globalThis.__RANGED_MOB && Math.random() < RANGED_FRAC) {
    m.ranged = true; m.mobKind = "shoot"; m.base = "mob/skelarch";
  } else if (!elite && globalThis.__CHARGER_MOB && Math.random() < CHARGER_FRAC) {
    m.charger = true; m.mobKind = "charge"; m.base = "mob/brute"; m.h *= 1.08; m.r *= 1.05;
  } else if (!elite && globalThis.__BOMBER_MOB && Math.random() < BOMBER_FRAC) {
    m.bomber = true; m.mobKind = "bomb"; m.base = "mob/brute"; m.h *= 0.92; m.r *= 0.95;
  } else if (!elite && globalThis.__MOBKIND !== false && Math.random() < THIEF_FRAC) {
    m.thief = true; m.mobKind = "thief"; m.base = "mob/shaman"; m.h *= 1.04;
  }
  return m;
}

// ★ V-210 — 잠든 팩이 스폰 자리에 서로 몸이 겹친 채 굳는다. separateEnemies(main.js) 는
//   «깨어 있는» 팩만 밀어, WAKE 3000 시절엔 화면 안 팩이 다 깨어 있어 안 보이던 겹침이
//   WAKE 500(V-207) 에서 「보이는데 잠든 팩」이 흔해지며 드러났다(ROADMAP V-210).
//   싼 길 ㉠ 을 골랐다 — 잠든 팩은 한 톨도 안 움직이니 «스폰 때 한 번» 팩 안에서만 풀어 놓으면
//   깨어날 때까지 그대로 유지된다. ㉡(매 프레임 팩-안 전수 비교)는 안 움직이는 것을 매 틱 다시
//   재는 헛일이라 런타임 비용이 붙는다 — ㉠ 은 런타임 비용 0. 밀기는 separateEnemies 와 같은
//   반씩-밀기(반지름 합 기준)라 깨어난 뒤 연출이 매끈히 이어진다. RNG 를 안 건드려(순수 계산)
//   같은 씨앗의 맵 생성 순서는 그대로다. 8 번 이완한다 — 한 패스는 겹침을 반만 줄이므로 몇 번
//   돌려야 풀린다. 팩당 10~14 마리라 8×14²/2 ≈ 780 쌍-검사, 층 전체로도 한 번뿐이라 싸다.
function spreadPack(enemies) {
  const n = enemies.length;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < n; i++) {
      const s = enemies[i];
      for (let j = i + 1; j < n; j++) {
        const t = enemies[j], min = s.r + t.r;
        const dx = t.x - s.x, dy = t.y - s.y, d2 = dx * dx + dy * dy;
        if (d2 === 0) { t.x += 0.5; continue; }
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2), push = (min - d) * 0.5 / d;
        s.x -= dx * push; s.y -= dy * push; t.x += dx * push; t.y += dy * push;
      }
    }
  }
}
