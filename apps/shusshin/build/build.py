# -*- coding: utf-8 -*-
"""一次データ（raw/）と問題定義（spec.py）から、アプリに埋め込む questions.json と map.json を作る。
実行: python3 build.py  （出力: ../data/questions.json, ../data/map.json, ../data/meta.json）
"""
import json, math, os, re, datetime
from spec import T, K_ITEMS, K8_ITEMS, KM_ITEMS, KM8_ITEMS, S_ITEMS

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, '..', 'data'); os.makedirs(OUT, exist_ok=True)
def R(f): return json.load(open(os.path.join(H, 'raw', f), encoding='utf-8'))

CAP = R('prefs_capitals.json'); P = list(CAP); N = len(P); assert N == 47
K24 = {}
for o in R('kakei_2023_2025.json'):
    K24.setdefault(o['item'], {})['数量' if '数量' in o['metric'] else '金額'] = {'vals': o['vals'], 'unit': o['metric']}
K08 = R('kakei_2008.json'); JMA = R('jma_normals.json'); SG = R('sugata_2026.json'); MX = R('mext_kyushoku.json')

# ---- 定数（モデル） ----
BETA = 1.5          # 対数比 → ロジットの傾き（4問の較正の中央値。README「較正」参照）
BETA_SHARE = 1.0    # 金額の比をそのまま割合とみなす多肢選択（ガス・移動手段）
BETA_PROXY = 1.5    # 都道府県のすがた の代理指標（ロジット差）
BETA_COUNT = 1.0    # 人口あたり件数（対数比）
SNOW_A, SNOW_B = -4.67, 1.43   # 雪：logit p = A + B*ln(降雪の深さ合計+1)（較正値）
CLAMP = (0.03, 0.97)

def sig(x): return 1 / (1 + math.exp(-x))
def logit(p): return math.log(p / (1 - p))
def clamp(p): return min(CLAMP[1], max(CLAMP[0], p))
def num(s):
    if isinstance(s, (int, float)): return float(s)
    return float(str(s).replace(',', ''))

POP = [num(SG['A011000']['vals'][str(i + 1)]) for i in range(N)]   # 万人

