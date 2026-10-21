const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// seed: { key: rawString } を localStorage に入れてから起動する
function boot(seed = {}) {
  const errs = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/',
    beforeParse(w) {
      Object.entries(seed).forEach(([k, v]) => w.localStorage.setItem(k, v));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.requestAnimationFrame = w.requestAnimationFrame || (f => setTimeout(f, 0));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.scrollTo = () => {};
      w.addEventListener('error', e => errs.push('PAGEERR ' + e.message));
    },
  });
  const w = dom.window;
  return new Promise(res => setTimeout(() => res({ dom, w, d: w.document, ls: w.localStorage, errs }), 300));
}
module.exports = { boot, HTML };
