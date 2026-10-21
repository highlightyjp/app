// GitHub Actions 用の取得中継（CORSで直接取れない商品URL用）。
// 取得先は許可ホストのみ（SSRF対策）。入力は環境変数。出力: coorde-relay/<RID>.json
const fs = require("fs");
const ALLOW = [/^www\.uniqlo\.com$/, /^www\.gu-global\.com$/, /^store\.shopping\.yahoo\.co\.jp$/, /^shopping\.yahoo\.co\.jp$/, /^zozo\.jp$/, /^(www\.)?zozo\.jp$/];
const RID = process.env.RID, META = process.env.META === "true", LINKS = process.env.LINKS === "true";
let URLS = [];
try { URLS = JSON.parse(process.env.URLS || "[]"); } catch (_) {}
if (!/^[A-Za-z0-9_-]{6,64}$/.test(RID || "") || !Array.isArray(URLS) || URLS.length < 1 || URLS.length > 20) { console.error("bad input"); process.exit(1); }
const MAX = 600000;
const okHost = (u) => { try { const x = new URL(u); return x.protocol === "https:" && ALLOW.some((r) => r.test(x.hostname)); } catch (_) { return false; } };
const attr = (tag, n) => { const m = tag.match(new RegExp(n + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)')", "i")); return m ? (m[2] ?? m[3]) : null; };
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function one(u) {
  try {
    if (!okHost(u)) throw new Error("host_not_allowed");
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
    const r = await fetch(u, { redirect: "follow", signal: ac.signal, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", "Accept-Language": "ja,en;q=0.8" } });
    clearTimeout(t);
    if (!okHost(r.url)) throw new Error("redirect_host_not_allowed");
    let text = await r.text(); if (text.length > MAX) text = text.slice(0, MAX);
    const out = { url: u, final_url: r.url, status: r.status, text };
    if (META) {
      const other = {}, tw = {};
      for (const m of text.matchAll(/<meta\b[^>]*>/gi)) {
        const k = attr(m[0], "property") || attr(m[0], "name"), v = attr(m[0], "content");
        if (k && v != null) { if (/^twitter:/i.test(k)) tw[k.slice(8)] = v; else other[k] = dec(v); }
      }
      out.page_metadata = { other, twitter: { data1: tw.data1 || null } };
    }
    if (LINKS) {
      const abs = (h) => { try { return new URL(dec(h), r.url).href; } catch (_) { return null; } };
      out.links = [...new Set([...text.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => abs(m[1])).filter((x) => x && /^https?:/.test(x)))].slice(0, 300);
      out.image_links = [...new Set([...text.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => abs(m[1])).filter((x) => x && /^https?:/.test(x)))].slice(0, 100);
    }
    return out;
  } catch (e) { return { url: u, error: String((e && e.message) || e) }; }
}
(async () => {
  const results = [];
  for (const u of URLS) results.push(await one(u));
  fs.mkdirSync("coorde-relay", { recursive: true });
  fs.writeFileSync(`coorde-relay/${RID}.json`, JSON.stringify({ at: new Date().toISOString(), results }));
})();
