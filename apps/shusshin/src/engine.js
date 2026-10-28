/* 出身地推定エンジン（ページ・テスト共通）。外部依存なし。
 * 判定: ナイーブベイズ。各問の回答確率 M[q][県][選択肢] は
 *   M = (n0 × P' + みんなの回答数) / (n0 + 回答総数)、P' = 1/n + (P − 1/n) × TRUST
 * 各回答の尤度には「押し間違い・転居など」の余地 LAPSE を混ぜる: (1−LAPSE)·M + LAPSE/n
 */
(function (root) {
  'use strict';
  const C = ({
    TRUST: 0.9,        // 統計から作った回答率をどこまで信じるか（1＝そのまま）
    LAPSE: 0.03,       // 1回答ごとの「想定外の答え」の確率（押し間違い・転居・家庭の事情）
    MAYBE_W: 0.5,      // 「たぶん」の重み
    POP_POW: 0.8,      // 事前確率＝人口^POP_POW（1＝人口どおり）
    PLAYS_W: 1,        // 遊んだ人の出身県の分布を事前確率に足す重み（人数あたり）
    PRIOR_PLAYS: 2000, // 人口分布を何人分として扱うか
    MIN_Q: 8,          // これより前には当てない
    MAX_Q: 35,         // 最大の質問数（「わからない」を含まない）
    STOP_P: 0.95,      // 1位の確率がこれ以上で終了
    PICK_SLACK: 0.85,  // 情報量が最大の何割以上を候補にする
    PICK_POW: 4,       // 候補内の選びやすさ（情報量^POW）
    EARLY_N: 3,        // 最初の何問は地域を広く分ける問題（多肢選択・気候・暮らし）を優先
    COMBO: 4,          // 郷土料理をまとめて聞く問題の料理数（候補の県から1品ずつ）
    COMBO_TOP: 8,      // まとめ問題の料理を選ぶ候補県の数
    SEKI_LO: 0.38, SEKI_HI: 0.62, // 東日本の確率がこの間なら「境界の人」
    EAST_LAST: 22,     // 0〜22（北海道〜愛知）を東日本として数える
  });
  const N = 47;
  function create(QS, META, crowd) {
    const pop = META.pop, popSum = pop.reduce((a, b) => a + b, 0);
    const popShare = pop.map(x => x / popSum);
    const qIndex = new Map(QS.map((q, i) => [q.id, i]));
    let M = [], PRIOR = [];
    function rebuild(cr) {
      crowd = cr || crowd || null;
      M = QS.map((q, qi) => {
        const n = q.o.length, arr = new Float64Array(N * n), cnt = crowd && crowd.q && crowd.q[q.id];
        for (let k = 0; k < N; k++) {
          let tot = 0; const c = [];
          for (let j = 0; j < n; j++) { const v = cnt ? (cnt[k * n + j] || 0) : 0; c.push(v); tot += v; }
          let ps = 0; for (let j = 0; j < n; j++) ps += q.p[k][j];   // 保存時の丸め誤差を正規化
          for (let j = 0; j < n; j++) {
            const p0 = 1 / n + (q.p[k][j] / ps - 1 / n) * C.TRUST;
            arr[k * n + j] = (q.n0 * p0 + c[j]) / (q.n0 + tot);
          }
        }
        return arr;
      });
      const base = pop.map(x => Math.pow(x, C.POP_POW)), bs = base.reduce((a, b) => a + b, 0);
      const pr = base.map((x, k) => C.PRIOR_PLAYS * x / bs + C.PLAYS_W * ((crowd && crowd.n && crowd.n[k]) || 0));
      const ps = pr.reduce((a, b) => a + b, 0); PRIOR = pr.map(x => x / ps);
    }
    rebuild(crowd);
    const like = (qi, k, j) => { const n = QS[qi].o.length; return (1 - C.LAPSE) * M[qi][k * n + j] + C.LAPSE / n; };
    // まとめ問題（料理を複数並べ、身近なものを1つ選ぶ）の尤度。各料理を知っているかは独立とし、知っている中から1つを等確率で選ぶ
    function likeCombo(comp, k, j) {
      const m = comp.length, p = comp.map(qi => like(qi, k, 0));
      if (j === m) { let r = 1; for (const x of p) r *= 1 - x; return (1 - C.LAPSE) * r + C.LAPSE / (m + 1); }
      let tot = 0;
      for (let mask = 1; mask < (1 << m); mask++) {
        if (!(mask & (1 << j))) continue;
        let pr = 1, sz = 0;
        for (let l = 0; l < m; l++) { if (mask & (1 << l)) { pr *= p[l]; sz++; } else pr *= 1 - p[l]; }
        tot += pr / sz;
      }
      return (1 - C.LAPSE) * tot + C.LAPSE / (m + 1);
    }
    const likeAns = (a, k) => a.comp ? likeCombo(a.comp, k, a.j) : like(a.qi, k, a.j);
    function posterior(ans, prior) {
      const lp = (prior || PRIOR).map(Math.log);
      for (const a of ans) { const w = a.w == null ? 1 : a.w; for (let k = 0; k < N; k++) lp[k] += w * Math.log(likeAns(a, k)); }
      const mx = Math.max(...lp), e = lp.map(v => Math.exp(v - mx)), s = e.reduce((a, b) => a + b, 0);
      return e.map(v => v / s);
    }
    const H = v => { let h = 0; for (const x of v) if (x > 1e-12) h -= x * Math.log(x); return h; };
    function blocked(used) {
      const g = new Set(); for (const qi of used) for (const t of QS[qi].g) g.add(t); return g;
    }
    function gain(qi, post) {
      const n = QS[qi].o.length; let h = 0; const H0 = H(post);
      for (let j = 0; j < n; j++) {
        let pj = 0; for (let k = 0; k < N; k++) pj += post[k] * like(qi, k, j);
        if (pj < 1e-12) continue;
        let hj = 0; for (let k = 0; k < N; k++) { const x = post[k] * like(qi, k, j) / pj; if (x > 1e-12) hj -= x * Math.log(x); }
        h += pj * hj;
      }
      return H0 - h;
    }
    function gainCombo(comp, post) {
      const m = comp.length; let h = 0; const H0 = H(post);
      for (let j = 0; j <= m; j++) {
        const lk = post.map((p, k) => p * likeCombo(comp, k, j)); const pj = lk.reduce((a, b) => a + b, 0);
        if (pj < 1e-12) continue;
        let hj = 0; for (const v of lk) { const x = v / pj; if (x > 1e-12) hj -= x * Math.log(x); }
        h += pj * hj;
      }
      return H0 - h;
    }
    const EARLY_BASIS = new Set(['KM', 'W', 'G', 'F', 'S']);
    function pickNext(st, rnd) {
      rnd = rnd || Math.random;
      const used = new Set([...st.ans.flatMap(a => a.comp ? a.comp : [a.qi]), ...st.skipped.flatMap(x => x && x.comp ? x.comp : [x])]);
      const bl = blocked(used);
      const collect = early => {
        const out = [];
        QS.forEach((q, qi) => {
          if (used.has(qi) || (st.off && st.off.has(q.id))) return;
          if (q.g.some(t => bl.has(t))) return;
          if (early && !EARLY_BASIS.has(q.basis)) return;
          out.push([qi, Math.max(1e-9, gain(qi, st.post))]);
        });
        return out;
      };
      let cands = st.ans.length < C.EARLY_N ? collect(true) : [];
      const early = cands.length > 0;
      if (!cands.length) cands = collect(false);
      if (!cands.length) return -1;
      const best = Math.max(...cands.map(c => c[1]));
      const pool = cands.filter(c => c[1] >= best * C.PICK_SLACK), w = pool.map(c => Math.pow(c[1], C.PICK_POW));
      let r = rnd() * w.reduce((a, b) => a + b, 0), pick = pool[pool.length - 1][0];
      for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i][0]; break; } }
      // 郷土料理のまとめ問題：候補県ごとに、その県の料理で一番役に立つものを1品ずつ選んで並べる
      if (!early && C.COMBO > 1) {
        const byGain = new Map(cands.map(c => [c[0], c[1]]));
        const topK = top(st.post, C.COMBO_TOP).map(x => x[1]), chosen = [], usedG = new Set();
        for (const k of topK) {
          let bq = -1, bg = -1;
          for (const [qi, g] of byGain) {
            const q = QS[qi]; if (q.basis !== 'E' || !q.data || !q.data.listed.includes(k)) continue;
            if (q.data.listed.some(x => usedG.has(x))) continue;
            if (g > bg) { bg = g; bq = qi; }
          }
          if (bq >= 0) { chosen.push(bq); QS[bq].data.listed.forEach(x => usedG.add(x)); }
          if (chosen.length >= C.COMBO) break;
        }
        if (chosen.length >= 2) {
          const gc = gainCombo(chosen, st.post);
          if (gc > best) return { comp: chosen };
        }
      }
      return pick;
    }
    function newState() { return { ans: [], skipped: [], post: PRIOR.slice(), off: null }; }
    function answer(st, qi, j, maybe) {
      if (qi && qi.comp) st.ans.push({ qi: -1, comp: qi.comp.slice(), j, w: maybe ? C.MAYBE_W : 1 });
      else st.ans.push({ qi, j, w: maybe ? C.MAYBE_W : 1 });
      st.post = posterior(st.ans); return st;
    }
    function skip(st, qi) { st.skipped.push(qi && qi.comp ? { comp: qi.comp.slice() } : qi); return st; }
    function top(post, n) { return post.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]).slice(0, n || 5); }
    function shouldStop(st) {
      const n = st.ans.length, mx = Math.max(...st.post);
      if (n >= C.MAX_Q) return true;
      return n >= C.MIN_Q && mx >= C.STOP_P;
    }
    function eastShare(post) { let s = 0; for (let k = 0; k <= C.EAST_LAST; k++) s += post[k]; return s; }
    function regionShare(post) { const r = new Array(META.regions.length).fill(0); post.forEach((p, k) => r[META.region[k]] += p); return r; }
    // この答えの組み合わせは日本で何人に1人か（人口で重みづけ）
    function oddsOf(ans) {
      let tot = 0;
      for (let k = 0; k < N; k++) { let lp = Math.log(popShare[k]); for (const a of ans) lp += (a.w == null ? 1 : a.w) * Math.log(likeAns(a, k)); tot += Math.exp(lp); }
      return 1 / tot;
    }
    // 各回答が「予想した県」と「2位の県」のどちらをどれだけ支持したか（対数尤度比）
    function explain(ans, a, b) {
      return ans.map(x => ({ qi: x.qi, comp: x.comp, j: x.j, w: x.w, llr: (x.w == null ? 1 : x.w) * (Math.log(likeAns(x, a)) - Math.log(likeAns(x, b))) }));
    }
    // 1つの回答で確率が大きく動いた県
    function movers(prev, post, n) {
      const d = post.map((p, k) => [p - prev[k], k]).sort((x, y) => y[0] - x[0]);
      return { up: d.slice(0, n || 3).filter(x => x[0] > 0.001), down: d.slice(-(n || 3)).reverse().filter(x => x[0] < -0.001) };
    }
    return { C, N, QS, META, qIndex, rebuild, posterior, pickNext, newState, answer, skip, top, shouldStop, eastShare, regionShare, oddsOf, explain, movers, gain,
      get M() { return M; }, get PRIOR() { return PRIOR; }, like, likeCombo, likeAns };
  }
  root.ShusshinEngine = { create, C };
  if (typeof module !== 'undefined') module.exports = { create, C };
})(typeof window !== 'undefined' ? window : globalThis);
