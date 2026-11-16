/* VOSTD verification roadmap — graph model (no DOM).
 *
 * Turns window.PLAN into the dependency graph the page draws: edges with their
 * provenance (documented / inferred), stages, plan status per work item, and what
 * finishing an item unlocks. Pure functions, so the same file runs in the page and
 * in a Node check (see build() → issues).
 *
 * Stage = length of the longest prerequisite chain, so every edge points to a later
 * stage and items in one stage have no dependency between them: they can proceed in
 * parallel. M.stage counts every edge; view(lane).stage counts only the edges inside
 * one lane (what the page shows).
 *
 * Every prerequisite edge must be explained in node.deps[<prereq id>]:
 *   needs    confirmed: the interface it consumes (`need`) and where that was checked (`ev`).
 *            deps.gate = "start" (default): the consumer cannot even state its proof without it.
 *            deps.gate = "accept": the consumer may start local proofs by stating the prerequisite
 *            as a `requires`; only its final acceptance needs the prerequisite proved. It still
 *            blocks final acceptance, not starting local work (M.localOk).
 *   needsInf not confirmed ("推断" / "待确认"): `missing` says which evidence is absent. Never
 *            counted as a blocker.
 *
 * Plan status combines curated PLAN.nodes and the independent PR snapshot:
 *   done     node.done is set explicitly (merged PRs, CI and LOC never imply it)
 *   active   at least one open PR in node.prs
 *   ready    no open PR, every confirmed prerequisite is explicitly accepted
 *   waiting  no open PR, only acceptance-gating prerequisites remain unaccepted
 *   blocked  no open PR, at least one start-gating prerequisite is not done
 * Unmet unconfirmed prerequisites are reported separately (M.waits).
 *
 * A node with `rollup: true` is a final sign-off whose prerequisites are a delivery checklist,
 * not interfaces it consumes. Its edges still count for its own status and appear in its
 * details, but they are not drawn (view().edges/extIn/extOut skip them), it is laid out in its
 * own last band (view().rollups), and it never counts as something a prerequisite "unlocks".
 */
