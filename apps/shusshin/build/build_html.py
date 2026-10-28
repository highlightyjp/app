# -*- coding: utf-8 -*-
"""src/app.html にエンジンとデータを埋め込み、
  index.html        … 単体で開ける完全なHTML（GitHub Pages・端末で直接開く用）
  dist/artifact.html … Claude の Artifact 公開用（doctype 等の外枠なし）
を作る。"""
import json, os, hashlib
H = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(H, '..')
def rd(p): return open(os.path.join(A, p), encoding='utf-8').read()
def js(p): return json.dumps(json.loads(rd(p)), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
body = rd('src/app.html')
body = body.replace('__META__', js('data/meta.json')).replace('__MAP__', js('data/map.json')).replace('__QS__', js('data/questions.json'))
body = body.replace('/*__ENGINE__*/', rd('src/engine.js'))
assert '__QS__' not in body and '/*__ENGINE__*/' not in body
os.makedirs(os.path.join(A, 'dist'), exist_ok=True)
open(os.path.join(A, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(body)
full = '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n'
open(os.path.join(A, 'index.html'), 'w', encoding='utf-8').write(full)
for f in ['index.html', 'dist/artifact.html']:
    b = open(os.path.join(A, f), 'rb').read()
    print(f, len(b), 'bytes', 'sha256', hashlib.sha256(b).hexdigest()[:16])
