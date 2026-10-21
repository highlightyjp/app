'use strict';
const M = require('./merge.js');
let pass = 0; const fail = [];
const ok = (c, m) => { if (c) pass++; else fail.push(m); };
const rng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const T0 = Date.UTC(2026, 9, 22, 0, 0, 0);
const FIELDS = ['a', 'b', 'c', 'd'];

// 逐次/並行のシミュレーション。sync: 発行前に全イベントを受け取る確率
function sim(seed, o) {
  const r = rng(seed); const ws = [];
  for (let i = 0; i < o.writers; i++) ws.push({ w: new M.Writer('w' + i + 'x', 'u' + i), view: new Set(), skew: (o.skew || [])[i] || 0 });
  const all = [];
  for (let s = 0; s < o.steps; s++) {
    const x = ws[Math.floor(r() * ws.length)];
    // 配送: 親が揃っているイベントだけを受け取る(因果閉包を保つ)
    const k = o.sync === 1 ? 1e9 : Math.floor(r() * o.maxDeliver);
    for (let j = 0; j < k; j++) {
      const c = all.filter((e) => !x.view.has(e) && e.parents.every((p) => [...x.view].some((v) => v.id === p)));
      if (!c.length) break;
      const e = c[Math.floor(r() * c.length)];
      x.view.add(e); x.w.observe(e, null, 0);
    }
    const rid = 'r' + Math.floor(r() * o.records);
    const nf = 1 + Math.floor(r() * 2);
    const f = {};
    for (let i = 0; i < nf; i++) {
      const fld = o.disjoint ? FIELDS[ws.indexOf(x) % FIELDS.length] : FIELDS[Math.floor(r() * FIELDS.length)];
      f[fld] = Math.floor(r() * 3);
    }
    const e = x.w.emit(x.view, rid, 'set', f, T0 + s * 1000 + x.skew, 'local', '');
    x.view.add(e); all.push(e);
  }
  return all;
}

// 独立オラクル(別経路): 後方BFSで到達可能性を計算し、定義どおりに候補を求める
function oracle(events) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const reach = (from, target) => {
    const st = [from]; const seen = new Set();
    while (st.length) { const id = st.pop(); if (seen.has(id)) continue; seen.add(id); if (id === target) return true; for (const p of byId.get(id).parents) st.push(p); }
    return false;
  };
  const out = {};
  const rids = [...new Set(events.map((e) => e.rid))];
  for (const rid of rids) {
    for (const k of FIELDS) {
      const S = events.filter((e) => e.rid === rid && k in e.f);
      if (!S.length) continue;
      const cand = S.filter((x) => !S.some((y) => y !== x && reach(y.id, x.id)));
      const vals = new Set(cand.map((c) => JSON.stringify(c.f[k])));
      out[rid + '/' + k] = { n: vals.size, ids: cand.map((c) => c.id).sort() };
    }
  }
  return out;
}

// T1 収束・冪等・順序非依存、T2 オラクル一致
for (let seed = 1; seed <= 25; seed++) {
  const ev = sim(seed, { writers: 4, steps: 60, records: 3, maxDeliver: 3 });
  const base = M.materialize(ev);
  for (let t = 0; t < 8; t++) {
    const r = rng(seed * 100 + t);
    const sh = ev.slice().sort(() => r() - 0.5);
    const dup = sh.concat(sh.filter(() => r() < 0.3)).sort(() => r() - 0.5);
    ok(M.materialize(dup).hash === base.hash, 'convergence seed=' + seed + ' t=' + t);
  }
  ok(base.pending.length === 0 && base.violations.length === 0, 'clean seed=' + seed);
  const orc = oracle(ev);
  let same = true;
  for (const rid of Object.keys(base.state)) {
    for (const k of FIELDS) {
      const o = orc[rid + '/' + k];
      const inConf = k in base.state[rid].conflicts;
      if (!o) { if (k in base.state[rid].fields || inConf) same = false; continue; }
      if ((o.n > 1) !== inConf) same = false;
      if (inConf && JSON.stringify(base.state[rid].conflicts[k]) !== JSON.stringify(o.ids)) same = false;
    }
  }
  ok(same, 'oracle seed=' + seed);
}

// T3 逐次編集は競合を生まない(全同期)。時計ずれ±1時間でも同じ
for (let seed = 1; seed <= 30; seed++) {
  const ev = sim(seed, { writers: 4, steps: 80, records: 2, sync: 1, skew: [0, 3600000, -3600000, 7200000] });
  const m = M.materialize(ev);
  ok(Object.values(m.state).every((s) => Object.keys(s.conflicts).length === 0), 'serial-no-conflict seed=' + seed);
}

