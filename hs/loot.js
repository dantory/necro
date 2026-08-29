const ADJ = ["Mastodon", "Battle", "Grim", "Iron", "Cruel", "Vicious", "Ancient", "Bone", "Dread",
  "Savage", "Hollow", "Rotting", "Corpse", "Plague", "Skull", "Wraith", "Gore", "Shadow"];
const NOUN = ["Ring", "Belt", "Amulet", "Wand", "Robe", "Helm", "Gauntlet", "Boots", "Charm",
  "Skull", "Sigil", "Locket", "Idol", "Fang", "Shroud", "Talisman"];
const OF = ["King", "the Grave", "Skill", "the Dead", "Fury", "the Void", "Marrow", "Blight",
  "the Legion", "Ruin", "the Necromancer", "Bone"];

export const RARITY = [
  { key: "white", name: "평범", color: "#e6e0d0", weight: 62, dmg: 1.06, body: 1.03 },
  { key: "blue", name: "매직", color: "#6fa8ff", weight: 26, dmg: 1.14, body: 1.07 },
  { key: "yellow", name: "레어", color: "#e8cf52", weight: 10, dmg: 1.24, body: 1.11 },
  { key: "gold", name: "유니크", color: "#d8934a", weight: 2, dmg: 1.42, body: 1.18 },
];

export const UNIQUES = [
  { name: "Twin Marrow of the Grave", note: "시체 폭발이 두 번 터진다", key: "doubleNova" },
  { name: "Bonehoard Sigil of the Legion", note: "해골 상한 +4", key: "moreSkel" },
  { name: "Midas Skull of King", note: "금이 두 배로 떨어진다", key: "goldRush" },
  { name: "Grim Locket of Fury", note: "뼈 창이 두 갈래로 갈라진다", key: "splitSpear" },
];

function pick(a) { return a[(Math.random() * a.length) | 0]; }

function rollRarity(floor, lucky) {
  const tbl = RARITY.map((r) => ({ ...r }));
  tbl[3].weight += floor * 0.6 + (lucky ? 6 : 0);
  tbl[2].weight += floor * 0.9;
  const tot = tbl.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * tot;
  for (const r of tbl) { if ((n -= r.weight) <= 0) return r; }
  return tbl[0];
}

let uniquePool = [];
export function resetUniques() { uniquePool = [...UNIQUES]; }

export function rollItem(floor, lucky) {
  const r = rollRarity(floor, lucky);
  if (r.key === "gold" && uniquePool.length) {
    const u = uniquePool.splice((Math.random() * uniquePool.length) | 0, 1)[0];
    return { name: u.name, rarity: r, unique: u, dmg: r.dmg, body: r.body };
  }
  const rar = r.key === "gold" ? RARITY[2] : r;
  const name = `${pick(ADJ)} ${pick(NOUN)} of ${pick(OF)}`;
  return { name, rarity: rar, unique: null, dmg: rar.dmg, body: rar.body };
}
