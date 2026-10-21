'use strict';
// XC-1: 排他制御(追記専用イベント+読込時マージ)の参照実装。単一HTMLへ移植可能な純関数のみ。
const crypto = require('crypto');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};

const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const TSRC = new Set(['ext', 'fs', 'local', 'local-suspect']);
const OPS = new Set(['set', 'res']);
const MAX_EVENT_BYTES = 16384;

const hlcCmp = (a, b) => a[0] - b[0] || a[1] - b[1];
const isInt = (x) => Number.isSafeInteger(x) && x >= 0;

function bodyOf(e) {
  const b = Object.assign({}, e);
  delete b.h;
  return b;
}

function makeEvent(w, n, prev, x) {
  const e = {
    v: 1, id: w + ':' + n, w, n, rid: x.rid, op: x.op, f: x.f, parents: x.parents.slice().sort(),
    hlc: x.hlc, ts: x.ts, tsrc: x.tsrc, by: x.by, prev,
  };
  e.h = sha(canon(bodyOf(e)));
  return e;
}

function verifyEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return { ok: false, why: 'not-object' };
  if (e.v !== 1) return { ok: false, why: 'version' };
  if (!ID_RE.test(String(e.w)) || !isInt(e.n) || e.id !== e.w + ':' + e.n) return { ok: false, why: 'id' };
  if (!ID_RE.test(String(e.rid)) || RESERVED.has(e.rid)) return { ok: false, why: 'rid' };
  if (!OPS.has(e.op)) return { ok: false, why: 'op' };
  if (!e.f || typeof e.f !== 'object' || Array.isArray(e.f)) return { ok: false, why: 'f' };
  for (const k of Object.keys(e.f)) if (!FIELD_RE.test(k) || RESERVED.has(k)) return { ok: false, why: 'field' };
  if (!Array.isArray(e.parents) || e.parents.some((p) => typeof p !== 'string')) return { ok: false, why: 'parents' };
  if (!Array.isArray(e.hlc) || e.hlc.length !== 2 || !isInt(e.hlc[0]) || !isInt(e.hlc[1])) return { ok: false, why: 'hlc' };
  if (!TSRC.has(e.tsrc)) return { ok: false, why: 'tsrc' };
  if (typeof e.by !== 'string' || typeof e.ts !== 'string') return { ok: false, why: 'by-ts' };
  if (e.prev !== null && typeof e.prev !== 'string') return { ok: false, why: 'prev' };
  const body = canon(bodyOf(e));
  if (body.length > MAX_EVENT_BYTES) return { ok: false, why: 'size' };
  if (sha(body) !== e.h) return { ok: false, why: 'hash' };
  return { ok: true };
}

// ---- セグメント(JSONL) ----
function encodeSegment(events) { return events.map((e) => canon(e) + '\n').join(''); }

function decodeSegment(text) {
  const out = { events: [], violations: [], truncatedTail: false };
  const lines = text.split('\n');
  const endsWithNl = text.endsWith('\n');
  const last = lines.length - 1;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln === '') continue;
    let obj;
    try { obj = JSON.parse(ln); } catch (_) {
      if (i === last && !endsWithNl) { out.truncatedTail = true; continue; }
      out.violations.push({ line: i + 1, why: 'json' }); continue;
    }
    const r = verifyEvent(obj);
    if (!r.ok) {
      if (i === last && !endsWithNl) { out.truncatedTail = true; continue; }
      out.violations.push({ line: i + 1, why: r.why }); continue;
    }
    out.events.push(obj);
  }
  return out;
}

// 書込主体(w)ごとの連番・ハッシュ鎖の検証。欠番や鎖の不一致を報告する。
function verifyWriterChain(events) {
  const vio = [];
  const sorted = events.slice().sort((a, b) => a.n - b.n);
  let prevH = null; let expect = sorted.length ? sorted[0].n : 0;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.n !== expect) { vio.push({ id: e.id, why: 'gap', expected: expect }); expect = e.n; }
    if (i > 0 && e.prev !== prevH) vio.push({ id: e.id, why: 'chain' });
    prevH = e.h; expect = e.n + 1;
  }
  return vio;
}

