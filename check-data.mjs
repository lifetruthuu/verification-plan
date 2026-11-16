#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { applyBlocks, renderBlocks, DOC_PATH } from "./plan-doc.mjs";
import { loadWindow } from "./plan-store.mjs";

const { PLAN: plan, PLAN_PR_SNAPSHOT: snapshot, PLAN_PR_CATALOG: catalog, PlanModel, PlanLayout } = await loadWindow();
/* Dependencies, scope and trusted boundaries must be traceable. */
const SHA = /@[0-9a-f]{9,40}/;
const OUT_OF_SCOPE_TEXT = /risc-?v|loongarch/i;   // never shown on the page (decision 2026-11-16)
function validateTraceability(plan, catalog, m) {
  const active = new Set(plan.nodes.map(n => n.id));
  const later = plan.later || [];
  const everyId = [...plan.nodes, ...(plan.outOfScope || []), ...later].map(n => n.id);
  assert.equal(new Set(everyId).size, everyId.length, "IDs cannot be shared by active, later and out-of-scope work");
  for (const n of plan.nodes) {
    assert.ok(!/TODO/.test(JSON.stringify([n.title, n.todo, n.accept])), `${n.id}: unfinished TODO placeholder in title / todo / accept`);
    assert.ok(n.todo.length > 0, `${n.id}: say what to deliver (todo)`);
    assert.ok(typeof n.accept === "string" && n.accept.trim(), `${n.id}: say when it is complete and what stays trusted (accept)`);
  }
  assert.ok(plan.acceptanceRule, "shared acceptance criteria must be explicit");
  for (const e of m.edges) {
    assert.ok(e.need || e.missing, `${e.a} -> ${e.b}: name the interface needed or the evidence missing`);
    if (e.kind === "doc") assert.match(e.ev, SHA, `${e.a} -> ${e.b}: confirmed dependency needs evidence at a fixed commit (…@<sha>)`);
  }
  for (const x of later) {
    assert.ok(x.title && x.why && Array.isArray(x.todo) && x.todo.length && Array.isArray(x.after), `${x.id}: later work needs title, why, todo, after`);
    assert.match(x.ev, SHA, `${x.id}: later work needs evidence at a fixed commit`);
    assert.ok(plan.lanes.some(l => l.key === x.lane), `${x.id}: unknown lane`);
    for (const a of x.after) assert.ok(active.has(a), `${x.id}: after ${a} is not an active work item`);
  }
  const trustedIds = (plan.trusted || []).map(t => t.id);
  assert.equal(new Set(trustedIds).size, trustedIds.length, "duplicate trusted boundary id");
  for (const t of plan.trusted || []) {
    assert.ok(t.provider && t.input && t.record && t.consumers.length, `${t.id}: provider, input, record and consumers are required`);
    for (const c of t.consumers) assert.ok(active.has(c) || later.some(x => x.id === c), `${t.id}: unknown consumer ${c}`);
  }
  for (const c of plan.reviewedCandidates || []) assert.ok(Number.isInteger(c.n) && c.note && c.reviewedAt, "reviewed candidate needs n, note, reviewedAt");
  const edge = (a, b) => m.edges.some(e => e.a === a && e.b === b);
  // History is append-only: a later revision can supersede an earlier edge decision.
  const decisions = new Map();
  for (const c of plan.changes) for (const [key, exists] of [["edgesRemoved", false], ["edgesAdded", true], ["edgesChanged", true]]) {
    for (const x of c[key] || []) {
      assert.ok(x.why, `${key} ${x.a} -> ${x.b} needs a reason`);
      decisions.set(`${x.a}>${x.b}`, { ...x, exists });
    }
  }
  for (const x of decisions.values()) assert.equal(edge(x.a, x.b), x.exists, `latest decision for ${x.a} -> ${x.b} disagrees with graph`);
  // RISC-V / LoongArch work is not part of this plan and must not reach the page.
  const shown = { nodes: plan.nodes, later, trusted: plan.trusted, lanes: plan.lanes, candidates: plan.reviewedCandidates, catalog: catalog.map(({ n, scope, note }) => ({ n, scope, note })) };
  for (const [where, list] of Object.entries(shown)) {
    for (const item of list || []) {
      const hit = JSON.stringify(item).match(OUT_OF_SCOPE_TEXT);
      assert.ok(!hit, `RISC-V / LoongArch must not appear in displayed plan data (${where}: ${item.id ?? item.n ?? item.key})`);
    }
  }
}