SRC_K24 = {'t': '総務省統計局「家計調査（二人以上の世帯）品目別都道府県庁所在市及び政令指定都市ランキング（2023年〜2025年平均）」', 'u': 'https://www.stat.go.jp/data/kakei/5.html'}
SRC_K08 = {'t': '総務省統計局「家計調査年報（家計収支編）2008年 第5表 都道府県庁所在市別」（e-Stat）', 'u': 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00200561&tstat=000000330001&cycle=7&year=20080&month=0&tclass1=000000330001&tclass2=000000330004&tclass3=000000330006'}
SRC_SG = {'t': '総務省統計局「統計でみる都道府県のすがた2026」', 'u': 'https://www.stat.go.jp/data/k-sugata/index.html'}
SRC_JMA = {'t': '気象庁「過去の気象データ検索 平年値（1991〜2020年）」各府県の気象台・観測所', 'u': 'https://www.data.jma.go.jp/stats/etrn/index.php'}
SRC_MX = {'t': '文部科学省「学校給食実施状況等調査」第6表 都道府県別学校給食実施状況（公立中学校生徒数）平成24〜30年度（e-Stat）', 'u': 'https://www.mext.go.jp/b_menu/toukei/chousa05/kyuushoku/1267027.htm'}

def k24(item, metric):
    m = K24.get(item)
    if not m: return None
    met = metric if metric in m else ('金額' if '金額' in m else '数量')
    v = m[met]['vals']; return [float(v[CAP[p]]) for p in P], float(v['全国']), met, m[met]['unit']
def k08(item, metric):
    if not item or item not in K08: return None
    m = K08[item]
    met = metric if metric in m else None
    if not met: return None
    v = m[met]['vals']
    if any(CAP[p] not in v for p in P): return None
    return [float(v[CAP[p]]) for p in P], float(v['全国']), met

def lograt(vals, nat):
    pos = [x for x in vals if x > 0]; eps = (min(pos) * 0.5) if pos else 1e-6
    return [math.log(max(x, eps) / nat) for x in vals]

def r3(x): return round(x, 3)
QS = []

def add(q): QS.append(q)

# ---- K: 家計調査（2択） ----
for n24, tmpl, lab, n08, met, cat in K_ITEMS:
    a = k24(n24, met); b = k08(n08, a[2] if a else met)
    if not a: raise SystemExit('missing 2023-25 item ' + n24)
    rs = [lograt(a[0], a[1])]; rows = [{'era': '2023〜2025年平均', 'v': [r3(x) for x in a[0]], 'nat': a[1]}]; src = [SRC_K24]
    if b:
        rs.append(lograt(b[0], b[1])); rows.append({'era': '2008年', 'v': [r3(x) for x in b[0]], 'nat': b[1]}); src.append(SRC_K08)
    r = [sum(x[k] for x in rs) / len(rs) for k in range(N)]
    if tmpl.startswith('x:'):
        qt, oa, ob = tmpl[2:].split('|')
    else:
        qt, (oa, ob) = T[tmpl][0].format(L=lab), T[tmpl][1]
    p = [clamp(sig(BETA * x)) for x in r]
    unit = '円' if a[2] == '金額' else re.sub(r'^数量：', '', a[3])
    add({'id': 'k_' + str(len(QS)), 'src_item': n24, 'cat': cat, 't': lab, 'q': qt, 'o': [oa, ob],
         'p': [[r3(x), r3(1 - x)] for x in p], 'n0': 25, 'basis': 'K',
         'how': f'県庁所在市の1世帯あたり年間{"支出" if a[2]=="金額" else "購入量"}を全国平均と比べ、ロジット＝{BETA}×ln(市/全国)（{"2時点の平均" if b else "1時点"}）。全国の回答率を50%と仮定',
         'data': {'label': f'{n24}（1世帯あたり年間{"支出金額" if a[2]=="金額" else "購入数量"}）', 'unit': unit, 'rows': rows, 'note': '都道府県庁所在市の値（県全体の値ではない）'},
         'src': src, 'g': ['i:' + n24]})

# ---- K8: 家計調査2008のみ ----
for n08, lab, txt, met, cat, grp in K8_ITEMS:
    b = k08(n08, met)
    if not b: raise SystemExit('missing 2008 item ' + n08)
    qt, oa, ob = txt.split('|')
    r = lograt(b[0], b[1]); p = [clamp(sig(BETA * x)) for x in r]
    add({'id': 'k_' + str(len(QS)), 'src_item': n08, 'cat': cat, 't': lab, 'q': qt, 'o': [oa, ob],
         'p': [[r3(x), r3(1 - x)] for x in p], 'n0': 25, 'basis': 'K',
         'how': f'県庁所在市の1世帯あたり年間{"支出" if met=="金額" else "購入量"}（2008年）を全国と比べ、ロジット＝{BETA}×ln(市/全国)。全国の回答率を50%と仮定',
         'data': {'label': f'{n08}（1世帯あたり年間{"支出金額" if met=="金額" else "購入数量"}・2008年）', 'unit': '円' if met == '金額' else '', 'rows': [{'era': '2008年', 'v': [r3(x) for x in b[0]], 'nat': b[1]}], 'note': '都道府県庁所在市の値'},
         'src': [SRC_K08], 'g': ['i8:' + n08] + ([grp] if grp else [])})

# ---- KM: 多肢選択 ----
def mc(qid, txt, opts, cat, eras_vals, beta, how, src, members):
    L = [[math.log(max(eras_vals[e][j][k], 1e-6)) for k in range(N)] for e in range(len(eras_vals)) for j in range(len(opts))]
    ne = len(eras_vals); no = len(opts)
    lv = [[sum(math.log(max(eras_vals[e][j][k], 1e-6)) for e in range(ne)) / ne for j in range(no)] for k in range(N)]
    p = []
    for k in range(N):
        z = [beta * x for x in lv[k]]; m = max(z); e = [math.exp(x - m) for x in z]; s = sum(e)
        pk = [x / s for x in e]
        pk = [min(0.96, max(0.02, x)) for x in pk]; s2 = sum(pk); pk = [x / s2 for x in pk]
        p.append([r3(x) for x in pk])
    add({'id': qid, 'cat': cat, 't': txt.replace('子どもの頃、', '')[:18], 'q': txt, 'o': opts, 'p': p, 'n0': 25, 'basis': 'KM', 'how': how,
         'data': None, 'src': src, 'g': [qid] + members})
    return QS[-1]

for qid, txt, opts, met, cat in KM_ITEMS:
    v24 = []; v08 = []; ok08 = True; rows = []
    for lab, n24, n08, mult in opts:
        a = k24(n24, met); v24.append([x * mult for x in a[0]])
        b = k08(n08, met) if n08 else None
        if b: v08.append([x * mult for x in b[0]])
        else: ok08 = False
    eras = [v24] + ([v08] if ok08 else [])
    beta = BETA_SHARE if qid == 'm_gas' else BETA
    q = mc(qid, txt, [o[0] for o in opts], cat, eras, beta,
           f'各選択肢の県庁所在市の年間{"支出" if met=="金額" else "購入量"}vから、割合∝v^{beta}（{"2008年と2023〜2025年の対数平均" if ok08 else "2023〜2025年平均"}）',
           [SRC_K24] + ([SRC_K08] if ok08 else []), ['i:' + o[1] for o in opts])
    q['data'] = {'label': '選択肢ごとの1世帯あたり年間' + ('支出金額' if met == '金額' else '購入数量') + '（2023〜2025年平均）', 'unit': '円' if met == '金額' else '', 'opts': [{'o': o[0], 'v': [r3(x) for x in v24[j]], 'nat': k24(o[1], met)[1] * o[3]} for j, o in enumerate(opts)], 'note': '都道府県庁所在市の値'}

for qid, txt, opts, met, cat in KM8_ITEMS:
    v08 = [k08(n08, met)[0] for lab, n08 in opts]
    q = mc(qid, txt, [o[0] for o in opts], cat, [v08], BETA_SHARE, f'各選択肢の県庁所在市の年間支出（2008年）の割合をそのまま回答率とみなす', [SRC_K08], ['i8:' + o[1] for o in opts])
    q['data'] = {'label': '選択肢ごとの1世帯あたり年間支出金額（2008年）', 'unit': '円', 'opts': [{'o': o[0], 'v': [r3(x) for x in v08[j]], 'nat': k08(o[1], met)[1]} for j, o in enumerate(opts)], 'note': '都道府県庁所在市の値'}

# ---- S: 都道府県のすがた ----
for code, qid, txt, kind, sign, cat, grp, lab in S_ITEMS:
    s = SG[code]; v = [num(s['vals'][str(i + 1)]) for i in range(N)]; nat = num(s['vals']['0'])
    qt, oa, ob = txt.split('|')
    if kind == 'direct':
        p = [clamp(x / 100) for x in v]; how = f'指標の割合（{lab}）をそのまま回答率とみなす'
    elif kind == 'proxy':
        p = [clamp(sig(sign * BETA_PROXY * (logit(x / 100) - logit(nat / 100)))) for x in v]; how = f'指標（{lab}）の全国との差をロジット差{BETA_PROXY}倍で回答率に変換。全国の回答率を50%と仮定'
    else:
        p = [clamp(sig(BETA_COUNT * math.log(max(x, 0.05) / nat))) for x in v]; how = f'指標（{lab}）の全国比の対数×{BETA_COUNT}をロジットとする。全国の回答率を50%と仮定'
    add({'id': qid, 'cat': cat, 't': lab, 'q': qt, 'o': [oa, ob], 'p': [[r3(x), r3(1 - x)] for x in p], 'n0': 40 if kind == 'direct' else 25,
         'basis': 'S', 'how': how, 'data': {'label': lab, 'unit': s.get('unit') or '', 'rows': [{'era': str(s.get('year')), 'v': v, 'nat': nat}], 'note': '都道府県の値'},
         'src': [dict(SRC_SG, t=SRC_SG['t'] + f'（指標 {code}）')], 'g': [qid] + ([grp] if grp else [])})

# ---- W: 気象 ----
def W(qid, txt, vals, f, lab, unit, how, grp=None):
    qt, oa, ob = txt.split('|'); p = [clamp(f(x)) for x in vals]
    add({'id': qid, 'cat': '気候', 't': lab, 'q': qt, 'o': [oa, ob], 'p': [[r3(x), r3(1 - x)] for x in p], 'n0': 40, 'basis': 'W', 'how': how,
         'data': {'label': lab, 'unit': unit, 'rows': [{'era': '平年値（1991〜2020年）', 'v': vals, 'nat': None}], 'note': '各都道府県の気象台など1地点の値（埼玉県は熊谷、滋賀県は彦根。ほかは県庁所在地の地点）。県内の地域差は反映していない'},
         'src': [SRC_JMA], 'g': [grp or qid]})
snow = [JMA[p]['snow_total'] or 0 for p in P]
W('w_snow', '子どもの頃、冬に家のまわりで雪が積もるのは毎年のことだった？|毎年積もった|めったに積もらなかった', snow, lambda x: sig(SNOW_A + SNOW_B * math.log(x + 1)), '降雪の深さ（年合計）', 'cm', f'logit p = {SNOW_A} + {SNOW_B}×ln(降雪の深さ合計+1)（較正値）', 'snow')
tmin = [JMA[p]['tmin_jan'] for p in P]
W('w_ice', '子どもの頃、冬の朝に外の水たまりが凍っているのはふつうだった？|ふつうだった|めったになかった', tmin, lambda x: sig(-1.0 * (x - 0.5)), '1月の日最低気温（平均）', '℃', 'logit p = −1.0×(1月の日最低気温−0.5℃)（仮定）')
tmax = [JMA[p]['tmax_aug'] for p in P]
W('w_hot', '子どもの頃、夏は最高気温35℃前後の日がよくあった？|よくあった|あまりなかった', tmax, lambda x: sig(1.2 * (x - 32.5)), '8月の日最高気温（平均）', '℃', 'logit p = 1.2×(8月の日最高気温−32.5℃)（仮定）')

# ---- G: 中学校給食 ----
gk = [k for k in MX if re.search(r'平成', k)]
vals = []
for p_ in P:
    xs = [MX[k][p_][2] for k in gk if p_ in MX[k]]
    vals.append(sum(xs) / len(xs))
natg = sum(MX[k]['計'][2] for k in gk) / len(gk)
add({'id': 'g_lunch', 'cat': '学校', 't': '中学校の給食', 'q': '中学校では、毎日の給食（主食とおかず付き）があった？',
     'o': ['給食があった', 'お弁当だった'], 'p': [[r3(clamp(x / 100)), r3(1 - clamp(x / 100))] for x in vals], 'n0': 40, 'basis': 'G',
     'how': '公立中学校の生徒のうち完全給食を受けている割合（平成24〜30年度の平均）をそのまま回答率とみなす',
     'data': {'label': '公立中学校生徒の完全給食実施率（平成24〜30年度平均）', 'unit': '%', 'rows': [{'era': '平成24〜30年度平均（' + '・'.join(sorted(set(re.sub(r'^.*\|', '', k) for k in gk))) + '）', 'v': [r3(x) for x in vals], 'nat': r3(natg)}], 'note': '都道府県の値'},
     'src': [SRC_MX], 'g': ['g_lunch']})

# ---- F: 海なし県 ----
INLAND = ['栃木県', '群馬県', '埼玉県', '山梨県', '長野県', '岐阜県', '滋賀県', '奈良県']
add({'id': 'f_sea', 'cat': '地理', 't': '海に面した県', 'q': '子どもの頃に住んでいた都道府県は、海に面していた？', 'o': ['面していた', '海なし県'],
     'p': [[0.03, 0.97] if p_ in INLAND else [0.97, 0.03] for p_ in P], 'n0': 200, 'basis': 'F',
     'how': '海に面していない8県（栃木・群馬・埼玉・山梨・長野・岐阜・滋賀・奈良）は「海なし県」。勘違いの余地として3%を残す',
     'data': None, 'src': [{'t': '国土地理院「都道府県の海岸線」等の地理的事実（海に面しない8県）', 'u': 'https://www.gsi.go.jp/'}], 'g': ['f_sea']})


# ---- E: 郷土料理（農林水産省「うちの郷土料理」の都道府県別掲載） ----
ROMA = dict(zip(['hokkaido','aomori','iwate','miyagi','akita','yamagata','fukushima','ibaraki','tochigi','gunma','saitama','chiba','tokyo','kanagawa','niigata','toyama','ishikawa','fukui','yamanasi','nagano','gifu','shizuoka','aichi','mie','shiga','kyoto','osaka','hyogo','nara','wakayama','tottori','shimane','okayama','hiroshima','yamaguchi','tokushima','kagawa','ehime','kochi','fukuoka','saga','nagasaki','kumamoto','oita','miyazaki','kagoshima','okinawa'], P))
E_IN, E_REGION, E_OUT = 0.45, 0.07, 0.035   # 較正: README「較正」参照（有名な料理に偏った較正のため、掲載県の値は過大の可能性）
REGION = [0] + [1]*6 + [2]*7 + [3]*9 + [4]*7 + [5]*5 + [6]*4 + [7]*8
MAFF = R('maff_kyodo_ryori.json')
def norm(n): return re.sub(r'[\s（）()・／/「」]', '', n)
MASK = sorted(set(P + [re.sub(r'[都府県]$', '', p) for p in P if p != '北海道']), key=len, reverse=True)
def mask(t):
    for m in MASK: t = t.replace(m, '〇〇')
    return t
groups = {}
for d in MAFF:
    key = norm(d['name']); groups.setdefault(key, []).append(d)
for key, ds in groups.items():
    prefs = sorted(set(P.index(ROMA[d['pref']]) for d in ds))
    regs = set(REGION[k] for k in prefs)
    p = [E_IN if k in prefs else (E_REGION if REGION[k] in regs else E_OUT) for k in range(N)]
    name = ds[0]['name']; hint = mask(re.sub(r'\.\.\.$', '…', ds[0]['txt']))
    add({'id': 'e_' + str(len(QS)), 'cat': '郷土料理', 't': name, 'q': f'子どもの頃、「{name}」は身近な料理だった？（家・給食・地域の行事など）', 'hint': hint,
         'o': ['身近だった', '知らない・身近ではない'], 'p': [[r3(x), r3(1 - x)] for x in p], 'n0': 15, 'basis': 'E',
         'how': f'農林水産省「うちの郷土料理」で{"・".join(P[k] for k in prefs)}の郷土料理として掲載。掲載県の回答率{int(E_IN*100)}%・同じ地方{int(E_REGION*100)}%・その他{E_OUT*100:.1f}%と仮定（実際の回答で更新）',
         'data': {'label': '掲載都道府県', 'listed': prefs}, 'src': [{'t': '農林水産省「うちの郷土料理」（' + '、'.join(sorted(set(d['url'] for d in ds))) + '）をもとに作成（説明文は都道府県名を伏せる加工あり）', 'u': ds[0]['url']}],
         'g': ['e:' + key]})

# ---- 検査 ----
ids = set()
for q in QS:
    assert q['id'] not in ids; ids.add(q['id'])
    assert len(q['p']) == N
    for row in q['p']:
        assert len(row) == len(q['o']) and abs(sum(row) - 1) < 0.01, (q['id'], row)

meta = {'built': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%dT%H:%M+09:00'),
        'prefs': P, 'short': [re.sub(r'[都府県]$', '', p) if p != '北海道' else p for p in P],
        'region': [0] + [1]*6 + [2]*7 + [3]*9 + [4]*7 + [5]*5 + [6]*4 + [7]*8,
        'regions': ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'],
        'pop': POP, 'pop_src': '総務省統計局「統計でみる都道府県のすがた2026」総人口（2024年、万人）',
        'consts': {'BETA': BETA, 'BETA_SHARE': BETA_SHARE, 'BETA_PROXY': BETA_PROXY, 'BETA_COUNT': BETA_COUNT, 'SNOW': [SNOW_A, SNOW_B]}}
json.dump(QS, open(os.path.join(OUT, 'questions.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print('questions', len(QS), Counter(q['basis'] for q in QS), 'size', os.path.getsize(os.path.join(OUT, 'questions.json')))