"use strict";
(function (root) {
  const STATES = ["ready", "waiting", "active", "blocked", "done"];
  const GATES = ["start", "accept"];
  const TAGS = ["推断", "待确认"];

  function build(P, snapshot = root.PLAN_PR_SNAPSHOT, catalog = root.PLAN_PR_CATALOG || []) {
    const issues = [...(P.assembleIssues || [])];   // problems found while merging the data files
    const nodes = P.nodes;
    const byId = {};
    for (const n of nodes) {
      if (byId[n.id]) issues.push(`duplicate node id ${n.id}`);
      byId[n.id] = n;
    }
    const laneKeys = P.lanes.map((l) => l.key);
    const current = new Map((snapshot?.prs || []).map((p) => [p.n, p]));
    const prMap = new Map(catalog.map((p) => [p.n, { ...p, kind: "unknown", review: "未知", gate: "UNKNOWN", ci: "未知", ...(current.get(p.n) || {}) }]));
    for (const [n, p] of current) if (!prMap.has(n)) prMap.set(n, { scope: p.title || "", ...p });
    for (const p of prMap.values()) p.needsReview = !!(p.head && p.reviewedHead !== p.head);

    /* ---- data validation (surfaced on the page when non-empty) ---- */
    for (const n of nodes) {
      if (!laneKeys.includes(n.lane)) issues.push(`${n.id}: lane "${n.lane}" is not one of ${laneKeys.join("/")}`);
      for (const d of [...n.needs, ...n.needsInf]) {
        if (!byId[d]) issues.push(`${n.id}: unknown prerequisite ${d}`);
        if (d === n.id) issues.push(`${n.id}: depends on itself`);
      }
      for (const x of n.prs) {
        const p = prMap.get(x);
        if (!p) issues.push(`${n.id}: unknown PR #${x}`);
        // A relationship may remain after merge or closure as historical evidence;
        // only an open record contributes to the active plan status below.
      }
      for (const x of n.reuse) if (!prMap.has(x)) issues.push(`${n.id}: unknown reuse PR #${x}`);
      const deps = n.deps || {};
      for (const d of Object.keys(deps)) if (![...n.needs, ...n.needsInf].includes(d)) issues.push(`${n.id}: deps entry ${d} is not a prerequisite`);
      for (const d of n.needs) {
        const x = deps[d];
        if (!x || !x.need || !x.ev) issues.push(`${n.id}: confirmed prerequisite ${d} needs deps.need and deps.ev`);
        else if (x.gate !== undefined && !GATES.includes(x.gate)) issues.push(`${n.id}: prerequisite ${d} has unknown gate ${x.gate}`);
      }
      for (const d of n.needsInf) {
        const x = deps[d];
        if (!x || !x.missing) issues.push(`${n.id}: unconfirmed prerequisite ${d} needs deps.missing (what evidence is absent)`);
        else if (x.tag !== undefined && !TAGS.includes(x.tag)) issues.push(`${n.id}: prerequisite ${d} has unknown tag ${x.tag}`);
      }
      if (n.rollup && !n.needs.length) issues.push(`${n.id}: rollup node has no checklist (needs is empty)`);
    }
    const roll = new Set(nodes.filter((n) => n.rollup).map((n) => n.id));
    for (const n of nodes) for (const d of [...n.needs, ...n.needsInf]) if (roll.has(d)) issues.push(`${n.id}: depends on rollup node ${d}; a sign-off cannot be a prerequisite`);

    /* ---- edges; an edge listed as both documented and inferred stays documented ---- */
    const edges = [];
    const pred = {}, succ = {};
    for (const n of nodes) { pred[n.id] = []; succ[n.id] = []; }
    const seen = new Set();
    for (const n of nodes) {
      for (const [list, kind] of [[n.needs, "doc"], [n.needsInf, "inf"]]) {
        for (const a of list) {
          if (!byId[a] || a === n.id) continue;
          const key = a + ">" + n.id;
          if (seen.has(key)) { issues.push(`${n.id}: prerequisite ${a} listed twice`); continue; }
          seen.add(key);
          const info = (n.deps && n.deps[a]) || {};
          const gate = kind === "doc" ? info.gate || "start" : "none";
          const e = { a, b: n.id, kind, gate, tag: kind === "inf" ? info.tag || "推断" : "确认",
            need: info.need || "", ev: info.ev || "", missing: info.missing || "", cross: byId[a].lane !== n.lane };
          edges.push(e);
          pred[n.id].push(e);
          succ[a].push(e);
        }
      }
    }

    /* ---- stages (longest chain) + cycle check ---- */
    const stage = {};
    const visiting = new Set();
    const depth = (id) => {
      if (id in stage) return stage[id];
      if (visiting.has(id)) { issues.push(`dependency cycle through ${id}`); return 0; }
      visiting.add(id);
      stage[id] = pred[id].length ? 1 + Math.max(...pred[id].map((e) => depth(e.a))) : 0;
      visiting.delete(id);
      return stage[id];
    };
    nodes.forEach((n) => depth(n.id));
    const nStages = Math.max(0, ...Object.values(stage)) + 1;

    /* ---- status ---- */
    const isDone = (id) => !!byId[id].done;
    const hasOpenPr = (id) => byId[id].prs.some((x) => prMap.get(x)?.kind === "open");
    const openPrs = (id) => byId[id].prs.filter((x) => prMap.get(x)?.kind === "open");
    const prBlockers = (id) => openPrs(id).flatMap((x) => {
      const p = prMap.get(x), reasons = [];
      if (p.review === "需修改") reasons.push("审阅要求修改");
      if (p.gate === "DIRTY") reasons.push("合并冲突");
      if (p.gate === "BLOCKED") reasons.push("合并门禁阻塞");
      if (p.ci === "失败") reasons.push("CI 失败");
      return reasons.map(reason => ({ pr: x, reason }));
    });
    const unmet = (id) => pred[id].filter((e) => !isDone(e.a));
    const isConfirmed = (e) => e.kind === "doc";
    const blockers = (id) => unmet(id).filter(isConfirmed);          // confirmed, any gate
    const startBlockers = (id) => blockers(id).filter((e) => e.gate === "start");
    const acceptanceWaits = (id) => blockers(id).filter((e) => e.gate === "accept");
    const waits = (id) => unmet(id).filter((e) => !isConfirmed(e));  // unconfirmed: shown, never blocking
    /* Blocked only by acceptance-gating prerequisites: local proofs may start with a requires. */
    const localOk = (id) => { const b = blockers(id); return b.length > 0 && b.every((e) => e.gate === "accept"); };
    const stateOf = (id) => {
      if (isDone(id)) return "done";
      if (hasOpenPr(id)) return "active";
      if (startBlockers(id).length) return "blocked";
      return acceptanceWaits(id).length ? "waiting" : "ready";
    };
    const state = {};
    for (const n of nodes) state[n.id] = stateOf(n.id);

    /* What finishing `id` unlocks: its direct successors. `immediate` = the edge is confirmed and
     * `id` is the last unfinished confirmed prerequisite of that consumer. Unconfirmed edges never
     * unlock anything. */
    const succNR = {};                                  // consumers excluding rollup sign-offs
    for (const n of nodes) succNR[n.id] = succ[n.id].filter((e) => !roll.has(e.b));
    const rolledInto = (id) => succ[id].filter((e) => roll.has(e.b)).map((e) => e.b);
    const unlocks = (id) => succNR[id].map((e) => {
      const rest = blockers(e.b).filter((x) => x.a !== id).length;
      return { id: e.b, kind: e.kind, gate: e.gate, tag: e.tag, cross: e.cross, rest,
        accepted: isDone(id), immediate: isConfirmed(e) && !isDone(id) && !isDone(e.b) && rest === 0 };
    });

    const reach = (start, map, key) => {
      const out = new Set();
      const walk = (k) => { for (const e of map[k]) if (!out.has(e[key])) { out.add(e[key]); walk(e[key]); } };
      walk(start);
      return out;
    };

    const emptyCounts = () => ({ total: 0, ...Object.fromEntries(STATES.map(s => [s, 0])), activeWaiting: 0 });
    const counts = { all: emptyCounts() };
    for (const k of laneKeys) counts[k] = emptyCounts();
    for (const n of nodes) {
      for (const c of [counts.all, counts[n.lane]]) {
        if (!c) continue;
        c.total++; c[state[n.id]]++;
        if (state[n.id] === "active" && blockers(n.id).length) c.activeWaiting++;
      }
    }

    /* One lane on its own. The graph is the lane's own nodes and the dependencies between
     * them; stages are the longest chain *inside the lane*. Dependencies that cross into
     * another lane are returned separately (extIn: other-lane work this lane needs;
     * extOut: other-lane work that needs this lane), so the page can show them as markers
     * without pulling the other lane's graph in. Plan status still uses every
     * prerequisite, in or out of the lane. */
    const view = (laneKey) => {
      const vnodes = nodes.filter((n) => n.lane === laneKey);
      const inLane = new Set(vnodes.map((n) => n.id));
      const drawn = (e) => !roll.has(e.b);              // checklist edges into a sign-off are not drawn
      const internal = edges.filter((e) => inLane.has(e.a) && inLane.has(e.b) && drawn(e));
      const extIn = edges.filter((e) => !inLane.has(e.a) && inLane.has(e.b) && drawn(e));
      const extOut = edges.filter((e) => inLane.has(e.a) && !inLane.has(e.b) && drawn(e));
      const rollups = vnodes.filter((n) => roll.has(n.id));
      const vpred = {};
      for (const n of vnodes) vpred[n.id] = [];
      for (const e of internal) vpred[e.b].push(e.a);
      const vstage = {};
      const vdepth = (id) => (id in vstage ? vstage[id] : (vstage[id] = vpred[id].length ? 1 + Math.max(...vpred[id].map(vdepth)) : 0));
      vnodes.filter((n) => !roll.has(n.id)).forEach((n) => vdepth(n.id));
      const nGraphStages = Math.max(0, ...Object.values(vstage)) + 1;
      for (const n of rollups) vstage[n.id] = nGraphStages;   // the sign-off sits in its own band after the graph
      const uniq = (a) => [...new Set(a)];
      return {
        key: laneKey, nodes: vnodes, inLane, edges: internal, extIn, extOut, rollups,
        stage: vstage, nGraphStages, nStages: nGraphStages + (rollups.length ? 1 : 0),
        upIds: uniq(extIn.map((e) => e.a)), downIds: uniq(extOut.map((e) => e.b)),
      };
    };

    return {
      nodes, byId, edges, pred, succ, stage, nStages, state, counts, issues, prMap,
      lanes: P.lanes,
      view,
      unmet, blockers, startBlockers, acceptanceWaits, waits, localOk, unlocks, openPrs, prBlockers,
      isRollup: (id) => roll.has(id), rolledInto,
      consumers: (id) => succNR[id],
      up: (id) => reach(id, pred, "a"),
      down: (id) => reach(id, succNR, "b"),
    };
  }

  root.PlanModel = { build, STATES };
})(typeof window !== "undefined" ? window : globalThis);