/* Every revision records why; splitting, replacing or removing a work item must say what became of the old ID. */
function validateChanges(plan, all) {
  const ids = new Set(all.map(n => n.id));
  const seen = new Set();
  for (const c of plan.changes) {
    assert.ok(Number.isInteger(c.revision) && !seen.has(c.revision), "change revisions must be unique integers");
    seen.add(c.revision);
    assert.ok(Number.isFinite(Date.parse(c.date)) && typeof c.reason === "string" && c.reason.trim(), `revision ${c.revision}: date and reason are required`);
    for (const x of c.splits || []) {   // { from, to:[ids], why }: the old ID keeps (part of) the work, or is retired
      assert.ok(x.from && Array.isArray(x.to) && x.to.length && x.why, `revision ${c.revision}: split needs from, to[], why`);
      for (const id of x.to) assert.ok(ids.has(id), `revision ${c.revision}: split target ${id} does not exist`);
    }
    for (const x of c.replaced || []) {  // { from, to, why }: the old ID no longer exists
      assert.ok(x.from && x.to && x.why, `revision ${c.revision}: replacement needs from, to, why`);
      assert.ok(!ids.has(x.from), `revision ${c.revision}: replaced ID ${x.from} must not be reused`);
      assert.ok(ids.has(x.to), `revision ${c.revision}: replacement target ${x.to} does not exist`);
    }
    for (const x of c.added || []) {     // { id, why }: a work item introduced in this revision
      assert.ok(x.id && x.why, `revision ${c.revision}: addition needs id, why`);
      assert.ok(ids.has(x.id) || ["later", "trusted"].includes(x.id), `revision ${c.revision}: added ${x.id} does not exist (add the node to plan-data.js first; \"later\" and \"trusted\" name whole sections)`);
    }
    for (const x of c.removed || []) {   // { id, why }: the ID now lives in outOfScope
      assert.ok(x.id && x.why, `revision ${c.revision}: removal needs id, why`);
      assert.ok((plan.outOfScope || []).some(n => n.id === x.id), `revision ${c.revision}: removed ${x.id} must be kept in outOfScope`);
    }
    for (const x of c.moved || []) {
      assert.ok(x.id && x.why && x.from && x.to, "scope move needs ID, source, destination and reason");
      // Check only the latest scope decision for this ID.
      const latest = plan.changes.flatMap(v => v.moved || []).filter(v => v.id === x.id).at(-1);
      if (x === latest) assert.ok((plan[x.to] || []).some(n => n.id === x.id), `moved ${x.id} is absent from ${x.to}`);
    }
  }
  const last = plan.changes.at(-1);
  assert.equal(last.revision, plan.revision);
}

export function validate(plan, snapshot, catalog) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.source, plan.repo);
  assert.ok(Number.isInteger(plan.revision) && plan.revision > 0);
  assert.equal(plan.changes.at(-1).revision, plan.revision);
  assert.ok(Number.isFinite(Date.parse(plan.updatedAt)));
  if (snapshot.generatedAt) assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
  for (const list of [plan.nodes, plan.outOfScope || [], catalog, snapshot.prs]) {
    const ids = list.map(n => n.id ?? n.n);
    assert.equal(new Set(ids).size, ids.length, "duplicate record ID");
  }
  const all = [...plan.nodes, ...(plan.outOfScope || [])];
  assert.equal(new Set(all.map(n => n.id)).size, all.length, "IDs cannot be reused across active and deferred work");
  for (const n of all) {
    assert.ok(n.id && n.title && n.lane);
    assert.ok(Array.isArray(n.needs) && Array.isArray(n.needsInf));
    assert.ok(Array.isArray(n.prs) && Array.isArray(n.reuse));
    for (const key of ["prs", "reuse"]) {
      assert.equal(new Set(n[key]).size, n[key].length, `${n.id}: duplicate ${key}`);
      assert.ok(n[key].every(x => Number.isInteger(x) && x > 0));
    }
    if (n.done !== undefined) assert.ok(typeof n.done === "string" && n.done.trim(), `${n.id}: completion requires evidence`);
  }
  const m = PlanModel.build(plan, snapshot, catalog);
  assert.equal(m.issues.length, 0, m.issues.join("\n"));
  validateChanges(plan, all);
  validateTraceability(plan, catalog, m);
  const facts = new Map(snapshot.prs.map(p => [p.n, p]));
  for (const n of plan.nodes) for (const pr of [...n.prs, ...n.reuse]) {
    assert.ok(facts.has(pr), `missing snapshot for #${pr}`);
  }
  for (const p of snapshot.prs) assert.ok(["open", "closed", "merged"].includes(p.kind));
  return m;
}

