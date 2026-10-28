# -*- coding: utf-8 -*-
"""都道府県の境界（TopoJSON、国土数値情報 行政区域データを smartnews-smri/japan-topography が加工したもの）から、
アプリ用の SVG パス（../data/map.json）を作る。沖縄県は左上に移して表示する（はめ込み）。"""
import json, math, os
H = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(H, 'raw', 'japan_prefectures_topo_s0010.json'), encoding='utf-8'))
P = list(json.load(open(os.path.join(H, 'raw', 'prefs_capitals.json'), encoding='utf-8')))
sx, sy = T['transform']['scale']; tx, ty = T['transform']['translate']
arcs = []
for a in T['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def arc(i): return arcs[i] if i >= 0 else arcs[~i][::-1]
def ring(r):
    out = []
    for i in r:
        pts = arc(i); out.extend(pts if not out else pts[1:])
    return out
K = math.cos(math.radians(36)); S = 40.0
def proj(lon, lat, pref):
    if pref == '沖縄県':   # はめ込み：左上へ移し、1.6倍に拡大
        cx, cy = (127.8 - 128.6) * K * S, (45.8 - 26.4) * S
        x, y = (lon - 128.6) * K * S, (45.8 - lat) * S
        return (cx + (x - cx) * 1.6 + 4.6 * K * S, cy + (y - cy) * 1.6 - 15.6 * S)
    return ((lon - 128.6) * K * S, (45.8 - lat) * S)
def area(pts):
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]; ax, ay = a; bx, by = b
        L = math.hypot(bx - ax, by - ay) or 1e-9
        d = abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [a, b]
out = {}; cent = {}
geoms = list(T['objects'].values())[0]['geometries']
for g in geoms:
    name = g['properties']['N03_001']; polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    d = []; best = None
    for poly in polys:
        outer = ring(poly[0])
        lon = sum(p[0] for p in outer) / len(outer); lat = sum(p[1] for p in outer) / len(outer)
        if name == '東京都' and lat < 33.5: continue      # 伊豆諸島南部・小笠原は省略
        if name == '鹿児島県' and lat < 29.5: continue    # 奄美群島以南は省略（表示のみ）
        if name == '沖縄県' and not (126.6 <= lon <= 128.5 and 25.9 <= lat <= 27.0): continue   # 沖縄本島周辺のみ表示
        pts = [proj(x, y, name) for x, y in outer]
        A = area(pts)
        if A < 0.6: continue                              # ごく小さい島は省略
        m = max(range(len(pts)), key=lambda i: (pts[i][0]-pts[0][0])**2 + (pts[i][1]-pts[0][1])**2)
        pts = dp(pts[:m + 1], 0.12)[:-1] + dp(pts[m:] + [pts[0]], 0.12)
        if len(pts) < 4: continue
        d.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts[:-1]) + 'Z')
        if best is None or A > best[0]: best = (A, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    if best is None: print("NOPOLY", name, len(polys)); continue
    out[name] = "".join(d); cent[name] = [round(best[1], 1), round(best[2], 1)]
allx = []; ally = []
import re
for v in out.values():
    for m in re.finditer(r'(-?[\d.]+),(-?[\d.]+)', v): allx.append(float(m.group(1))); ally.append(float(m.group(2)))
vb = [math.floor(min(allx)) - 2, math.floor(min(ally)) - 2, math.ceil(max(allx) - min(allx)) + 4, math.ceil(max(ally) - min(ally)) + 4]
ok=[c for c in [m for m in re.finditer(r'(-?[\d.]+),(-?[\d.]+)', out['沖縄県'])]]
ox=[float(m.group(1)) for m in ok]; oy=[float(m.group(2)) for m in ok]
inset=[round(min(ox)-6,1), round(min(oy)-6,1), round(max(ox)-min(ox)+12,1), round(max(oy)-min(oy)+12,1)]
json.dump({'viewBox': vb, 'insetBox': inset, 'paths': [out[p] for p in P], 'cent': [cent[p] for p in P],
           'inset': '沖縄県は位置を移して表示', 'credit': '出典：国土交通省 国土数値情報（行政区域データ 2021年）を smartnews-smri/japan-topography が加工したデータを、さらに加工して作成'},
          open(os.path.join(H, '..', 'data', 'map.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('viewBox', vb, 'bytes', os.path.getsize(os.path.join(H, '..', 'data', 'map.json')))
