/* VOSTD verification roadmap — single-lane board layout and edge routing (no DOM).
 *
 * The board shows ONE lane (see PlanModel.view). From top to bottom:
 *   1. "up" band   compact stubs for other-lane work this lane depends on
 *                  (only the ones directly connected; never the other lane's graph)
 *   2. stage bands the lane's own work, stage = longest chain inside the lane; work in
 *                  one stage has no dependency between it and can run in parallel; a
 *                  roll-up sign-off (V.rollups) gets its own last band and no edges
 *   3. "down" band compact stubs for other-lane work that depends on this lane
 * The same other-lane item can appear in both bands (it needs this lane's work and is
 * needed by it); the two stubs have different keys ("u:ID" / "d:ID").
 *
 * Geometry. Cards sit on a slot grid (k columns; a band with more items than slots
 * wraps to more rows). k adapts to the width, so the board never scrolls sideways. The
 * grid leaves horizontal channels in the gaps between rows and vertical channels in the
 * gaps between slots and at the sides; edges are routed only through those channels (or
 * straight down an empty slot column), so an edge never crosses a card.
 *
 * Slot choice. Each band is ordered by the mean x of its neighbours (alternating
 * top-down / bottom-up sweeps) with a monotone assignment that minimises distance.
 *
 * Routing. Edge S → T (S above T) leaves S's bottom and enters T's top:
 *   next row ........ down, along the gap channel, down
 *   T's slot column free ..... along S's gap channel, then straight down into T
 *   S's slot column free ..... straight down from S, along T's gap channel, down
 *   otherwise ........ along S's gap channel to a vertical channel, down it, along
 *                      T's gap channel, down.
 * Segments that share a channel get separate parallel tracks (first-fit on the span).
 */
