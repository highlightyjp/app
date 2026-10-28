// エンジンの単体テスト（node tests/engine.test.js）
const assert = require('assert');
const QS = require('../data/questions.json'), META = require('../data/meta.json');
const { create } = require('../src/engine.js');
const E = create(QS, META, null);
let ok = 0; const t = (name, f) => { f(); ok++; console.log('ok', name); };
t('事前確率の合計が1', () => assert(Math.abs(E.PRIOR.reduce((a, b) => a + b, 0) - 1) < 1e-9));
t('全問の回答確率が各県で合計1', () => QS.forEach((q, qi) => { const n = q.o.length; for (let k = 0; k < 47; k++) { let s = 0; for (let j = 0; j < n; j++) s += E.M[qi][k * n + j]; assert(Math.abs(s - 1) < 1e-6, q.id); } }));
t('まとめ問題の尤度が選択肢全体で合計1', () => { const comp = QS.map((q, i) => [q, i]).filter(x => x[0].basis === 'E').slice(0, 4).map(x => x[1]); for (const k of [0, 12, 46]) { let s = 0; for (let j = 0; j <= 4; j++) s += E.likeCombo(comp, k, j); assert(Math.abs(s - 1) < 1e-9); } });
t('事後確率の合計が1', () => { const st = E.newState(); for (let i = 0; i < 10; i++) { const qi = E.pickNext(st, () => 0.5); E.answer(st, qi, 0, i % 3 === 0); } assert(Math.abs(st.post.reduce((a, b) => a + b, 0) - 1) < 1e-9); });
t('同じグループの質問を重ねて出さない', () => { const st = E.newState(); const seen = new Set(); for (let i = 0; i < 30; i++) { const qi = E.pickNext(st, Math.random); if (qi === -1) break; const ids = qi.comp || [qi]; for (const x of ids) for (const g of QS[x].g) { assert(!seen.has(g), g); } ids.forEach(x => QS[x].g.forEach(g => seen.add(g))); E.answer(st, qi, 0, false); } });
t('最初の3問は広い問題（家計調査の多肢・気候・統計・地理）', () => { const st = E.newState(); for (let i = 0; i < 3; i++) { const qi = E.pickNext(st, Math.random); assert(['KM', 'W', 'G', 'F', 'S'].includes(QS[qi].basis)); E.answer(st, qi, 0, false); } });
t('みんなの回答で確率が動く', () => { const qi = QS.findIndex(q => q.id === 'f_sea'); const before = E.M[qi][12 * 2]; const cnt = new Array(94).fill(0); cnt[12 * 2 + 1] = 5000; E.rebuild({ q: { f_sea: cnt }, n: new Array(47).fill(0) }); assert(E.M[qi][12 * 2] < before / 2); E.rebuild({ q: {}, n: new Array(47).fill(0) }); assert(Math.abs(E.M[qi][12 * 2] - before) < 1e-12); });
t('人口に比例した珍しさの計算が正', () => { const st = E.newState(); E.answer(st, QS.findIndex(q => q.id === 'f_sea'), 1, false); const o = E.oddsOf(st.ans); assert(o > 1 && o < 100); });
console.log(`${ok}件 成功`);
