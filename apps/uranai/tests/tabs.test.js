// §7-4: 全ツールを開いて戻る巡回。ページエラーがないこと
const assert = require('assert');
const { boot } = require('./harness');
(async () => {
  const { d, w, errs } = await boot({});
  const btns = [...d.querySelectorAll('#tiles li button')];
  console.log('tiles:', btns.length);
  assert.strictEqual(btns.length, 10);
  const names = [];
  for (const b of btns) {
    b.click();
    await new Promise(r => setTimeout(r, 50));
    const title = d.getElementById('nav-title').textContent.trim();
    const isBack = !d.getElementById('nav-back').hidden;
    names.push(isBack && title ? title : '(none)');
    if (isBack) d.getElementById('nav-back').click();
    await new Promise(r => setTimeout(r, 50));
  }
  console.log('opened:', names.join(', '));
  console.log('page errors:', errs.length ? errs : 'none');
  assert.deepStrictEqual(errs, []);
  assert.ok(names.every(n => n !== '(none)'));
  console.log('PASS tabs');
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
