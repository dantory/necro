const MOB_TYPES = [
  { base: "mob/fallen", hp: 26, dmg: 6, spd: 78, h: 74, r: 16, gold: [4, 9] },
  { base: "mob/zombie", hp: 44, dmg: 9, spd: 52, h: 92, r: 20, gold: [5, 11] },
  { base: "mob/skelarch", hp: 30, dmg: 8, spd: 70, h: 82, r: 16, gold: [5, 10] },
  { base: "mob/shaman", hp: 34, dmg: 10, spd: 66, h: 84, r: 17, gold: [7, 13] },
  { base: "mob/brute", hp: 120, dmg: 18, spd: 46, h: 118, r: 26, gold: [12, 22] },
];
const BOSS_TYPE = { base: "mob/boss", hp: 900, dmg: 34, spd: 42, h: 150, r: 40, gold: [80, 140] };

function rint(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); }
function overlap(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function genFloor(floor) {
  const W = 3400 + floor * 500, H = 2200 + floor * 320;
  const roomCount = Math.min(14, 8 + floor);
  const rooms = [];
  let guard = 0;
  while (rooms.length < roomCount && guard++ < 800) {
    const w = rint(460, 820), h = rint(360, 640);
    const r = { x: rint(80, W - w - 80), y: rint(80, H - h - 80), w, h,
      cx: 0, cy: 0, dead: false, visited: false, cleared: false };
    r.cx = r.x + w / 2; r.cy = r.y + h / 2;
    if (rooms.some((o) => overlap(r, o, 120))) continue;
    rooms.push(r);
  }

  const corridors = [];
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = (rooms[i].cx - rooms[j].cx) ** 2 + (rooms[i].cy - rooms[j].cy) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    const a = rooms[i], b = rooms[best];
    corridors.push({ x: Math.min(a.cx, b.cx), y: a.cy - 60, w: Math.abs(a.cx - b.cx), h: 120, horiz: true });
    corridors.push({ x: b.cx - 60, y: Math.min(a.cy, b.cy), w: 120, h: Math.abs(a.cy - b.cy), horiz: false });
  }
  const linked = new Set(corridors.flatMap((c) => rooms.filter((r) =>
    r.cx >= c.x - 60 && r.cx <= c.x + c.w + 60 && r.cy >= c.y - 60 && r.cy <= c.y + c.h + 60).map((r) => rooms.indexOf(r))));
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
    const n = rint(1, 2);
    for (let p = 0; p < n; p++) {
      const count = rint(5, 12);
      const px = rint(room.x + 60, room.x + room.w - 60);
      const py = rint(room.y + 60, room.y + room.h - 60);
      const enemies = [];
      const elite = floor >= 1 && Math.random() < 0.25;
      for (let k = 0; k < count; k++) {
        const t = MOB_TYPES[Math.min(MOB_TYPES.length - 1,
          Math.floor(Math.random() * (MOB_TYPES.length - (floor < 1 ? 1 : 0)) * (0.6 + Math.random() * 0.4)))];
        const scale = 1 + floor * 0.35;
        enemies.push(makeMob(t, px + rint(-90, 90), py + rint(-90, 90), scale, eid++, elite && k === 0));
      }
      packs.push({ x: px, y: py, enemies, room: i, awake: false });
    }
  }
  if (floor >= 2) {
    const br = far;
    packs.push({ x: br.cx, y: br.cy + 40, awake: false, room: rooms.indexOf(br),
      enemies: [makeMob(BOSS_TYPE, br.cx, br.cy + 40, 1 + floor * 0.4, eid++, true)] });
  }

  const { decals, props } = scatter(rooms);
  return { W, H, rooms, corridors, packs, chests, stairs, startX, startY, decals, props };
}

const DEC_IMG = ["decal/stain.png", "decal/crack.png", "decal/pebble.png", "decal/mud.png"];
const PROP_IMG = ["decor/pillar.png", "decor/column2.png", "decor/bones.png", "decor/bones2.png",
  "decor/urn.png", "decor/coffin.png", "decor/rubble.png", "decor/statue.png"];

function scatter(rooms) {
  const decals = [], props = [];
  for (const room of rooms) {
    const area = room.w * room.h;
    for (let i = 0; i < Math.round(area / 40000); i++) {
      decals.push({ x: rint(room.x + 30, room.x + room.w - 30), y: rint(room.y + 30, room.y + room.h - 30),
        img: DEC_IMG[(Math.random() * DEC_IMG.length) | 0], s: rint(48, 100), a: 0.42 + Math.random() * 0.34 });
    }
    for (let i = 0; i < Math.round(area / 150000); i++) {
      const onX = Math.random() < 0.5;
      const px = onX ? rint(room.x + 26, room.x + room.w - 26) : (Math.random() < 0.5 ? room.x + rint(24, 64) : room.x + room.w - rint(24, 64));
      const py = onX ? (Math.random() < 0.5 ? room.y + rint(24, 64) : room.y + room.h - rint(24, 64)) : rint(room.y + 26, room.y + room.h - 26);
      const brazier = Math.random() < 0.3;
      props.push({ x: px, y: py, img: brazier ? "decor/brazier.png" : PROP_IMG[(Math.random() * PROP_IMG.length) | 0], h: rint(76, 132), brazier });
    }
  }
  return { decals, props };
}

// ★ 스프라이트가 작아 보여서(task 5) 몸을 1.4배 키운다. 충돌 반지름은 살짝만(1.15) —
//   너무 키우면 서로 밀려나 무리가 흩어진다.
const BODY = 1.4, HITR = 1.15;
function makeMob(t, x, y, scale, id, elite) {
  const em = elite ? 3.2 : 1;
  return {
    id, base: t.base, x, y, hp: t.hp * scale * em, maxhp: t.hp * scale * em,
    dmg: t.dmg * scale, spd: t.spd * (elite ? 0.9 : 1), h: t.h * BODY * (elite ? 1.25 : 1),
    r: t.r * HITR * (elite ? 1.2 : 1), gold: t.gold, dx: 0, dy: 1, elite,
    hit: 0, kb: { x: 0, y: 0 }, atk: 0, anim: 0, alive: true,
  };
}