"use strict";
(function (root) {
  const DEF = {
    width: 1840, railW: 104, lanePad: 18, slotGap: 18, minSlots: 4,
    minCardW: 170, maxCardW: 236, cardH: 108, ghostH: 80,
    rowGap: 36, bandGap: 18, topPad: 14, bottomPad: 14,
    trackStep: 4.5, sweeps: 5, radius: 6, arrow: 7,
  };

  function layout(M, V, opts) {
    const o = Object.assign({}, DEF, opts);

    /* ------------------------------------------------------------ items, bands */
    const order = {};
    M.nodes.forEach((n, i) => { order[n.id] = i; });
    const bands = [];
    if (V.upIds.length) bands.push({ type: "up", keys: V.upIds.map((id) => "u:" + id) });
    const graphStages = V.nGraphStages ?? V.nStages;
    for (let s = 0; s < graphStages; s++) bands.push({ type: "stage", stage: s, keys: V.nodes.filter((n) => V.stage[n.id] === s && !V.rollups?.includes(n)).map((n) => n.id) });
    if (V.rollups?.length) bands.push({ type: "rollup", stage: graphStages, keys: V.rollups.map((n) => n.id) });
    if (V.downIds.length) bands.push({ type: "down", keys: V.downIds.map((id) => "d:" + id) });
    const item = {};   // key → { id, kind, band }
    bands.forEach((b, bi) => b.keys.forEach((k) => {
      const kind = b.type === "stage" || b.type === "rollup" ? "node" : b.type;
      item[k] = { key: k, id: kind === "node" ? k : k.slice(2), kind, band: bi };
    }));
    const ord = (k) => order[item[k].id];

    const lpred = {}, lsucc = {}, ledges = [];
    for (const k of Object.keys(item)) { lpred[k] = []; lsucc[k] = []; }
    const link = (from, to, e) => { lsucc[from].push(to); lpred[to].push(from); ledges.push({ from, to, e }); };
    for (const e of V.edges) link(e.a, e.b, e);
    for (const e of V.extIn) link("u:" + e.a, e.b, e);
    for (const e of V.extOut) link(e.a, "d:" + e.b, e);

    /* ------------------------------------------------------------ slot geometry */
    const gap = o.slotGap;
    const innerMax = Math.max(0, o.width - o.railW - 2 * o.lanePad);
    const kMax = Math.max(3, Math.floor((innerMax + gap) / (o.minCardW + gap)));
    const maxGroup = Math.max(1, ...bands.map((b) => b.keys.length));
    const k = Math.min(kMax, Math.max(o.minSlots, maxGroup));
    const cardW = Math.max(110, Math.min(o.maxCardW, Math.floor((innerMax - (k - 1) * gap) / k)));
    const innerW = k * cardW + (k - 1) * gap;
    const blockW = innerW + 2 * o.lanePad;
    const x0 = o.railW + o.lanePad;   // left edge of slot 0: the block hugs the stage labels
    const width = Math.max(o.width, x0 + innerW + o.lanePad);
    const slotX = (j) => x0 + j * (cardW + gap);
    const slotCx = (j) => slotX(j) + cardW / 2;

    /* ------------------------------------------------------------ slot assignment */
    const cx = {}, slot = {}, rowIn = {};
    for (const b of bands) {
      const per = Math.min(b.keys.length, k);
      b.keys.forEach((key, i) => { cx[key] = x0 + ((i % per) + 0.5) * (innerW / per); });
    }
    function assignSlots(ds) {
      const m = ds.length, INF = 1e18;
      const f = Array.from({ length: m }, () => new Array(k).fill(INF));
      const from = Array.from({ length: m }, () => new Array(k).fill(-1));
      for (let i = 0; i < m; i++) {
        let best = INF, bj = -1;
        for (let j = 0; j < k; j++) {
          const c = Math.abs(slotCx(j) - ds[i]);
          if (i === 0) f[i][j] = c;
          else {
            if (j > 0 && f[i - 1][j - 1] < best) { best = f[i - 1][j - 1]; bj = j - 1; }
            if (best < INF) { f[i][j] = best + c; from[i][j] = bj; }
          }
        }
      }
      let j = 0, bestEnd = INF;
      for (let jj = 0; jj < k; jj++) if (f[m - 1][jj] < bestEnd) { bestEnd = f[m - 1][jj]; j = jj; }
      const out = new Array(m);
      for (let i = m - 1; i >= 0; i--) { out[i] = j; j = from[i][j]; }
      return out;
    }
    function place(keys, des) {
      const rows = Math.ceil(keys.length / k), per = Math.ceil(keys.length / rows);
      const sorted = keys.slice().sort((a, b) => des[a] - des[b] || ord(a) - ord(b));
      for (let r = 0; r < rows; r++) {
        const chunk = sorted.slice(r * per, (r + 1) * per);
        const js = assignSlots(chunk.map((key) => des[key]));
        chunk.forEach((key, i) => { slot[key] = js[i]; rowIn[key] = r; cx[key] = slotCx(js[i]); });
      }
    }
    const clamp = (v) => Math.max(x0 + cardW / 2, Math.min(x0 + innerW - cardW / 2, v));
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    for (let pass = 0; pass < o.sweeps; pass++) {
      const down = pass % 2 === 0;
      const idx = bands.map((_, i) => i);
      if (!down) idx.reverse();
      for (const bi of idx) {
        const keys = bands[bi].keys;
        if (!keys.length) continue;
        const des = {};
        for (const key of keys) {
          const nb = (down ? lpred[key] : lsucc[key]).map((n) => cx[n]);
          des[key] = nb.length ? clamp(mean(nb)) : cx[key];
        }
        place(keys, des);
      }
    }

    /* ------------------------------------------------------------ rows */
    const bandRows = bands.map((b) => Math.max(1, Math.ceil(b.keys.length / k)));
    const bandFirst = [];
    let nRows = 0;
    bands.forEach((_, bi) => { bandFirst[bi] = nRows; nRows += bandRows[bi]; });
    const rowTop = [], rowH = [], gapSize = [];
    let y = o.topPad;
    bands.forEach((b, bi) => {
      for (let r = 0; r < bandRows[bi]; r++) {
        const g = bandFirst[bi] + r;
        rowTop[g] = y;
        rowH[g] = b.type === "stage" || b.type === "rollup" ? o.cardH : o.ghostH;
        y += rowH[g];
        if (g < nRows - 1) {
          gapSize[g] = o.rowGap + (r === bandRows[bi] - 1 ? o.bandGap : 0);
          y += gapSize[g];
        }
      }
    });
    const height = y + o.bottomPad;
    const gapCenter = (g) => rowTop[g] + rowH[g] + gapSize[g] / 2;
    const bandBoxes = bands.map((b, bi) => {
      const last = bandFirst[bi] + bandRows[bi] - 1;
      return {
        type: b.type, stage: b.stage, rows: bandRows[bi], firstRow: bandFirst[bi], count: b.keys.length,
        top: bi === 0 ? 0 : gapCenter(bandFirst[bi] - 1),
        bottom: bi === bands.length - 1 ? height : gapCenter(last),
      };
    });

    const cards = {};
    for (const b of bands) {
      for (const key of b.keys) {
        const row = bandFirst[item[key].band] + rowIn[key];
        cards[key] = { key, id: item[key].id, kind: item[key].kind, stage: bands[item[key].band].stage, slot: slot[key], row,
          x: slotX(slot[key]), y: rowTop[row], w: cardW, h: rowH[row], cx: slotCx(slot[key]) };
      }
    }

    /* ------------------------------------------------------------ routing */
    const occ = new Set(Object.values(cards).map((c) => `${c.slot}|${c.row}`));
    const colBlocked = (j, r1, r2) => {
      for (let r = r1 + 1; r < r2; r++) if (occ.has(`${j}|${r}`)) return true;
      return false;
    };
    const vch = [{ id: "L", x: x0 - o.lanePad / 2, cap: o.lanePad - 5 }];
    for (let j = 0; j < k - 1; j++) vch.push({ id: String(j), x: slotX(j) + cardW + gap / 2, cap: gap - 4 });
    vch.push({ id: "R", x: x0 + innerW + o.lanePad / 2, cap: o.lanePad - 5 });

    const outs = {}, ins = {};
    for (const le of ledges) { (outs[le.from] ??= []).push(le); (ins[le.to] ??= []).push(le); }
    const portOut = new Map(), portIn = new Map();
    const spread = (list, keyFn, into) => {
      const m = list.length;
      const step = m > 1 ? Math.min(11, (cardW - 34) / (m - 1)) : 0;
      list.slice().sort(keyFn).forEach((le, i) => into.set(le, (i - (m - 1) / 2) * step));
    };
    for (const key of Object.keys(outs)) spread(outs[key], (p, q) => cards[p.to].cx - cards[q.to].cx || cards[p.to].row - cards[q.to].row, portOut);
    for (const key of Object.keys(ins)) spread(ins[key], (p, q) => cards[p.from].cx - cards[q.from].cx || cards[p.from].row - cards[q.from].row, portIn);

    const routes = ledges.map((le) => {
      const a = cards[le.from], b = cards[le.to];
      const r = { le, a, b, rs: a.row, rt: b.row, xs: a.cx + portOut.get(le), xt: b.cx + portIn.get(le) };
      if (r.rt <= r.rs) throw new Error(`edge ${le.from} → ${le.to} does not point to a later row`);
      if (r.rt === r.rs + 1) r.strat = "gap";
      else if (!colBlocked(b.slot, r.rs, r.rt)) r.strat = "col-t";
      else if (!colBlocked(a.slot, r.rs, r.rt)) r.strat = "col-s";
      else {
        r.strat = "gutter";
        let best = null, bestScore = Infinity;
        for (const c of vch) {
          const score = Math.abs(r.xs - c.x) + Math.abs(c.x - r.xt);
          if (score < bestScore) { bestScore = score; best = c; }
        }
        r.ch = best;
      }
      return r;
    });

    const colour = (segs, pad) => {
      segs.sort((p, q) => p.lo - q.lo || p.hi - q.hi);
      const ends = [];
      for (const s of segs) {
        let t = ends.findIndex((en) => en + pad <= s.lo);
        if (t < 0) { t = ends.length; ends.push(-Infinity); }
        ends[t] = s.hi;
        s.track = t;
      }
      for (const s of segs) s.n = ends.length;
      return ends.length;
    };
    const hSegs = {}, vSegs = {};
    const addH = (r, key, g, x1, x2) => {
      const seg = { lo: Math.min(x1, x2), hi: Math.max(x1, x2), g };
      if (seg.hi - seg.lo < 0.5) { r[key] = null; return; }
      (hSegs[g] ??= []).push(seg);
      r[key] = seg;
    };
    for (const r of routes) {
      if (r.strat === "gap" || r.strat === "col-t") addH(r, "h1", r.rs, r.xs, r.xt);
      else if (r.strat === "col-s") addH(r, "h2", r.rt - 1, r.xs, r.xt);
      else {
        addH(r, "h1", r.rs, r.xs, r.ch.x);
        addH(r, "h2", r.rt - 1, r.ch.x, r.xt);
        const v = { lo: r.rs, hi: r.rt - 1 };
        (vSegs[r.ch.id] ??= []).push(v);
        r.v = v;
      }
    }
    let maxH = 0, maxV = 0;
    for (const g of Object.keys(hSegs)) maxH = Math.max(maxH, colour(hSegs[g], 8));
    for (const id of Object.keys(vSegs)) maxV = Math.max(maxV, colour(vSegs[id], 1));
    const hOff = (seg) => {
      const cap = Math.max(6, gapSize[seg.g] - 12);
      const step = seg.n > 1 ? Math.min(o.trackStep, cap / (seg.n - 1)) : 0;
      return gapCenter(seg.g) + (seg.track - (seg.n - 1) / 2) * step;
    };
    const vOff = (seg, ch) => {
      const step = seg.n > 1 ? Math.min(o.trackStep, ch.cap / (seg.n - 1)) : 0;
      return ch.x + (seg.track - (seg.n - 1) / 2) * step;
    };

    const out = routes.map((r) => {
      const top = [r.xs, r.a.y + r.a.h];
      const end = [r.xt, r.b.y];
      let mid;
      if (r.strat === "gap" || r.strat === "col-t") {
        const yA = r.h1 ? hOff(r.h1) : gapCenter(r.rs);
        mid = [[r.xs, yA], [r.xt, yA]];
      } else if (r.strat === "col-s") {
        const yB = r.h2 ? hOff(r.h2) : gapCenter(r.rt - 1);
        mid = [[r.xs, yB], [r.xt, yB]];
      } else {
        const yA = r.h1 ? hOff(r.h1) : gapCenter(r.rs);
        const yB = r.h2 ? hOff(r.h2) : gapCenter(r.rt - 1);
        const xv = vOff(r.v, r.ch);
        mid = [[r.xs, yA], [xv, yA], [xv, yB], [r.xt, yB]];
      }
      const pts = dedupe([top, ...mid, [end[0], end[1] - o.arrow]]);
      const e = r.le.e;
      return { a: e.a, b: e.b, from: r.le.from, to: r.le.to, kind: e.kind, gate: e.gate, tag: e.tag, need: e.need, ev: e.ev, missing: e.missing, cross: e.cross, strat: r.strat, pts, tip: end, d: roundedPath(pts, o.radius) };
    });

    const stageBands = bandBoxes.filter((b) => b.type === "stage" || b.type === "rollup");
    const panel = { x: x0 - o.lanePad, w: blockW, top: stageBands[0].top, bottom: stageBands[stageBands.length - 1].bottom };
    return {
      width, height, cardW, cardH: o.cardH, slots: k, x0, innerW, panel, bands: bandBoxes, cards, routes: out, opts: o,
      stats: { maxHTracks: maxH, maxVTracks: maxV, strategies: countBy(out, (r) => r.strat) },
    };
  }

  function countBy(arr, f) {
    const m = {};
    for (const v of arr) { const kk = f(v); m[kk] = (m[kk] || 0) + 1; }
    return m;
  }
  /* drop repeated and collinear points */
  function dedupe(p) {
    const q = [p[0]];
    for (let i = 1; i < p.length; i++) {
      const a = q[q.length - 1], b = p[i];
      if (Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01) continue;
      q.push(b);
    }
    const r = [q[0]];
    for (let i = 1; i < q.length - 1; i++) {
      const a = r[r.length - 1], b = q[i], c = q[i + 1];
      const colX = Math.abs(a[0] - b[0]) < 0.01 && Math.abs(b[0] - c[0]) < 0.01;
      const colY = Math.abs(a[1] - b[1]) < 0.01 && Math.abs(b[1] - c[1]) < 0.01;
      if (!colX && !colY) r.push(b);
    }
    r.push(q[q.length - 1]);
    return r;
  }
  const f1 = (v) => Math.round(v * 10) / 10;
  function roundedPath(p, rad) {
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [px, py] = p[i - 1], [qx, qy] = p[i], [nx, ny] = p[i + 1];
      const l1 = Math.hypot(qx - px, qy - py), l2 = Math.hypot(nx - qx, ny - qy);
      const rr = Math.min(rad, l1 / 2, l2 / 2);
      d += ` L${f1(qx + ((px - qx) / l1) * rr)} ${f1(qy + ((py - qy) / l1) * rr)}`;
      d += ` Q${f1(qx)} ${f1(qy)} ${f1(qx + ((nx - qx) / l2) * rr)} ${f1(qy + ((ny - qy) / l2) * rr)}`;
    }
    const last = p[p.length - 1];
    return d + ` L${f1(last[0])} ${f1(last[1])}`;
  }

  root.PlanLayout = { layout };
})(typeof window !== "undefined" ? window : globalThis);
