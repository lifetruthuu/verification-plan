/* Reads and writes the plan data files. Shared by the checks, the document generator and plan.mjs.
 *
 * Machine-written files (plan-edges.js, plan-accept.js, plan-history.js, pr-catalog.js) are regenerated
 * from objects with a fixed layout, so edits made by hand or by plan.mjs give small, readable diffs.
 * plan-data.js and the generated pr-snapshot.js are never rewritten here. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const DIR = fileURLToPath(new URL("../public/data/", import.meta.url));
/* Load order, same as index.html. */
export const FILES = ["plan-data", "plan-edges", "plan-accept", "plan-history", "pr-catalog", "pr-snapshot", "plan-assemble", "plan-model", "plan-layout"];
const ASSETS_DIR = fileURLToPath(new URL("../public/assets/", import.meta.url));
const ASSET_NAMES = new Set(["plan-assemble", "plan-model", "plan-layout"]);
export const path = (name) => `${ASSET_NAMES.has(name) ? ASSETS_DIR : DIR}${name}.js`;

export async function loadWindow(names = FILES) {
  const context = { window: {} };
  for (const name of names) vm.runInNewContext(await readFile(path(name), "utf8"), context, { filename: `${name}.js` });
  return context.window;
}

/* ---------------------------------------------------------------- formatting */
const isPrim = (x) => typeof x !== "object" || x === null;
export function pretty(v, ind = 0) {
  const pad = "  ".repeat(ind);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    if (v.every(isPrim)) {
      const s = `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
      if (s.length + ind * 2 <= 110) return s;
    }
    return `[\n${v.map((x) => `${pad}  ${pretty(x, ind + 1)}`).join(",\n")}\n${pad}]`;
  }
  if (v && typeof v === "object") {
    const ks = Object.keys(v);
    if (!ks.length) return "{}";
    return `{\n${ks.map((k) => `${pad}  ${JSON.stringify(k)}: ${pretty(v[k], ind + 1)}`).join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(v);
}

const EDGE_KEYS = ["to", "from", "gate", "need", "ev", "tag", "missing"];
const edgeLine = (r) => {
  const keys = [...EDGE_KEYS.filter((k) => k in r), ...Object.keys(r).filter((k) => !EDGE_KEYS.includes(k))];
  return `  { ${keys.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(r[k])}`).join(", ")} }`;
};

export function formatEdges(rows, nodes, lanes) {
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const laneOf = Object.fromEntries(nodes.map((n) => [n.id, n.lane]));
  const laneName = Object.fromEntries(lanes.map((l) => [l.key, l.name]));
  const sorted = rows.map((r, i) => ({ r, i })).sort((p, q) => (order.get(p.r.to) ?? 1e9) - (order.get(q.r.to) ?? 1e9) || p.i - q.i).map((x) => x.r);
  const out = [];
  let lane = null, consumer = null;
  for (const r of sorted) {
    if (laneOf[r.to] !== lane) { lane = laneOf[r.to]; out.push(`\n  /* ===== consumers in: ${laneName[lane] || lane} ===== */`); consumer = null; }
    if (r.to !== consumer) { consumer = r.to; if (out.at(-1) && !out.at(-1).startsWith("\n")) out.push(""); }
    out.push(`${edgeLine(r)},`);
  }
  return `/* Dependency table: one row per prerequisite ("from") → consumer ("to"). Rewritten by plan.mjs; hand edits are fine.
 *   confirmed    gate "start" | "accept", need = the interface / spec / resource / state the consumer uses,
 *                ev = file::symbol @fixed-commit where that was checked
 *   unconfirmed  tag "推断" | "待确认", missing = the evidence that is absent (never blocks a work item)
 * Rows are grouped by consumer in node order. Record every change in plan-history.js (plan.mjs does it). */
window.PLAN_EDGES = [${out.join("\n")}
];
`;
}

export function formatAccept(acc) {
  const ks = Object.keys(acc);
  return `/* Explicit acceptance records ("done"). A merged PR, a green CI or a dashboard colour never sets one.
 * date: day the delivery was verified; evidence: what was checked, against which fixed commit (…@<sha>).
 * Add with  npm run plan -- accept ID --evidence "…"  or edit by hand. */
window.PLAN_ACCEPT = ${ks.length ? pretty(acc) : "{}"};
`;
}

export function formatHistory(history) {
  return `/* Change log, oldest first. The last entry is the plan revision shown on the page and in the document.
 * Later edge decisions supersede earlier ones (check-data compares the latest decision with the graph).
 * Append with  plan.mjs rev "reason"  and the edge / log commands, or edit by hand. */
window.PLAN_HISTORY = ${pretty(history)};
`;
}

const CATALOG_KEYS = ["n", "scope", "implements", "reuses", "note", "reviewedHead", "reviewedAt"];
export function formatCatalog(cat) {
  const norm = cat.map((p) => { const o = {}; for (const k of CATALOG_KEYS) if (k in p) o[k] = p[k]; for (const k of Object.keys(p)) if (!(k in o)) o[k] = p[k]; return o; });
  return `/* One entry per PR the plan has an opinion about. Curated by hand, never overwritten by the GitHub sync.
 *   implements  work items this PR delivers (open → drives "PR 进行中"; merged → shown grey until the item is accepted)
 *   reuses      work items it is only reused by / coordinated with (shown as 参考, never counts as progress)
 *   scope, note what it covers and what is still missing; valid for reviewedHead only — re-check after the head changes
 * Live state (open / merged, head, review, CI, merge gate) comes from pr-snapshot.js. */
window.PLAN_PR_CATALOG = ${pretty(norm)};
`;
}

export async function writeData(name, text) { await writeFile(path(name), text); }
