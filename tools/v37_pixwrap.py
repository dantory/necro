# v33_pix.py 를 그대로 부르는 얇은 껍데기 — V-37 도 같은 자를 쓴다(자를 새로 만들지 않는다)
import runpy, sys
sys.argv = [sys.argv[0], sys.argv[1]]
runpy.run_path("tools/v33_pix.py", run_name="__main__")