// T4 担当フィールドが重ならない並行編集は競合しない
for (let seed = 1; seed <= 30; seed++) {
  const ev = sim(seed, { writers: 4, steps: 80, records: 2, maxDeliver: 1, disjoint: true });
  const m = M.materialize(ev);
  ok(Object.values(m.state).every((s) => Object.keys(s.conflicts).length === 0), 'disjoint-no-conflict seed=' + seed);
}

// T5 同一フィールドの並行変更は競合になり、res で解消し、解消後に再び並行しなければ競合は戻らない
{
  const A = new M.Writer('A1', 'ua'); const B = new M.Writer('B1', 'ub');
  const e0 = A.emit(new Set(), 'r1', 'set', { a: 0 }, T0, 'local', '');
  B.observe(e0, null, 0);
  const vA = new Set([e0]); const vB = new Set([e0]);
  const ea = A.emit(vA, 'r1', 'set', { a: 1 }, T0 + 1000, 'local', '');
  const eb = B.emit(vB, 'r1', 'set', { a: 2 }, T0 + 2000, 'local', '');
  let m = M.materialize([e0, ea, eb]);
  ok('a' in m.state.r1.conflicts && m.state.r1.fields.a === 2, 'conflict-detect+provisional-latest');
  const all = new Set([e0, ea, eb]);
  const res = A.emit(all, 'r1', 'res', { a: 1 }, T0 + 3000, 'local', '');
  ok(res.parents.length === 2, 'res-parents-all-heads');
  m = M.materialize([e0, ea, eb, res]);
  ok(!('a' in m.state.r1.conflicts) && m.state.r1.fields.a === 1, 'res-clears');
  // 同じ値への並行変更は競合にしない
  const A2 = new M.Writer('A2', 'ua'); const B2 = new M.Writer('B2', 'ub');
  const x = A2.emit(new Set(), 'r2', 'set', { a: 5 }, T0, 'local', '');
  const y = B2.emit(new Set(), 'r2', 'set', { a: 5 }, T0, 'local', '');
  ok(Object.keys(M.materialize([x, y]).state.r2.conflicts).length === 0, 'same-value-no-conflict');
}

// T6 時計: 未来側のずれは refNow があれば検知し、暫定採用を保留(undecided)にする。HLC汚染を防ぐ
{
  const A = new M.Writer('A3', 'ua'); const B = new M.Writer('B3', 'ub');
  const e0 = A.emit(new Set(), 'r3', 'set', { a: 0 }, T0, 'ext', '');
  B.observe(e0, T0, 300000);
  const ea = A.emit(new Set([e0]), 'r3', 'set', { a: 1 }, T0 + 1000, 'ext', '');
  const eb = B.emit(new Set([e0]), 'r3', 'set', { a: 2 }, T0 + 3600000, 'local', ''); // +1h進み
  let m = M.materialize([e0, ea, eb]);
  ok(m.state.r3.fields.a === 2, 'no-refnow: skewed-forward wins (known limit)');
  m = M.materialize([e0, ea, eb], { refNow: T0 + 2000, tol: 300000 });
  ok(m.state.r3.undecided.includes('a') && !('a' in m.state.r3.fields), 'refnow: undecided');
  const C = new M.Writer('C3', 'uc');
  ok(C.observe(eb, T0 + 2000, 300000) === false && C.last[0] === 0, 'future-not-absorbed');
  const ec = C.emit(new Set([e0, ea]), 'r3', 'set', { a: 3 }, T0 + 5000, 'ext', '');
  ok(ec.hlc[0] === T0 + 5000, 'hlc-not-poisoned');
  // HLC単調性: 後方にずれた時計でも受信済みhlcより小さくならない
  const D = new M.Writer('D3', 'ud');
  D.observe(ea, T0 + 2000, 300000);
  const ed = D.emit(new Set([e0, ea]), 'r3', 'set', { b: 1 }, T0 - 3600000, 'local-suspect', '');
  ok(M.hlcCmp(ed.hlc, ea.hlc) > 0, 'hlc-monotonic-behind-clock');
  // local-suspect は refNow 無しでも保留
  const bad = M.materialize([e0, ea, Object.assign({}, eb, { tsrc: 'local-suspect' })]);
  ok(bad.violations.length === 1 && bad.violations[0].why === 'hash', 'tamper-detect-hash');
}

