// 横スクロール検査(実ブラウザ・Chromium)。統一指示書 §5-2「iPhone 幅で完結。横スクロールなし」
// 全ツールを開いて実行し、ページ全体が横にはみ出す(scrollWidth > 画面幅)画面を列挙する。
// 実行: NODE_PATH=<playwright の node_modules> node tests/layout.test.js
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const WIDTHS = (process.env.WIDTHS || '320,360,390,430').split(',').map(Number);
const SCALES = (process.env.SCALES || '100,135').split(',').map(Number);

const measure = () => {
  const W = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (cs.position === 'fixed') continue;   // 固定バーはレイアウト viewport に追従するため原因ではない
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > W + 1 || r.left < -1) {
      let a = el.parentElement, contained = null;
      while (a && a !== document.body && a.tagName !== 'MAIN') {
        const c = getComputedStyle(a);
        if (/(auto|scroll|hidden|clip)/.test(c.overflowX) && a.getBoundingClientRect().right <= W + 1) { contained = (a.id ? '#' + a.id : '.' + String(a.className).split(' ')[0]); break; }
        a = a.parentElement;
      }
      if (!contained) bad.push({ el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), right: Math.round(r.right), left: Math.round(r.left), text: (el.textContent || '').trim().slice(0, 24) });
    }
  }
  document.querySelectorAll('.dtab>div, .pillars>div, .cell').forEach(c => {
    if (c.scrollWidth > c.clientWidth + 1) bad.push({ el: 'clipped:' + c.className, right: c.scrollWidth, left: c.clientWidth, text: (c.textContent || '').trim().slice(0, 24) });
  });
  return { W, sw, over: sw > W + 1, bad: bad.slice(0, 8) };
};

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  let checks = 0;
  for (const width of WIDTHS) for (const scale of SCALES) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ctx.addInitScript(s => { try { localStorage.setItem('uranai:ui:v1', JSON.stringify({ v: 1, theme: 'auto', glass: 70, scale: s })); } catch (e) {} }, scale);
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto(URL); await pg.waitForTimeout(200);
    const rec = async (label, immediate) => {
      checks++;
      if (!immediate) await pg.waitForTimeout(450);   // 画面遷移アニメーション(0.34秒)の完了を待つ
      const m = await pg.evaluate(measure);
      if (m.over || (!immediate && m.bad.length)) problems.push({ width, scale, label, sw: m.sw, W: m.W, bad: m.bad });
    };
    await rec('home');
    // プロフィール
    await pg.click('#tabbar .tab[data-tab=profile]'); await pg.waitForTimeout(150);
    await pg.fill('#p-birth', '1990-05-15'); await pg.fill('#p-time', '14:30');
    await pg.selectOption('#p-gender', 'm'); await pg.selectOption('#p-blood', 'A');
    const places = await pg.$$eval('#p-place option', o => o.map(x => x.value));
    await pg.selectOption('#p-place', places[1]); await pg.click('#p-save');
    await rec('profile');
    await pg.selectOption('#p-place', 'custom'); await rec('profile(custom)'); await pg.selectOption('#p-place', places[1]);
    await pg.click('#tabbar .tab[data-tab=look]'); await pg.waitForTimeout(100); await rec('look');
    await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(100);
    const n = await pg.$$eval('#tiles li button', b => b.length);
    for (let i = 0; i < n; i++) {
      await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(80);
      await pg.locator('#tiles li button').nth(i).click(); await pg.waitForTimeout(150);
      const title = (await pg.textContent('#nav-title')).trim();
      if (title === '姓名判断') { await pg.fill('#s-sei', '山田'); await pg.fill('#s-mei', '太郎'); }
      if (title === '今日の運勢') { await pg.fill('#birth', '1990-05-15'); }
      await rec(title + ' (遷移中)', true);   // アニメーション中も横にはみ出さないこと
      await rec(title + ' (初期)');
      const btns = pg.locator('section:not([hidden]) button.primary:visible');
      const bc = await btns.count();
      for (let k = 0; k < bc; k++) { try { await btns.nth(k).click({ timeout: 1500 }); await pg.waitForTimeout(250); } catch (e) {} }
      if (title === '周易') for (let k = 0; k < 5; k++) { try { await pg.locator('section:not([hidden]) button.primary:visible').first().click({ timeout: 1500 }); } catch (e) {} }
      // 入力が長い・選択肢が多い場面（横にはみ出しやすい）
      if (title === '姓名判断') {
        for (const [sei, mei] of [['髙橋嶋', 'ウィリアム'], ['長谷川', '紗羅々々々々'], ['渡邉', '一']]) {
          await pg.fill('#s-sei', sei); await pg.fill('#s-mei', mei); await pg.waitForTimeout(120);
          try { await pg.locator('section:not([hidden]) button.primary:visible').first().click({ timeout: 1500 }); } catch (e) {}
          await rec(`姓名判断 ${sei}/${mei}`);
        }
      }
      if (title === 'タロット' || title === 'ルーン') {
        const sel = pg.locator('section:not([hidden]) select').first();
        const opts = await sel.locator('option').evaluateAll(o => o.map(x => x.value));
        for (const v of opts) {
          await sel.selectOption(v);
          try { await pg.locator('section:not([hidden]) button.primary:visible').first().click({ timeout: 1500 }); } catch (e) {}
          await rec(`${title} ${v}`);
        }
      }
      if (title === '手相') {
        const sels = pg.locator('section:not([hidden]) select');
        const sc = await sels.count();
        for (let k = 0; k < sc; k++) { const vs = await sels.nth(k).locator('option').evaluateAll(o => o.map(x => x.value)); if (vs.length > 1) await sels.nth(k).selectOption(vs[vs.length - 1]); }
        try { await pg.locator('section:not([hidden]) button.primary:visible').first().click({ timeout: 1500 }); } catch (e) {}
        await rec('手相 最終選択');
      }
      if (title === '九星気学') { const seg = pg.locator('.seg button'); const sc = await seg.count(); for (let k = 0; k < sc; k++) { try { await seg.nth(k).click({ timeout: 800 }); await pg.waitForTimeout(100); await rec(title + ' seg' + k); } catch (e) {} } }
      await pg.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
      await rec(title + ' (結果)');
    }
    if (errs.length) problems.push({ width, scale, label: 'pageerror', bad: errs.slice(0, 3) });
    await ctx.close();
  }
  await browser.close();
  console.log(`checks=${checks}  problems=${problems.length}`);
  problems.forEach(p => console.log(`W${p.width} S${p.scale}% ${p.label}: scrollWidth=${p.sw}/${p.W} ${JSON.stringify(p.bad)}`));
  process.exit(problems.length ? 1 : 0);
})();
