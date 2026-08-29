// 의존성 0 정적 서버. 프로토타입에 빌드 도구를 얹을 이유가 없다.
//
// **public/ 도 루트처럼 서빙한다.** Vite 를 쓰던 습관대로 에셋을 public/assets 에 뒀는데
// 이 서버는 루트만 보고 있어서 스프라이트가 통째로 404 였다 — 화면에는 글자만 남았다.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import os from "node:os";

const PORT = 8774;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".json": "application/json",
};

createServer(async (req, res) => {
  /* ★ 2026-08-29 병수님: 「기존에 떠 있는 서버는 종료하고 이걸로 아예 대체할 수 없니?」
     — 이제 이 리포의 본 게임은 「hs/」(직접 조작 핵앤슬래시)다. 뿌리(/)가 그것을 연다.
     옛 방치형 판은 지우지 않고 「/old/」 로 남긴다(여섯 주치 자료가 거기 물려 있다). */
  // ★ 뿌리는 «옮겨 보낸다»(파일을 그대로 주지 않는다) — hs/index.html 이 hud.css·main.js 를
  //    상대 경로로 부르므로, 주소가 / 이면 옛 판의 같은 이름 파일을 읽어 통째로 깨진다.
  if (req.url === "/" || req.url === "") {
    res.writeHead(302, { location: "/hs/" }); res.end(); return;
  }
  if (req.url === "/old" ) { res.writeHead(302, { location: "/old/" }); res.end(); return; }
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/hs/") p = "/hs/index.html";
  else if (p === "/old/") p = "/index.html";
  else if (p.startsWith("/old/")) p = p.slice(4);
  const ext = p.slice(p.lastIndexOf("."));
  // 에셋은 리포 루트의 assets/ 에 둔다 — GitHub Pages 가 루트를 그대로 서빙하므로
  // 로컬 서버와 배포본이 같은 경로를 쓴다(경로가 갈리면 한쪽이 반드시 깨진다).
  for (const base of ["./", "./public/"]) {
    try {
      const body = await readFile(new URL(base + p.replace(/^\//, ""), import.meta.url));
      res.writeHead(200, {
        "content-type": TYPES[ext] || "application/octet-stream",
        "cache-control": "no-cache",                 // 고치자마자 새로고침으로 보이게
      });
      res.end(body);
      return;
    } catch { /* 다음 자리에서 찾는다 */ }
  }
  res.writeHead(404).end("not found");
// 0.0.0.0 으로 연다 — 같은 와이파이의 폰에서 맥 IP 로 바로 들어올 수 있어야
// "모바일에서도 되나"를 실제로 확인할 수 있다.
}).listen(PORT, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flat().find(n => n && n.family === "IPv4" && !n.internal);
  console.log(`http://127.0.0.1:${PORT}/`);
  if (lan) console.log(`http://${lan.address}:${PORT}/   ← 같은 와이파이의 폰에서`);
});