// T7 完全性: 末尾切れ・途中破損・欠番・鎖不一致・重複異内容・親欠落・不正フィールド
{
  const W = new M.Writer('W1', 'u'); const evs = []; let view = new Set();
  for (let i = 0; i < 5; i++) { const e = W.emit(view, 'r', 'set', { a: i }, T0 + i, 'local', ''); view.add(e); evs.push(e); }
  const text = M.encodeSegment(evs);
  let d = M.decodeSegment(text);
  ok(d.events.length === 5 && !d.truncatedTail && d.violations.length === 0, 'segment-roundtrip');
  d = M.decodeSegment(text.slice(0, text.length - 20));
  ok(d.events.length === 4 && d.truncatedTail, 'truncated-tail-ignored');
  const lines = text.split('\n'); lines[2] = lines[2].replace('"a":2', '"a":9');
  d = M.decodeSegment(lines.join('\n'));
  ok(d.events.length === 4 && d.violations.length === 1 && d.violations[0].why === 'hash', 'mid-corruption-detected');
  ok(M.verifyWriterChain(d.events).some((v) => v.why === 'gap'), 'gap-detected');
  const swapped = evs.slice(); const e4 = Object.assign({}, evs[4]);
  ok(M.verifyWriterChain(evs).length === 0, 'chain-clean');
  const forged = M.makeEvent('W1', 3, 'deadbeef', { rid: 'r', op: 'set', f: { a: 1 }, parents: [], hlc: [1, 0], ts: '', tsrc: 'local', by: 'u' });
  ok(M.verifyWriterChain([evs[0], evs[1], evs[2], forged, evs[4]]).some((v) => v.why === 'chain'), 'chain-mismatch-detected');
  const dupDiff = M.makeEvent('W1', 0, null, { rid: 'r', op: 'set', f: { a: 99 }, parents: [], hlc: [1, 0], ts: '', tsrc: 'local', by: 'u' });
  const mm = M.materialize(evs.concat([dupDiff]));
  ok(mm.violations.some((v) => v.why === 'dup-diff'), 'dup-diff-flagged');
  const orphan = M.makeEvent('Z1', 0, null, { rid: 'r', op: 'set', f: { a: 1 }, parents: ['nope:0'], hlc: [1, 0], ts: '', tsrc: 'local', by: 'u' });
  const mo = M.materialize(evs.concat([orphan]));
  ok(mo.pending.length === 1 && mo.pending[0] === 'Z1:0', 'missing-parent-pending');
  const protoEv = M.makeEvent('P1', 0, null, { rid: 'r', op: 'set', f: JSON.parse('{"__proto__":1}'), parents: [], hlc: [1, 0], ts: '', tsrc: 'local', by: 'u' });
  ok(M.materialize([protoEv]).violations.some((v) => v.why === 'field') && ({}).polluted === undefined, 'proto-field-rejected');
  const crossRid = M.makeEvent('X1', 0, null, { rid: 'q', op: 'set', f: { a: 1 }, parents: [evs[0].id], hlc: [1, 0], ts: '', tsrc: 'local', by: 'u' });
  ok(M.materialize(evs.concat([crossRid])).pending.includes('X1:0'), 'cross-rid-parent-pending');
}

// T7b 遅れ検知と純JS SHA-256
{
  const A = new M.Writer('L1', 'u');
  const e1 = A.emit(new Set(), 'r', 'set', { a: 1 }, T0, 'local', '');
  ok(M.lagMs(T0 - 3600000, [e1], 300000) === 3600000, 'lag-detected');
  ok(M.lagMs(T0 - 299000, [e1], 300000) === 0, 'lag-within-tolerance');
  ok(M.lagMs(T0 + 3600000, [e1], 300000) === 0, 'forward-not-detectable');
  const { sha256Hex } = require('./sha256.js');
  const nodeSha = M.sha;
  const vec = { '': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'abc': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq': '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' };
  for (const k of Object.keys(vec)) ok(sha256Hex(k) === vec[k], 'sha-vector:' + k.slice(0, 6));
  const r = rng(99); let same = true;
  for (let i = 0; i < 300; i++) { let s = ''; const n = Math.floor(r() * 300); for (let j = 0; j < n; j++) s += String.fromCharCode(r() < 0.2 ? 0x3040 + Math.floor(r() * 90) : 32 + Math.floor(r() * 90)); if (sha256Hex(s) !== nodeSha(s)) same = false; }
  ok(same, 'sha-random-vs-node');
  ok(sha256Hex('a'.repeat(1000000)) === 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0', 'sha-million-a');
}

// T8 性能(参照実装の目安): 20,000イベント
{
  const ev = sim(7, { writers: 8, steps: 3000, records: 60, maxDeliver: 2 });
  const t = Date.now(); const m = M.materialize(ev); const dt = Date.now() - t;
  console.log('perf: events=' + ev.length + ' ms=' + dt + ' conflicts=' + Object.values(m.state).reduce((s, r) => s + Object.keys(r.conflicts).length, 0));
}

console.log('pass=' + pass + ' fail=' + fail.length);
if (fail.length) { console.log(fail.slice(0, 20).join('\n')); process.exit(1); }