// ---- 混合論理時計 ----
class Writer {
  constructor(w, by) { this.w = w; this.by = by; this.n = 0; this.prev = null; this.last = [0, 0]; }
  tick(physMs) {
    const ms = Math.max(physMs, this.last[0]);
    const c = ms === this.last[0] ? this.last[1] + 1 : 0;
    this.last = [ms, c];
    return [ms, c];
  }
  // 他者のイベントを取り込む。信頼時刻(refNow)+許容を超える未来は取り込まない(時計汚染の防止)。
  observe(ev, refNow, tol) {
    if (refNow != null && ev.hlc[0] > refNow + tol) return false;
    if (hlcCmp(ev.hlc, this.last) > 0) this.last = ev.hlc.slice();
    return true;
  }
  emit(view, rid, op, f, physMs, tsrc, jst) {
    const parents = heads(view, rid);
    const e = makeEvent(this.w, this.n, this.prev, {
      rid, op, f, parents, hlc: this.tick(physMs), ts: jst || '', tsrc: tsrc || 'local', by: this.by,
    });
    this.n += 1; this.prev = e.h;
    return e;
  }
}

function heads(view, rid) {
  const evs = [...view].filter((e) => e.rid === rid);
  const isParent = new Set();
  for (const e of evs) for (const p of e.parents) isParent.add(p);
  return evs.filter((e) => !isParent.has(e.id)).map((e) => e.id);
}

// ---- マージ(全イベント集合 → 状態。到着順・重複に依存しない) ----
function materialize(raw, opts) {
  opts = opts || {};
  const tol = opts.tol == null ? 300000 : opts.tol;
  const refNow = opts.refNow == null ? null : opts.refNow;
  const viol = [];
  const byId = new Map();
  for (const e of raw) {
    const r = verifyEvent(e);
    if (!r.ok) { viol.push({ id: e && e.id, why: r.why }); continue; }
    const p = byId.get(e.id);
    if (p) {
      if (p.h !== e.h) { viol.push({ id: e.id, why: 'dup-diff' }); if (e.h < p.h) byId.set(e.id, e); }
      continue;
    }
    byId.set(e.id, e);
  }
  // 因果配送: 親が全て揃ったものだけを採用(トポロジカル順)
  const ready = new Set(); const pend = new Map(byId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, e] of pend) {
      let ok = true;
      for (const p of e.parents) {
        const pe = byId.get(p);
        if (!ready.has(p) || !pe || pe.rid !== e.rid) { ok = false; break; }
      }
      if (ok) { ready.add(id); pend.delete(id); changed = true; }
    }
  }
  const anc = new Map();
  for (const id of ready) {
    const s = new Set();
    for (const p of byId.get(id).parents) { s.add(p); for (const a of anc.get(p)) s.add(a); }
    anc.set(id, s);
  }
  const suspect = (e) => e.tsrc === 'local-suspect' || (refNow != null && e.hlc[0] > refNow + tol);
  const recs = new Map();
  for (const id of ready) {
    const e = byId.get(id);
    if (!recs.has(e.rid)) recs.set(e.rid, new Map());
    const fm = recs.get(e.rid);
    for (const k of Object.keys(e.f)) { if (!fm.has(k)) fm.set(k, []); fm.get(k).push(e); }
  }
  const state = {};
  for (const rid of [...recs.keys()].sort()) {
    const fields = {}; const conflicts = {}; const undecided = [];
    for (const k of [...recs.get(rid).keys()].sort()) {
      const S = recs.get(rid).get(k);
      const cand = S.filter((x) => !S.some((y) => y !== x && anc.get(y.id).has(x.id)));
      const vals = new Map();
      for (const c of cand) vals.set(canon(c.f[k]), c.f[k]);
      if (vals.size === 1) { fields[k] = cand[0].f[k]; continue; }
      conflicts[k] = cand.map((c) => c.id).sort();
      if (cand.some(suspect)) { undecided.push(k); continue; }
      const win = cand.slice().sort((a, b) => hlcCmp(b.hlc, a.hlc) || (a.w < b.w ? 1 : a.w > b.w ? -1 : 0) || b.n - a.n)[0];
      fields[k] = win.f[k];
    }
    state[rid] = { fields, conflicts, undecided, deleted: fields._del === true };
  }
  const pending = [...pend.keys()].sort();
  viol.sort((a, b) => (a.id + a.why < b.id + b.why ? -1 : 1));
  return { state, pending, violations: viol, hash: sha(canon({ state, pending })) };
}

// 起動時の遅れ検知(参照通信が使えないとき)。現在時刻が全イベントの最大hlc.msより許容誤差を超えて遅れていれば遅れ(ms)を返す
function lagMs(nowMs, events, tol) {
  let mx = 0;
  for (const e of events) if (e.hlc[0] > mx) mx = e.hlc[0];
  const lag = mx - nowMs;
  return lag > (tol == null ? 300000 : tol) ? lag : 0;
}

module.exports = { lagMs, canon, sha, makeEvent, verifyEvent, encodeSegment, decodeSegment, verifyWriterChain, Writer, heads, materialize, hlcCmp };
