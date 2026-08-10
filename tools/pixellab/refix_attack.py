#!/usr/bin/env python3
"""이미 있는 캐릭터의 **공격 애니만** 다시 굽는다 → assets/_atkfix/<이름>/attack/

    python3 tools/pixellab/refix_attack.py mob/skelarch

몸통(회전 8장)과 걷기는 **건드리지 않는다** — 멀쩡한 것을 다시 굽는 것이 제일 큰 위험이다
(골렘 때 세 판을 돌린 이유가 그것이었다). 받은 것은 스테이징에 두고, 눈으로 보고 나서
`assets/<이름>/attack/` 에 갈아 끼운다.

★ 이 파일이 생긴 이유 — 해골 궁수가 **템플릿 애니(`throw-object`)** 로 구워져 있었다.
  템플릿은 제 골격으로 동작을 다시 세우기 때문에 8방향 f3~f4 가 죄다 **엎어졌다**
  (몸이 가로로 눕고 활이 사라진다). 소환수 셋은 동작을 직접 적어서 멀쩡했다.
  그러니 몹도 직접 적는다. 골렘 3판에서 통한 규칙 그대로:
    ① **아래로 향하는 낱말을 쓰지 않는다**(slam down / drops / to the ground …).
       부정어("never lies down")로는 두 판 다 못 막았다 — 아예 안 적는 편이 낫다.
    ② 동작을 **수평**으로 말한다.
    ③ 매 프레임 서 있다는 것을 **자세로** 적는다(두 발은 바닥, 키는 그대로).
    ④ 프레임 수를 줄여 **무너질 꼬리 자체를 없앤다**(5장).
"""
import base64, io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
STATE = os.path.join(HERE, "state.json")
DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]

# ★ frame_count 는 **4~16 의 짝수**만 받는다(5 로 걸었다가 거부당했다). 4 를 주문하면
#   5장이 온다 — 골렘 3판이 그렇게 5장이었다.
FRAMES = 4                                   # 주문하는 장수(오는 것은 +1 = 5장/방향)

ACTION = {
  # 궁수 — 「쏜다」가 보여야 한다. 활을 당겨 놓고 놓는 것까지, 서 있는 채로.
  "mob/skelarch": (
      "raises the short bow horizontally in front of the chest and draws the string back to the "
      "jaw, then releases, both arms held out level at shoulder height, both feet planted flat "
      "and wide apart, standing at full height in every frame, back straight, "
      "the bow stays in the hands the whole time"),
}


def mcp(tool, args, timeout=420):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:200]}")
    return json.loads(r.stdout)


def content(r): return r.get("result", {}).get("content", [])
def text_of(r): return "\n".join(c.get("text", "") for c in content(r) if c.get("type") == "text")


def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]


def main(key):
    cid = json.load(open(STATE))[key]["id"]
    out = os.path.join(ROOT, "assets", "_atkfix", key.split("/")[-1])
    print(f"{key} · {cid} → {out}", flush=True)

    # ① 지금 걸려 있는 attack 그룹을 지운다 — 안 지우면 zip 안에서 그룹이 겹친다
    try:
        mcp("delete_animation", {"character_id": cid, "animation_group_id": "attack", "confirm": True})
        print("옛 attack 그룹 삭제", flush=True)
    except Exception as e:
        print(f"삭제 건너뜀 — {str(e)[:80]}", flush=True)

    # ② 새로 건다
    t = text_of(mcp("animate_character", {
        "character_id": cid, "action_description": ACTION[key],
        "animation_name": "attack", "mode": "v3",
        "frame_count": FRAMES, "directions": DIRS}))
    if not re.search(r"(job|queued|id)", t, re.I):
        raise SystemExit(f"거는 데 실패 — {t[:200]}")
    print("attack 걸었다 · " + t[:120].replace("\n", " "), flush=True)

    # ③ 받는다 — 상태가 아니라 **산출물**로 판단한다(423 이면 아직 굽는 중)
    url = f"https://api.pixellab.ai/mcp/characters/{cid}/download"
    raw = None
    for i in range(60):
        time.sleep(20)
        try:
            req = urllib.request.Request(url, headers={"Authorization": auth()})
            raw = urllib.request.urlopen(req, timeout=300).read()
        except urllib.error.HTTPError as e:
            if e.code != 423:
                raise
            if i % 3 == 0: print(f"  아직 굽는 중 — {i*20}초째", flush=True)
            continue
        zf = zipfile.ZipFile(io.BytesIO(raw))
        buckets = {}
        for n in zf.namelist():
            if not (n.lower().endswith(".png") and "/animations/" in n.lower()): continue
            parts = n.split("/")
            try:
                gi = parts.index("animations"); group, d, fn = parts[gi+1], parts[gi+2], parts[-1]
            except (ValueError, IndexError): continue
            if "attack" not in group.lower() or d not in DIRS: continue
            m = re.search(r"(\d+)", fn)
            if m: buckets.setdefault(group, []).append((d, int(m.group(1)), n))
        if not buckets:
            print(f"  attack 아직 안 옴 — {i*20}초째", flush=True); continue
        def per_dir(items):
            c = {}
            for d, _, _ in items: c[d] = c.get(d, 0) + 1
            return max(c.values()) if c else 0
        pick = next((k for k, v in buckets.items() if per_dir(v) == FRAMES + 1), None)
        if pick is None:
            best = max(buckets, key=lambda k: per_dir(buckets[k]))
            print(f"  주문한 {FRAMES+1}장짜리 그룹이 아직 없다({per_dir(buckets[best])}장) — 더 기다린다", flush=True)
            continue
        for d in DIRS:                                  # 쓰기 전에 비운다
            dd = os.path.join(out, "attack", d)
            os.makedirs(dd, exist_ok=True)
            for f in os.listdir(dd):
                if f.endswith(".png"): os.remove(os.path.join(dd, f))
        n_ok = 0
        for d, idx, n in buckets[pick]:
            dd = os.path.join(out, "attack", d)
            open(os.path.join(dd, f"{idx}.png"), "wb").write(zf.read(n)); n_ok += 1
        print(f"══ 받음 {n_ok}장 ({FRAMES+1}장 × 8방향)", flush=True)
        return 0
    raise SystemExit("끝내 못 받았다 — 나중에 다시 실행할 것")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "mob/skelarch"))
