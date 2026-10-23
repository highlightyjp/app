// 節入り(太陽黄経315°+30°×k)の算出値を、国立天文台 暦要項の公表値(data/nao_terms.json)と比較する。
// 差(分) = アプリ − 公表値。しきい値 MAX_ABS_MIN(既定13分=アプリ内の記載値)を超えたら失敗。
const fs = require('fs'), path = require('path');
const { boot } = require('./harness');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'nao_terms.json'), 'utf8'));
const MAX_ABS_MIN = Number(process.env.MAX_ABS_MIN || 13);   // アプリ内の警告しきい値(30分)
(async () => {
  const { w } = await boot({});
  const rows = [];
  for (const [y, t] of Object.entries(data.terms)) {
    for (const [L, s] of Object.entries(t)) {
      const m = /^(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(s);
      const naoJD = w.eval(`UR.jdFromJST(${y}, ${+m[1]}, ${+m[2]}, ${+m[3]}, ${+m[4]})`);
      const appJD = w.eval(`UR.findTerm(${y}, ${L})`);
      rows.push({ y: +y, L: +L, diff: (appJD - naoJD) * 1440 });
    }
  }
  const abs = rows.map(r => Math.abs(r.diff));
  const max = Math.max(...abs);
  const worst = rows.reduce((a, r) => Math.abs(r.diff) > Math.abs(a.diff) ? r : a);
  const mean = rows.reduce((a, r) => a + r.diff, 0) / rows.length;
  const rms = Math.sqrt(rows.reduce((a, r) => a + r.diff * r.diff, 0) / rows.length);
  console.log(`points=${rows.length} maxAbs=${max.toFixed(1)}min mean=${mean.toFixed(1)}min rms=${rms.toFixed(1)}min`);
  console.log(`worst: ${worst.y} 黄経${worst.L}° diff=${worst.diff.toFixed(1)}min`);
  const byYear = {};
  rows.forEach(r => { (byYear[r.y] = byYear[r.y] || []).push(Math.abs(r.diff)); });
  Object.entries(byYear).forEach(([y, a]) => console.log(`  ${y}: max ${Math.max(...a).toFixed(1)}min`));
  if (process.env.DUMP) console.log(rows.map(r => `${r.y} ${r.L} ${r.diff.toFixed(1)}`).join('\n'));
  if (max > MAX_ABS_MIN) { console.log('FAIL: しきい値超過'); process.exit(1); }
  console.log('PASS');
  process.exit(0);
})();
