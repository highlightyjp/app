// 仕様の整合テスト: 時柱の連続性(23時台)・周易64卦の順序(出典照合)・各データの件数
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { boot } = require('./harness');
const results = [];
async function t(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + e.message]); } }

(async () => {
  const { w } = await boot({});
  const ev = e => JSON.parse(w.eval(`JSON.stringify(${e})`));
  const hourIdx = (y, m, d, h, mi) => {
    const r = ev(`UR.bazi(${y},${m},${d},{h:${h},mi:${mi}})`).hour;
    for (let i = 0; i < 60; i++) if (i % 10 === r.s && i % 12 === r.b) return i;
    throw new Error('干支の組合せが不正');
  };
  const addDay = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d + 1)); return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()]; };

  await t('時柱は60干支の連続(12時辰ごと+1)。23時台は翌0時台と同じ', async () => {
    let [y, m, d] = [2000, 1, 1];
    for (let n = 0; n < 400; n++) {
      const seq = [];
      for (let h = 0; h <= 22; h += 2) seq.push(hourIdx(y, m, d, h, 30));      // 子丑寅…亥
      for (let i = 1; i < seq.length; i++) assert.strictEqual(seq[i], (seq[i - 1] + 1) % 60, `${y}-${m}-${d} 時辰${i}`);
      const late = hourIdx(y, m, d, 23, 30);
      assert.strictEqual(late, (seq[11] + 1) % 60, `${y}-${m}-${d} 23:30 は 22:30 の次`);
      const [y2, m2, d2] = addDay(y, m, d);
      assert.strictEqual(late, hourIdx(y2, m2, d2, 0, 30), `${y}-${m}-${d} 23:30 == 翌日 0:30`);
      [y, m, d] = [y2, m2, d2];
    }
  });
  await t('23時台でも日柱は当日のまま(0時で切替)', async () => {
    const a = ev('UR.bazi(2000,1,1,{h:23,mi:30})').day, b = ev('UR.bazi(2000,1,1,{h:12,mi:0})').day;
    assert.deepStrictEqual(a, b);
  });
  await t('2000-01-01 23:30 の時柱は甲子（戊午日→翌日己未の子時）', async () => {
    const r = ev('UR.bazi(2000,1,1,{h:23,mi:30})').hour;
    assert.strictEqual(r.s, 0); assert.strictEqual(r.b, 0);
  });
  await t('周易: 64卦の順序・名称が出典（Wikipedia 六十四卦）と一致', async () => {
    const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'hexagrams.json'), 'utf8')).names;
    const VAR = { 豫:'予', 隨:'随', 觀:'観', 剝:'剥', 無:'无', 恆:'恒', 壯:'壮', 晉:'晋', 歸:'帰', 豐:'豊', 濟:'済' };
    const NATS = '水雷山天地風火沢';
    const core = n => { n = [...n].map(c => VAR[c] || c).join(''); if (n.includes('為')) return n[0]; if (n.length >= 3 && NATS.includes(n[0]) && NATS.includes(n[1])) return n.slice(2); return n; };
    const app = ev('UR.HEX').map(h => h.name);
    assert.strictEqual(app.length, 64); assert.strictEqual(src.length, 64);
    src.forEach((s, i) => assert.strictEqual(core(app[i]), core(s), `第${i + 1}卦 app=${app[i]} src=${s}`));
  });
  await t('周易: 上卦×下卦の組合せが64通りすべて異なる', async () => {
    assert.strictEqual(new Set(ev('UR.HEX').map(h => h.up + h.low)).size, 64);
  });
  await t('タロット: 78枚・名称重複なし・大アルカナ22', async () => {
    const d = ev('UR.DECK'); assert.strictEqual(d.length, 78);
    assert.strictEqual(new Set(d.map(c => c.name)).size, 78);
    assert.strictEqual(d.filter(c => c.major).length, 22);
  });
  await t('ルーン: 24文字・逆位置なし9文字', async () => {
    const r = ev('UX.RUNES'); assert.strictEqual(r.length, 24);
    assert.strictEqual(r.filter(x => !x.rev).length, 9);
  });
  const fails = results.filter(r => r[0] === 'FAIL');
  results.forEach(r => console.log(r[0], r[1]));
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
