// 実ブラウザ（Chromium・Playwright）で index.html を開き、1ゲームを最後まで操作する。
// 使い方: node tests/e2e.js [スクリーンショット出力先ディレクトリ]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || path.join(__dirname, 'out');
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const res = { errors: [], steps: [] };
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2 });
    p.on('pageerror', e => res.errors.push(scheme + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') res.errors.push(scheme + ' console: ' + m.text()); });
    await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, `title-${scheme}.png`) });
    if (scheme === 'light') {
      const norm = await p.evaluate(() => { const S = window.__shusshin, q = S.QS[0].id;
        return [S.normPlay({ v: 1, truth: 12, a: [[q, 0, 1]] }) !== null, S.normPlay({ v: 2, truth: 12, a: [] }) === null, S.normPlay({ v: 1, truth: 99, a: [] }) === null,
          S.normPlay({ v: 1, truth: 3, a: [['__proto__', 0]] }) === null, S.normPlay({ v: 1, truth: 3, a: [[q, 9]] }) === null, S.normPlay({ v: 1, truth: 3, a: 'x' }) === null,
          S.normPlay({ v: 1, truth: 3, a: [['c:' + S.QS[300].id + '+' + S.QS[301].id, 2]] }) !== null]; });
      res.steps.push('NORM検査 ' + (norm.every(Boolean) ? '7/7 合格' : '不合格 ' + JSON.stringify(norm)));
      if (!norm.every(Boolean)) res.errors.push('NORM');
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    res.steps.push(`${scheme}: 横はみ出し ${sw}px`);
    await p.click('#startBtn');
    let n = 0;
    while (n < 40 && await p.isVisible('#v-quiz')) {
      const btns = await p.$$('#qOpts button'); await btns[n % btns.length].click(); n++;
      if (n === 5) await p.screenshot({ path: path.join(out, `quiz-${scheme}.png`) });
    }
    res.steps.push(`${scheme}: ${n}問で結果画面 visible=${await p.isVisible('#v-result')}`);
    await p.screenshot({ path: path.join(out, `result-${scheme}.png`) });
    await p.click('#noBtn'); await p.click('#noBtn');
    res.steps.push(`${scheme}: 県の選択 visible=${await p.isVisible('#rPick')}`);
    await p.click('#grid47 button >> nth=12');
    await p.waitForTimeout(300);
    res.steps.push(`${scheme}: 判定 ${await p.textContent('#rVerdict')} / 送信 ${await p.textContent('#rSend')}`);
    const rows = await p.$$eval('#rExp tbody tr', r => r.length);
    res.steps.push(`${scheme}: 内訳の行 ${rows}`);
    await p.screenshot({ path: path.join(out, `detail-${scheme}.png`), fullPage: true });
    await p.click('#homeBtn'); await p.click('#exploreBtn');
    await p.selectOption('#exCat', { index: 1 });
    await p.click('#mapbox path >> nth=26', { force: true });
    res.steps.push(`${scheme}: データ地図の行 ${await p.$$eval('#exTbl tbody tr', r => r.length)}`);
    await p.screenshot({ path: path.join(out, `explore-${scheme}.png`) });
    await p.click('#exBack'); await p.click('#aboutBtn');
    res.steps.push(`${scheme}: 出典 ${await p.$$eval('#srcList li', r => r.length)}件`);
    await p.close();
  }
  await b.close();
  console.log(JSON.stringify(res, null, 1));
  process.exit(res.errors.length ? 1 : 0);
})();
