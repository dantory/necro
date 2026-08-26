/* V-95 — **아직 한 번도 찍어 본 적 없는 창 셋을 켜서 본다.**
   V-93 이 마을의 덮는 창 일곱을, V-94 가 떠 있는 툴팁을 봤다. 남은 것이 셋이다:
   **정산(winEnd)** · **그동안(winOffline)** · **초기화(winWipe)**.
   정산은 «판이 끝날 때마다» 반드시 보는 창인데 자(run_end.mjs)만 있고 한 벌로
   찍어 본 적이 없다([[play-it-before-measuring-it]]).
   node tools/v95_look.mjs [width] [height]   (tmp/v95_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const it = (k, tier, af) => ({ k, tier, af });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }]), robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [it("wand", 4, [{ id: "dmg", v: 31 }]), it("robe", 2, [{ id: "hp", v: 51 }])],
  tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);

/* 창이 정말 떴는지 묻고 나서 찍는다 — 안 떴는데 찍으면 「이상 없음」이 된다
   ([[silent-zero-is-not-an-observation]]). 틀의 자리·넘침·글자 수를 같이 적는다. */
const look = async (winId, name, out) => {
  const r = await ev(`(()=>{const w=document.getElementById(${JSON.stringify(winId)});
    if(!w) return "no-win"; if(!w.classList.contains("on")) return "closed";
    const f=w.querySelector(".frame"), b=f.getBoundingClientRect();
    const over=[]; if(b.top<0)over.push("위"); if(b.bottom>innerHeight)over.push("아래");
    if(b.left<0)over.push("왼"); if(b.right>innerWidth)over.push("오른");
    /* 창 안에서 «가로로 넘치는» 줄을 찾는다 — 이름이 길어지면 여기서 샌다 */
    const spill=[...f.querySelectorAll("*")].filter(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0)
      .map(e=>(e.className||e.tagName)+" "+e.scrollWidth+">"+e.clientWidth).slice(0,4);
    return Math.round(b.width)+"x"+Math.round(b.height)+" @"+Math.round(b.left)+","+Math.round(b.top)
      +" 밑"+Math.round(b.bottom)
      +(over.length?" ★화면밖 "+over.join("/"):"")
      +(spill.length?" ★가로넘침 "+spill.join(" | "):"");})()`);
  console.log(name.padEnd(10), r);
  if (r === "closed" || r === "no-win") return false;
  await shot(`tmp/v95_${out || winId}_${W}.png`);
  return true;
};

/* ① 정산 — 전리품이 있는 판. LASTRUN 을 손으로 채워 그 값 그대로 그리게 한다. */
await ev(`(()=>{const R=window.__LASTRUN;
  Object.assign(R,{floor:52,from:26,dead:true,killed:1284,gold:13640,xp:8420,leveled:true,
    summoned:412,used:389,secs:734,
    loot:[{k:"wand",tier:4,af:[{id:"dmg",v:31},{id:"mp",v:2}],worn:true},
          {k:"robe",tier:3,af:[{id:"hp",v:88}],bagged:true},
          {k:"charm",tier:5,af:[{id:"mdmg",v:24},{id:"mp",v:1},{id:"hp",v:40}],uid:"u1",bagged:true},
          {k:"robe",tier:1,af:[]},
          {k:"wand",tier:2,af:[{id:"dmg",v:9}],mat:true},
          {k:"charm",tier:3,af:[{id:"mp",v:1}],made:true}]});
  window.__openWin("end");})()`); await wait(700);
await look("winEnd", "정산·전리품", "end_loot");

/* ② 정산 — 빈손(자취 넉 장이 서는 갈래). 창을 닫고 다시 그린다. */
await ev(`(()=>{const R=window.__LASTRUN; R.loot=[]; R.dead=false; R.leveled=false;
  window.__openWin("end");})()`); await wait(700);
await look("winEnd", "정산·빈손", "end_empty");

/* ③ 그동안 — 상한(8시간)에 걸리고 시체도 한 짐 찬 갈래(줄이 가장 많다). */
await ev(`(()=>{document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
  /* corpses 는 «번 것» · corpsesIn 은 «실제로 실린 것»(창고 상한 140). 처음에 이 둘을
     뒤집어 넣고 창이 틀린 줄 알았다 — 자에 넣는 값부터 뜻을 맞춘다. */
  window.__lastOffline={min:480,gold:24800,corpses:312,corpsesIn:140,corpseFull:true,capped:true};
  window.__openWin("offline");})()`); await wait(700);
await look("winOffline", "그동안");

/* ④ 초기화 — 지워질 것을 수로 적는 창. */
await ev(`(()=>{document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
  window.__openWin("wipe");})()`); await wait(700);
await look("winWipe", "초기화");

if (errs.length) console.log("errs", errs.slice(0, 5));
console.log(`창 ${W}x${H} · tmp/v95_*_${W}.png`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
