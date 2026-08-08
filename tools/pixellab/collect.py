#!/usr/bin/env python3
"""이미 구워진 캐릭터에서 **프레임만 수거한다.**

굽는 것과 받는 것을 한 흐름에 두었더니, PixelLab 쪽 잡이 느린 종류에서 내 대기가 먼저
포기하고 그 캐릭터를 통째로 버렸다(7종 중 2종만 건졌다). 굽기는 이미 끝나 있으므로
**아이디만 알면 언제든 다시 받을 수 있다** — 그래서 수거를 따로 뗀다.

    python3 tools/pixellab/collect.py /tmp/necro_ids.txt
"""
import io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")

def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 프로세스 실패: {r.stderr[:300]}")
    d = json.loads(r.stdout); res = d.get("result", d)
    if res.get("isError"):
        raise RuntimeError(f"{tool} 에러: {res['content'][0]['text'][:300]}")
    c = res.get("content") or []
    return c[0]["text"] if c and c[0].get("type") == "text" else json.dumps(res)

def auth():
    cfg = json.load(open(os.path.expanduser("~/.config/opencode/opencode.json")))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]

def grab(kind, cid):
    """받을 수 있는 것을 **전부** 받는다. zip 안 폴더 이름이 곧 애니메이션 이름이므로
       walk/attack 을 그 자리에서 갈라 푼다 — 어느 쪽이 먼저 익었는지 몰라도 된다."""
    t = mcp("get_character", {"character_id": cid})
    dl = re.search(r"download:\s*(\S+)", t)
    if not dl:
        return 0, "download 링크 없음"
    blob = urllib.request.urlopen(
        urllib.request.Request(dl.group(1), headers={"Authorization": auth()}), timeout=300).read()
    got = {}
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for nm in sorted(z.namelist()):
            if not (nm.endswith(".png") and "/animations/" in nm and "/south/" in nm):
                continue
            grp = nm.split("/animations/", 1)[1].split("/", 1)[0]
            # **모르는 그룹은 버린다.** "attack 아니면 걷기"로 뭉뚱그렸더니, 걷기가 아직
            # 안 익은 brute 에 공격 프레임이 walk/ 로 들어앉아 **공격 모션으로 걸어다녔다**
            # (5장이 attack 과 바이트까지 같았다). 걷기 템플릿의 그룹 이름은 `animating` 이다.
            g = grp.lower()
            out = ("attack" if "attack" in g else
                   "walk"   if ("walk" in g or "animating" in g) else None)
            if out is None:
                continue
            got.setdefault(out, []).append(nm)
    n = 0
    for out, names in got.items():
        d = os.path.join(ROOT, "assets", kind, out)
        os.makedirs(d, exist_ok=True)
        for i, nm in enumerate(names):
            open(os.path.join(d, f"{i}.png"), "wb").write(z.read(nm)) if False else None
        # zip 을 다시 열어 쓴다(위에서 닫혔다)
        with zipfile.ZipFile(io.BytesIO(blob)) as z2:
            for i, nm in enumerate(names):
                open(os.path.join(d, f"{i}.png"), "wb").write(z2.read(nm)); n += 1
    return n, ",".join(f"{k}:{len(v)}" for k, v in got.items()) or "아직 없음"

if __name__ == "__main__":
    pairs = [l.split() for l in open(sys.argv[1]) if l.strip()]
    left = {k: c for k, c in pairs}
    # **끝날 때까지 돌아가며 다시 물어본다.** 한 종류가 늦다고 나머지를 버리지 않는다.
    for round_ in range(40):
        for kind, cid in list(left.items()):
            try:
                n, what = grab(kind, cid)
                print(f"[{round_}] {kind} — {what}", flush=True)
                if "walk" in what and "attack" in what:
                    left.pop(kind)
            except Exception as e:
                print(f"[{round_}] {kind} 실패 — {str(e)[:120]}", flush=True)
        if not left:
            print("전부 수거"); break
        time.sleep(45)
