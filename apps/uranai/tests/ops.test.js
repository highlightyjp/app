/* 操作網羅テスト(Chromium/Playwright)。実行: NODE_PATH=/opt/npm-tools/node_modules node tests/ops.test.js */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.URL || 'file://' + path.resolve(__dirname, '../index.html');
const problems = [];
const bad = (m) => { problems.push(m); };
const SEL = 'button,a[href],input,select,textarea,[role=button],[tabindex]:not([tabindex="-1"])';

async function audit(pg, tag) {
  const r = await pg.evaluate((SEL) => {
    const out = [];
    const W = document.documentElement.clientWidth, H = innerHeight;
    const doc = document.scrollingElement;
    if (doc.scrollWidth > W + 0.5) out.push('doc横スクロール scrollWidth=' + doc.scrollWidth + ' W=' + W);
    const tb = document.getElementById('tabbar').getBoundingClientRect();
    document.querySelectorAll(SEL).forEach((e) => {
      const cs = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden' || e.closest('[hidden]') || cs.display === 'none') return;
      const t = (e.id || e.className || e.tagName) + '|' + (e.textContent || e.value || '').trim().slice(0, 12);
      if (e.type !== 'range' && (b.width < 44 - 0.5 || b.height < 44 - 0.5) && !e.closest('#theme-seg'))
        out.push('タップ領域<44 ' + t + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      if (e.type === 'range' && b.height < 44 - 0.5) out.push('range<44 ' + t + ' h' + Math.round(b.height));
      if (b.left < -0.5 || b.right > W + 0.5) out.push('画面外(横) ' + t + ' L' + Math.round(b.left) + ' R' + Math.round(b.right));
    });
    return out;
  }, SEL);
  r.forEach((m) => bad(tag + ' ' + m));
}

(async () => {
  const b = await chromium.launch();
  const configs = [
    { n: 'iPhoneSE', w: 320, h: 568 }, { n: 'iPhone', w: 390, h: 844 }, { n: 'landscape', w: 844, h: 390 }, { n: 'iPad', w: 820, h: 1180 },
  ];
  for (const c of configs) {
    const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, isMobile: c.w < 700, hasTouch: true });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(String(e)));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(URL); await pg.waitForTimeout(300);
    const tag = c.n;

    /* 1. 全画面の静的監査 */
    await audit(pg, tag + ' home');
    for (const t of ['profile', 'look', 'home']) { await pg.click(`#tabbar .tab[data-tab=${t}]`); await pg.waitForTimeout(350); await audit(pg, tag + ' tab:' + t); }

    /* 2. 末尾が tabbar に隠れないか(各画面を最下部までスクロール) */
    for (const t of ['home', 'profile', 'look']) {
      await pg.click(`#tabbar .tab[data-tab=${t}]`); await pg.waitForTimeout(300);
      const hid = await pg.evaluate(() => { window.scrollTo(0, 1e6); const tb = document.getElementById('tabbar').getBoundingClientRect();
        const vis = [...document.querySelectorAll('main *')].filter(e => !e.closest('[hidden]') && e.getBoundingClientRect().height > 0 && e.children.length === 0);
        const last = vis.reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), 0); return last > tb.top + 1 ? Math.round(last - tb.top) : 0; });
      if (hid) bad(tag + ' ' + t + ' 末尾がタブバーに隠れる ' + hid + 'px');
    }

    /* 3. 戻る導線: 履歴・スクロール復元 */
    await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(300);
    await pg.evaluate(() => window.scrollTo(0, 1e6)); await pg.waitForTimeout(100);
    const y0 = await pg.evaluate(() => scrollY);
    const items = pg.locator('#tiles li:not([hidden]) button');
    const lastIdx = (await items.count()) - 1;
    await items.nth(lastIdx).click({ timeout: 3000 }).catch(() => bad(tag + ' 最下部の項目がタブバーに隠れ押せない(最大スクロール時)')); await pg.waitForTimeout(500);
    const inTool = await pg.evaluate(() => !document.getElementById('nav-back').hidden);
    if (!inTool) bad(tag + ' 最終項目が開かない(タブバー被り等)');
    await pg.goBack().catch(() => {}); await pg.waitForTimeout(300);
    const stillApp = await pg.evaluate(() => !!document.getElementById('tabbar')).catch(() => false);
    const backHidden = stillApp ? await pg.evaluate(() => document.getElementById('nav-back').hidden) : true;
    if (!stillApp) { await pg.goto(URL); await pg.waitForTimeout(300); }
    if (!stillApp) bad(tag + ' ブラウザ戻る でアプリを離脱');
    else if (!backHidden) bad(tag + ' ブラウザ戻る でツールからホームへ戻らない(履歴未連携)');
    await pg.evaluate(() => { const b = document.getElementById('nav-back'); if (!b.hidden) b.click(); }); await pg.waitForTimeout(300);
    const y1 = await pg.evaluate(() => scrollY);
    if (y0 > 100 && y1 < y0 - 50) bad(tag + ' 戻るでホームのスクロール位置が復元されない ' + y0 + '→' + y1);

    /* 4. 連打・遷移中操作 */
    for (let i = 0; i < 6; i++) { await pg.click('#tabbar .tab[data-tab=profile]', { delay: 0 }); await pg.click('#tabbar .tab[data-tab=look]'); await pg.click('#tabbar .tab[data-tab=home]'); }
    const tiles = pg.locator('#tiles li button');
    await tiles.nth(2).dblclick(); await pg.waitForTimeout(400);
    const vis = await pg.evaluate(() => [...document.querySelectorAll('main section, main > div')].filter(e => !e.hidden && e.getBoundingClientRect().height > 0 && e.matches('section.page,#home,#tab-profile,#tab-look,#tool-omikuji')).length);
    if (vis !== 1) bad(tag + ' 連打後に表示画面が' + vis + '個');
    await pg.click('#tabbar .tab[data-tab=home]');

    /* 5. 検索 */
    await pg.fill('#q', 'ゼロ件'); await pg.waitForTimeout(100);
    if (await pg.evaluate(() => document.getElementById('no-result').hidden)) bad(tag + ' 検索0件表示なし');
    await pg.fill('#q', 'タロ'); const n = await pg.locator('#tiles li:not([hidden])').count(); if (n !== 1) bad(tag + ' 検索「タロ」' + n + '件');
    await pg.fill('#q', '');


    /* 5b. 履歴・スワイプ・キーボード */
    await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(200);
    const h0 = await pg.evaluate(() => history.length);
    for (let i = 0; i < 4; i++) { await pg.locator('#tiles li button').nth(1).click(); await pg.waitForTimeout(350); await pg.click('#nav-back'); await pg.waitForTimeout(350); }
    const h1 = await pg.evaluate(() => history.length);
    if (h1 > h0 + 1) bad(tag + ' 開閉を繰り返すと履歴が増え続ける ' + h0 + '→' + h1);
    await pg.locator('#tiles li button').nth(1).click(); await pg.waitForTimeout(300);
    await pg.click('#tabbar .tab[data-tab=profile]'); await pg.waitForTimeout(300);
    await pg.goBack().catch(() => {}); await pg.waitForTimeout(300);
    if (!(await pg.evaluate(() => !!document.getElementById('tabbar')).catch(() => false))) { bad(tag + ' ツール→タブ→戻る でアプリ離脱'); await pg.goto(URL); await pg.waitForTimeout(300); }
    await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(200);
    await pg.locator('#tiles li button').nth(0).focus(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(350);
    if (await pg.evaluate(() => document.getElementById('nav-back').hidden)) bad(tag + ' キーボード Enter でツールが開かない');
    await pg.evaluate(() => { const t = (x, y, type) => document.dispatchEvent(new TouchEvent(type, { bubbles: true, changedTouches: [new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y })], touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y })] })); t(5, 300, 'touchstart'); t(140, 310, 'touchend'); });
    await pg.waitForTimeout(400);
    if (!(await pg.evaluate(() => document.getElementById('nav-back').hidden))) bad(tag + ' 左端スワイプで戻れない');

    /* 6. プロフィール全操作 */
    await pg.click('#tabbar .tab[data-tab=profile]'); await pg.waitForTimeout(300);
    await pg.fill('#p-birth', '1990-05-15'); await pg.fill('#p-time', '23:30'); await pg.selectOption('#p-gender', 'f'); await pg.selectOption('#p-blood', 'AB');
    await pg.selectOption('#p-place', 'custom'); await pg.waitForTimeout(100); await audit(pg, tag + ' profile:custom');
    await pg.fill('#p-lat', '999'); await pg.fill('#p-lon', 'abc').catch(() => {}); await pg.click('#p-save'); await pg.waitForTimeout(150);
    await pg.fill('#p-lat', '35.68'); await pg.fill('#p-lon', '139.76'); await pg.click('#p-save'); await pg.waitForTimeout(150);
    await pg.fill('#p-birth', ''); await pg.click('#p-save'); await pg.fill('#p-birth', '1990-05-15'); await pg.click('#p-save');

    /* 7. 各ツール: 全ボタン・全select値を操作 */
    const names = await pg.$$eval('#tiles li button .t', e => e.map(x => x.textContent));
    for (let i = 0; i < names.length; i++) {
      await pg.click('#tabbar .tab[data-tab=home]'); await pg.waitForTimeout(150);
      await pg.locator('#tiles li button').nth(i).evaluate(e => e.scrollIntoView({block:'center'})); await pg.locator('#tiles li button').nth(i).click(); await pg.waitForTimeout(450);
      if (names[i] === '姓名判断') { await pg.fill('#s-sei', '髙橋嶋'); await pg.fill('#s-mei', 'ウィリアム'); }
      if (names[i] === '今日の運勢') await pg.fill('#birth', '1990-05-15');
      for (let rep = 0; rep < 2; rep++) {
        const sels = pg.locator('section:not([hidden]) select:visible'); const sc = await sels.count();
        for (let s = 0; s < sc; s++) { const vals = await sels.nth(s).locator('option').evaluateAll(o => o.map(x => x.value)); for (const v of vals) { await sels.nth(s).selectOption(v); const btn = pg.locator('section:not([hidden]) button.primary:visible'); const bc = await btn.count(); for (let k = 0; k < bc; k++) await btn.nth(k).click({ timeout: 2000 }).catch(() => bad(tag + ' ' + names[i] + ' ボタン押下不可')); await pg.waitForTimeout(60); } }
        const bts = pg.locator('section:not([hidden]) button:visible'); const bn = await bts.count();
        for (let k = 0; k < bn; k++) await bts.nth(k).click({ timeout: 2000 }).catch(() => bad(tag + ' ' + names[i] + ' button#' + k + ' 押下不可(被り/無効)'));
        await pg.waitForTimeout(100);
      }
      await audit(pg, tag + ' tool:' + names[i]);
      await pg.evaluate(() => window.scrollTo(0, 1e6)); await audit(pg, tag + ' tool-bottom:' + names[i]);
      const cl = await pg.evaluate(() => { const tb = document.getElementById('tabbar').getBoundingClientRect(); const els = [...document.querySelectorAll('section:not([hidden]) *')].filter(e => e.children.length === 0 && e.getBoundingClientRect().height > 0 && !(e.closest('details') && !e.closest('details').open && !e.closest('summary'))); return Math.round(els.reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), 0) - tb.top); });
      if (cl > 1) bad(tag + ' ' + names[i] + ' 末尾がタブバーに隠れる ' + cl + 'px');
    }

    /* 8. 向き変更・外観 */
    await pg.setViewportSize({ width: c.h, height: c.w }); await pg.waitForTimeout(250); await audit(pg, tag + ' rotated');
    await pg.setViewportSize({ width: c.w, height: c.h });
    await pg.emulateMedia({ colorScheme: 'dark' }); await pg.click('#tabbar .tab[data-tab=look]'); await pg.waitForTimeout(250); await audit(pg, tag + ' dark');
    for (const sc of [85, 135]) { await pg.evaluate((s) => { const e = document.getElementById('textsize'); e.value = s; e.dispatchEvent(new Event('input', { bubbles: true })); }, sc); await pg.waitForTimeout(150); await audit(pg, tag + ' scale' + sc); }

    errs.forEach((e) => bad(tag + ' エラー: ' + e));
    await ctx.close();
  }
  await b.close();
  const u = [...new Set(problems)];
  console.log('problems=' + u.length); u.forEach((p) => console.log(' - ' + p));
  process.exit(u.length ? 1 : 0);
})();