const model = validate(plan, snapshot, catalog);
// Readiness uses explicit acceptance of every confirmed prerequisite, across lanes.
for (const n of plan.nodes) {
  const state = model.state[n.id];
  assert.ok(PlanModel.STATES.includes(state), `${n.id}: unknown state ${state}`);
  if (state === "ready" || state === "done") assert.equal(model.blockers(n.id).length, 0, `${n.id}: ${state} with unaccepted prerequisites`);
  if (state === "waiting") {
    assert.ok(model.acceptanceWaits(n.id).length > 0, `${n.id}: waiting needs an unaccepted prerequisite`);
    assert.equal(model.startBlockers(n.id).length, 0);
    assert.ok(model.localOk(n.id));
  }
  if (state === "blocked") assert.ok(model.startBlockers(n.id).length > 0);
  if (state === "active") assert.ok(model.openPrs(n.id).length > 0);
}
for (const counts of Object.values(model.counts)) {
  assert.equal(PlanModel.STATES.reduce((sum, s) => sum + counts[s], 0), counts.total);
}
for (const lane of plan.lanes) {
  const view = model.view(lane.key);
  PlanLayout.layout(model, view, { width: 1840 });
}

// A roll-up sign-off lists its delivery checklist in the details only: no drawn edges, nothing depends on it,
// and it is not reported as something its prerequisites unlock.
for (const n of plan.nodes.filter((x) => x.rollup)) {
  assert.ok(n.milestone, `${n.id}: a rollup node must also be a milestone`);
  assert.equal(model.succ[n.id].length, 0, `${n.id}: nothing may depend on a rollup node`);
  for (const lane of plan.lanes) {
    const v = model.view(lane.key);
    assert.equal(v.rollups.includes(n), lane.key === n.lane, `${n.id}: rollup belongs to its own lane view only`);
    const drawn = [...v.edges, ...v.extIn, ...v.extOut];
    assert.ok(!drawn.some((e) => e.b === n.id), `${n.id}: checklist edges must not be drawn`);
    assert.ok(!v.upIds.some((id) => model.pred[n.id].some((e) => e.a === id) && !drawn.some((e) => e.a === id)), `${n.id}: checklist items must not create stubs`);
    const g = PlanLayout.layout(model, v, { width: 1840 });
    if (lane.key === n.lane) assert.equal(g.bands.at(-1).type === "down" ? g.bands.at(-2).type : g.bands.at(-1).type, "rollup", `${n.id}: rollup band comes after the graph stages`);
  }
  for (const e of model.pred[n.id]) {
    assert.ok(!model.unlocks(e.a).some((u) => u.id === n.id), `${n.id}: must not appear among what ${e.a} unlocks`);
    assert.ok(!model.down(e.a).has(n.id), `${n.id}: must not be highlighted as downstream of ${e.a}`);
    assert.ok(model.rolledInto(e.a).includes(n.id), `${e.a}: rolledInto should list ${n.id}`);
  }
}

// Final acceptance (every rollup node together) must cover every active item through confirmed delivery gates.
const roots = plan.nodes.filter((n) => n.rollup).map((n) => n.id);
assert.ok(roots.length > 0, "the plan needs a rollup node that signs off the whole scope");
const covered = new Set();
const pending = [...roots];
while (pending.length) {
  const id = pending.pop();
  if (covered.has(id)) continue;
  covered.add(id);
  for (const e of model.pred[id]) if (e.kind === "doc") pending.push(e.a);
}
const uncovered = plan.nodes.filter(n => !covered.has(n.id)).map(n => n.id);
assert.equal(uncovered.length, 0, `active work missing from final scope acceptance: ${uncovered.join(", ")}`);

// The hand-written plan document must carry the same work items, dependencies and change log.
const doc = await readFile(DOC_PATH, "utf8");
assert.equal(applyBlocks(doc, renderBlocks(plan, model)), doc, "x86-verification-plan.polished.md is out of date: run node plan-doc.mjs --write");

console.log(`Validated ${model.nodes.length} work items, ${model.edges.length} dependencies and ${snapshot.prs.length} PR snapshots; plan document is consistent.`);
