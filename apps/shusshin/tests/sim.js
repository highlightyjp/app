// 的中率シミュレーション。node tests/sim.js [試行数/県] [条件]
// 条件: ideal（モデルどおりに答える）/ noisy（回答率をロジット上でσ=0.8ずらし、さらに5%は無作為に答える）
const path = require('path');
const QS = require(path.join(__dirname, '../data/questions.json'));
const META = require(path.join(__dirname, '../data/meta.json'));
const { create } = require(path.join(__dirname, '../src/engine.js'));
const trials = +process.argv[2] || 20, mode = process.argv[3] || 'ideal', seed0 = +process.argv[4] || 1;
let s = seed0; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const E = create(QS, META, null);
if (process.env.C) Object.assign(E.C, JSON.parse(process.env.C));
const N = 47, n = q => q.o.length;
// 真の回答率（noisy では統計モデルからずらす）
function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const TRUE = QS.map((q, qi) => {
  const arr = [];
  for (let k = 0; k < N; k++) {
    let p = []; for (let j = 0; j < n(q); j++) p.push(E.M[qi][k * n(q) + j]);
    if (mode === 'noisy') {
      const z = p.map(x => Math.log(x) + 0.8 * gauss()); const m = Math.max(...z); const e = z.map(x => Math.exp(x - m)); const t = e.reduce((a, b) => a + b, 0); p = e.map(x => x / t);
    }
    arr.push(p);
  }
  return arr;
});
const res = META.prefs.map(() => ({ hit: 0, top3: 0, nq: 0, t: 0 }));
const cal = Array.from({ length: 10 }, () => [0, 0]);
for (let k = 0; k < N; k++) for (let t = 0; t < trials; t++) {
  const st = E.newState();
  while (!E.shouldStop(st)) {
    const qi = E.pickNext(st, rnd); if (qi === -1) break;
    if (qi.comp) {   // まとめ問題：各料理を知っているかを独立に引き、知っている中から1つ選ぶ
      const known = qi.comp.map((c, i) => rnd() < TRUE[c][k][0] ? i : -1).filter(i => i >= 0);
      const j = known.length ? known[Math.floor(rnd() * known.length)] : qi.comp.length;
      E.answer(st, qi, j, false); continue;
    }
    let pj = TRUE[qi][k];
    if (mode === 'noisy' && rnd() < 0.05) pj = pj.map(() => 1 / pj.length);
    let r = rnd(), j = 0; for (; j < pj.length - 1; j++) { r -= pj[j]; if (r <= 0) break; }
    E.answer(st, qi, j, false);
  }
  const order = E.top(st.post, 47).map(x => x[1]);
  const g = order[0], mx = st.post[g];
  res[k].t++; res[k].hit += g === k; res[k].top3 += order.slice(0, 3).includes(k); res[k].nq += st.ans.length;
  cal[Math.min(9, Math.floor(mx * 10))][0]++; cal[Math.min(9, Math.floor(mx * 10))][1] += g === k;
}
const w = META.pop.reduce((a, b) => a + b, 0);
const pct = f => Math.round(1000 * res.reduce((a, r, k) => a + f(r) / r.t * META.pop[k], 0) / w) / 10;
const flat = f => Math.round(1000 * res.reduce((a, r) => a + f(r) / r.t, 0) / N) / 10;
const out = { mode, trials, questions: QS.length, hit_pop: pct(r => r.hit), top3_pop: pct(r => r.top3), hit_flat: flat(r => r.hit), avgQ: Math.round(100 * res.reduce((a, r, k) => a + r.nq / r.t * META.pop[k], 0) / w) / 100,
  worst: res.map((r, k) => [META.short[k], Math.round(100 * r.hit / r.t)]).sort((a, b) => a[1] - b[1]).slice(0, 8),
  calibration: cal.map((c, i) => `${i * 10}-${i * 10 + 10}%:${c[0]}件/的中${c[0] ? Math.round(100 * c[1] / c[0]) : '-'}%`) };
console.log(JSON.stringify(out, null, 1));
