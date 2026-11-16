/* VOSTD verification roadmap — assembles window.PLAN from the data files (no DOM, no I/O).
 *
 * The plan is kept in files that change at different rates and are edited in different ways:
 *   plan-data.js     PLAN_BASE     what the work items are: lanes, content (todo / accept), scope, trusted inputs
 *   plan-edges.js    PLAN_EDGES    dependency table, one row per prerequisite → consumer
 *   plan-accept.js   PLAN_ACCEPT   explicit acceptance records (`done`), one per accepted work item
 *   pr-catalog.js    PLAN_PR_CATALOG   per PR: coverage note, reviewed head, which work items it implements / reuses
 *   plan-history.js  PLAN_HISTORY  append-only change log; its last entry is the plan revision
 *   pr-snapshot.js   (generated)   GitHub facts; never edited by hand
 * This file merges them into the single window.PLAN object the page, the document generator and
 * the checks consume. Problems found while merging (unknown IDs, duplicate edges, …) are returned
 * in PLAN.assembleIssues and surfaced by PlanModel.build().issues.
 */
"use strict";
(function (root) {
  const uniqSorted = (a) => [...new Set(a)].sort((x, y) => x - y);

  function assemble(base, edges, accept, history, catalog) {
    const issues = [];
    const ids = new Set(base.nodes.map((n) => n.id));
    const byTo = {};
    const seen = new Set();
    for (const row of edges) {
      const { to, from, ...dep } = row;
      if (!ids.has(to)) { issues.push(`edges: unknown consumer ${to} (${from} → ${to})`); continue; }
      const key = `${from}>${to}`;
      if (seen.has(key)) { issues.push(`edges: ${from} → ${to} appears twice`); continue; }
      seen.add(key);
      (byTo[to] ??= []).push({ from, dep });
    }
    const prs = {}, reuse = {};
    for (const p of catalog) {
      for (const [list, into] of [[p.implements || [], prs], [p.reuses || [], reuse]]) {
        for (const id of list) {
          if (!ids.has(id)) { issues.push(`PR catalog: #${p.n} lists unknown work item ${id}`); continue; }
          (into[id] ??= []).push(p.n);
        }
      }
    }
    for (const id of Object.keys(accept)) if (!ids.has(id)) issues.push(`acceptance: unknown work item ${id}`);

    const nodes = base.nodes.map((n) => {
      const needs = [], needsInf = [], deps = {};
      for (const { from, dep } of byTo[n.id] || []) {
        (dep.missing ? needsInf : needs).push(from);   // an edge that says what evidence is missing is unconfirmed
        deps[from] = dep;
      }
      const out = { ...n, needs, needsInf, prs: uniqSorted(prs[n.id] || []), reuse: uniqSorted(reuse[n.id] || []), deps };
      const a = accept[n.id];
      if (a) out.done = `${a.date} ${a.evidence}`;
      return out;
    });
    const last = history[history.length - 1];
    if (!last) issues.push("history: no revision recorded");
    return { ...base, revision: last ? last.revision : 0, updatedAt: last ? last.date : "", changes: history, nodes, assembleIssues: issues };
  }

  root.PlanAssemble = { assemble };
  if (root.PLAN_BASE) root.PLAN = assemble(root.PLAN_BASE, root.PLAN_EDGES || [], root.PLAN_ACCEPT || {}, root.PLAN_HISTORY || [], root.PLAN_PR_CATALOG || []);
})(typeof window !== "undefined" ? window : globalThis);
