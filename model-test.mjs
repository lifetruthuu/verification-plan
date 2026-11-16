/* Behaviour tests for plan-assemble.js, plan-model.js and plan-layout.js on a small built-in plan.
 * They do not read the real plan data, so adjusting work items, dependencies or acceptance records never
 * breaks them; check-data.mjs checks the real data. Run alone:  node model-test.mjs */
import assert from "node:assert/strict";
import { loadWindow } from "./plan-store.mjs";

/* Values built inside the plan's vm context have another Array prototype: compare as JSON. */
const eq = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const mk = (id, lane, extra = {}) => ({ id, lane, face: id, title: id, mods: [], todo: ["t"], accept: "a", src: "", ...extra });
const edge = (from, to, gate = "accept") => ({ to, from, gate, need: `${from} contract`, ev: "f.rs::g @abcdef123" });
const fixture = () => ({
  base: { repo: "https://example.invalid/r", lanes: [{ key: "a", name: "A" }, { key: "b", name: "B" }], statuses: [], outOfScope: [],
    nodes: [
      mk("IO", "b"), mk("ENC", "b"), mk("CFG", "b"),                       // CFG needs IO and ENC
      mk("P1", "a"), mk("P2", "a"), mk("S", "a"), mk("U", "a"),              // consumers of IO: accept gate x2, start gate, unconfirmed
      mk("R", "a", { milestone: true, rollup: true }),                      // sign-off over P1, P2, CFG
    ] },
  edges: [
    edge("IO", "CFG"), edge("ENC", "CFG"),
    edge("IO", "P1"), edge("IO", "P2"), edge("IO", "S", "start"), { to: "U", from: "IO", tag: "推断", missing: "no checked caller" },
    edge("P1", "R"), edge("P2", "R"), edge("CFG", "R"),
  ],
  accept: {},
  history: [{ revision: 1, date: "2026-01-01", reason: "r1" }, { revision: 2, date: "2026-01-02", reason: "r2" }],
  catalog: [
    { n: 1, scope: "io", implements: ["IO"], reuses: [], reviewedHead: "h1" },
    { n: 2, scope: "cfg", implements: ["CFG"], reuses: ["P1"], reviewedHead: "h2" },
  ],
  snapshot: { prs: [{ n: 1, kind: "open", head: "h1" }, { n: 2, kind: "open", head: "h2" }] },
});

