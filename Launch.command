#!/bin/zsh
cd -- "${0:A:h}"
python3 - <<'PY'
import os,json,subprocess,time,urllib.request,urllib.parse,shutil
from pathlib import Path
root=Path.cwd()
try: urllib.request.urlopen('http://127.0.0.1:4173',timeout=1)
except Exception:
 node=shutil.which('node') or str(Path.home()/'.local/node/bin/node')
 log=open(root/'private/server.log','a')
 subprocess.Popen([node,str(root/'server.mjs')],cwd=root,stdout=log,stderr=log,start_new_session=True)
 for _ in range(30):
  try: urllib.request.urlopen('http://127.0.0.1:4173',timeout=1);break
  except Exception:time.sleep(.1)
url='http://127.0.0.1:4173/'
p=root/'private/my-starter-plan.json'
if p.exists():url+='#setup='+urllib.parse.quote(p.read_text(),safe='')
subprocess.run(['open',url])
PY
