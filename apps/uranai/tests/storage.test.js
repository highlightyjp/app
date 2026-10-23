// 統一指示書 v5 §4（schema v1・NORM・移行・読込失敗時の保存停止）の検証
const assert = require('assert');
const { boot } = require('./harness');
const LEG_P = JSON.stringify({ birth: '1990-05-15', time: '14:30', gender: 'm', blood: 'A', place: '東京都' });
const LEG_UI = JSON.stringify({ theme: 'dark', glass: 30, scale: 110 });
const results = [];
async function t(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name + ' :: ' + e.message]); }
}
(async () => {
  await t('旧キーを v1 に写し、旧キーは残す（§4-5）', async () => {
    const { d, ls, errs } = await boot({ 'uranai:profile': LEG_P, 'uranai:birth': '1990-05-15' });
    const v1 = JSON.parse(ls.getItem('uranai:profile:v1'));
    assert.strictEqual(v1.v, 1);
    assert.strictEqual(v1.birth, '1990-05-15');
    assert.strictEqual(v1.blood, 'A');
    assert.strictEqual(ls.getItem('uranai:profile'), LEG_P);
    assert.strictEqual(JSON.parse(ls.getItem('uranai:birth:v1')).birth, '1990-05-15');
    assert.strictEqual(ls.getItem('uranai:birth'), '1990-05-15');
    assert.strictEqual(d.getElementById('p-birth').value, '1990-05-15');
    assert.deepStrictEqual(errs, []);
  });
  await t('NORM: 不正値は空に正規化して保存（§4-2）', async () => {
    const { d, ls } = await boot({ 'uranai:profile:v1': JSON.stringify({ v: 1, birth: 'xx', gender: 'z', blood: 'Q', place: 5, lat: '', lon: '', extra: 1 }) });
    d.getElementById('p-birth').value = '1991-01-02';
    d.getElementById('p-save').click();
    const v1 = JSON.parse(ls.getItem('uranai:profile:v1'));
    assert.strictEqual(v1.birth, '1991-01-02');
    assert.strictEqual(v1.gender, '');
    assert.strictEqual(v1.blood, '');
    assert.strictEqual(v1.place, '');
    assert.strictEqual(v1.extra, undefined);
  });
  await t('読込失敗(v1が壊れている)時は保存を停止し、データを上書きしない（§4-6）', async () => {
    const broken = '{bad json';
    const { d, ls } = await boot({ 'uranai:profile:v1': broken });
    assert.ok(d.getElementById('p-msg').textContent.includes('保存を停止'));
    d.getElementById('p-birth').value = '1991-01-02';
    d.getElementById('p-save').click();
    assert.strictEqual(ls.getItem('uranai:profile:v1'), broken);
    assert.ok(d.getElementById('p-msg').textContent.includes('保存を停止'));
  });
  await t('読込失敗時もおみくじの保存は止まり、既存値は残る', async () => {
    const { d, ls } = await boot({ 'uranai:birth:v1': 'not json' });
    d.getElementById('birth').value = '1992-03-04';
    d.getElementById('go').click();
    assert.strictEqual(ls.getItem('uranai:birth:v1'), 'not json');
    assert.ok(d.getElementById('error').textContent.includes('保存を停止'));
  });
  await t('消去は v1 と旧キーの両方を削除し、読込失敗を解除する', async () => {
    const { d, ls } = await boot({ 'uranai:profile': LEG_P, 'uranai:profile:v1': '{bad' });
    d.getElementById('p-clear').click();
    assert.strictEqual(ls.getItem('uranai:profile:v1'), null);
    assert.strictEqual(ls.getItem('uranai:profile'), null);
    d.getElementById('p-birth').value = '1993-06-07';
    d.getElementById('p-save').click();
    assert.strictEqual(JSON.parse(ls.getItem('uranai:profile:v1')).birth, '1993-06-07');
  });
  await t('外観: 旧キーを移行し、変更時に v1 で保存、値は clamp される', async () => {
    const { d, ls, w } = await boot({ 'uranai:ui': LEG_UI });
    assert.strictEqual(d.documentElement.getAttribute('data-theme'), 'dark');
    d.getElementById('glass').value = '999';
    d.getElementById('glass').dispatchEvent(new w.Event('input'));
    const v1 = JSON.parse(ls.getItem('uranai:ui:v1'));
    assert.strictEqual(v1.v, 1);
    assert.strictEqual(v1.glass, 100);
    assert.strictEqual(v1.theme, 'dark');
    assert.strictEqual(v1.extra, undefined);
    assert.strictEqual(ls.getItem('uranai:ui'), LEG_UI);
  });
  await t('バージョン表示（§8-2）', async () => {
    const { d } = await boot({});
    assert.ok(d.getElementById('app-version').textContent.startsWith('V5'));
  });
  const fails = results.filter(r => r[0] === 'FAIL');
  results.forEach(r => console.log(r[0], r[1]));
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