export async function runModelTests(w) {
  const { PlanAssemble, PlanModel, PlanLayout } = w;
  const run = (f, over = {}) => {
    const x = { ...f, ...over };
    const plan = PlanAssemble.assemble(x.base, x.edges, x.accept, x.history, x.catalog);
    return { plan, m: PlanModel.build(plan, x.snapshot, x.catalog) };
  };

  /* ---- assembling the data files ---- */
  let f = fixture();
  let { plan, m } = run(f);
  eq(plan.assembleIssues, []);
  eq(m.issues, []);
  assert.equal(plan.revision, 2); assert.equal(plan.updatedAt, "2026-01-02");
  const node = (id) => plan.nodes.find((n) => n.id === id);
  eq([...node("CFG").needs], ["IO", "ENC"]);
  eq([...node("U").needsInf], ["IO"], "an edge that says what evidence is missing is unconfirmed");
  eq([...node("IO").prs], [1]);
  eq([...node("P1").reuse], [2]);
  assert.equal(node("P1").deps.IO.gate, "accept");
  f = fixture(); f.accept = { IO: { date: "2026-02-02", evidence: "checked @abcdef123" } };
  assert.equal(run(f).plan.nodes.find((n) => n.id === "IO").done, "2026-02-02 checked @abcdef123");
  const bad = fixture();
  bad.edges.push(edge("IO", "NOPE"), edge("IO", "P1"));
  bad.catalog.push({ n: 9, scope: "x", implements: ["NOPE"], reuses: [] });
  bad.accept = { NOPE: { date: "2026-01-01", evidence: "@abcdef123" } };
  bad.history = [];
  const issues = run(bad).m.issues.join("\n");
  for (const re of [/unknown consumer NOPE/, /appears twice/, /unknown work item NOPE/, /acceptance: unknown/, /no revision/]) assert.match(issues, re);

  /* ---- plan status: only explicit acceptance releases a consumer ---- */
  ({ plan, m } = run(fixture()));
  assert.equal(m.state.IO, "active"); assert.equal(m.state.CFG, "active");
  for (const id of ["P1", "P2"]) assert.equal(m.state[id], "waiting", `${id}: only an acceptance gate is unmet`);
  assert.ok(m.localOk("P1"));
  assert.equal(m.state.S, "blocked", "an unmet start gate blocks");
  assert.equal(m.state.U, "ready", "an unconfirmed relation never blocks");
  assert.equal(m.waits("U").length, 1); assert.equal(m.blockers("U").length, 0);
  assert.equal(m.blockers("CFG").length, 2, "an open PR does not satisfy its prerequisites");
  const unlockP1 = () => m.unlocks("IO").find((u) => u.id === "P1");
  assert.ok(unlockP1().immediate);
  assert.equal(m.unlocks("IO").find((u) => u.id === "CFG").rest, 1);
  assert.equal(m.unlocks("IO").find((u) => u.id === "U").kind, "inf");

  f = fixture(); f.snapshot.prs[0].kind = "merged";
  ({ m } = run(f));
  assert.notEqual(m.state.IO, "done", "a merged PR is not an acceptance");
  assert.equal(m.state.P1, "waiting", "a merge must not release consumers");

  f = fixture(); f.snapshot.prs[0].kind = "merged"; f.accept = { IO: { date: "2026-02-02", evidence: "x @abcdef123" } };
  ({ m } = run(f));
  assert.equal(m.state.IO, "done");
  for (const id of ["P1", "P2", "S"]) assert.equal(m.state[id], "ready");
  assert.equal(m.blockers("CFG").map((e) => e.a).join(), "ENC");
  assert.ok(m.unlocks("IO").find((u) => u.id === "P1").accepted);
  assert.equal(m.unlocks("IO").find((u) => u.id === "P1").immediate, false, "accepted work must not promise a future unlock");

  f = fixture(); f.catalog[1].implements = []; f.accept = { IO: { date: "d", evidence: "x @abcdef123" } };
  assert.equal(run(f).m.state.CFG, "waiting", "no open PR → derived from prerequisites");
  f.accept.ENC = { date: "d", evidence: "x @abcdef123" };
  assert.equal(run(f).m.state.CFG, "ready");

  /* ---- sign-off nodes ---- */
  f = fixture();
  ({ plan, m } = run(f));
  assert.equal(m.state.R, "waiting");
  assert.ok(m.isRollup("R"));
  assert.ok(!m.consumers("P1").some((e) => e.b === "R"), "a sign-off is not something P1 unlocks");
  assert.ok(!m.unlocks("P1").some((u) => u.id === "R"));
  assert.ok(!m.down("P1").has("R"));
  eq(m.rolledInto("P1"), ["R"]);
  const va = m.view("a");
  eq(va.rollups.map((n) => n.id), ["R"]);
  assert.ok(![...va.edges, ...va.extIn, ...va.extOut].some((e) => e.b === "R"), "checklist edges are not drawn");
  assert.ok(!va.upIds.includes("CFG"), "checklist items do not create stubs");
  assert.equal(va.stage.R, va.nGraphStages);
  for (const lane of ["a", "b"]) {
    const v = m.view(lane);
    const g = PlanLayout.layout(m, v, { width: 1400 });
    assert.equal(Object.values(g.cards).filter((c) => c.kind === "node").length, v.nodes.length);
    for (const r of g.routes) assert.ok(v.stage[r.a] === undefined || v.stage[r.a] < (v.stage[r.b] ?? 99) || r.cross, `edge ${r.a}→${r.b} points forward`);
  }
  assert.equal(PlanLayout.layout(m, va, { width: 1400 }).bands.filter((b) => b.type === "rollup").length, 1);
  assert.match(run({ ...fixture(), edges: [...fixture().edges, edge("R", "P1")] }).m.issues.join("\n"), /depends on rollup node R/);

  /* ---- graph checks ---- */
  const cyc = fixture(); cyc.edges.push(edge("CFG", "IO"));
  assert.match(run(cyc).m.issues.join("\n"), /cycle/);
  const self = fixture(); self.edges.push(edge("IO", "IO"));
  assert.match(run(self).m.issues.join("\n"), /depends on itself|cycle/);
  const before = JSON.stringify(fixture());
  const f2 = fixture(); run(f2);
  assert.equal(JSON.stringify(f2), before, "building the model must not mutate its input");
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  await runModelTests(await loadWindow());
  console.log("Model tests passed.");
}
