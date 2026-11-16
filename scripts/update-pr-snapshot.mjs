#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, writeFile, rename } from "node:fs/promises";
import { loadWindow, FILES } from "./plan-store.mjs";

/* usage: update-pr-snapshot.mjs [PLAN_DATA] OUTPUT   (PLAN_DATA is accepted for compatibility and ignored:
 * data files in public/data are read) */
const outputPath = process.argv.slice(2).at(-1);
if (!outputPath) throw new Error("usage: update-pr-snapshot.mjs OUTPUT");
const context = { window: await loadWindow(FILES.filter((f) => !["pr-snapshot", "plan-model", "plan-layout"].includes(f))) };
const plan = context.window.PLAN;
const repo = new URL(plan.repo).pathname.slice(1);
const [owner, name] = repo.split("/");
const numbers = [...new Set([
  ...[...plan.nodes, ...(plan.outOfScope || [])].flatMap(n => [...n.prs, ...n.reuse]),
  ...context.window.PLAN_PR_CATALOG.map(p => p.n),
])].sort((a, b) => a - b);
function gh(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024 }));
}
const prs = [];
for (const n of numbers) {
  const query = `query($owner:String!, $name:String!, $number:Int!) {
    repository(owner:$owner,name:$name) { pullRequest(number:$number) {
      number title body url state isDraft headRefOid updatedAt mergedAt closedAt
      reviewDecision mergeStateStatus
      mergeCommit { oid }
      commits(last:1) { nodes { commit { statusCheckRollup { state } } } }
    } }
  }`;
  const result = gh(["api", "graphql", "-f", `query=${query}`, "-f", `owner=${owner}`,
    "-f", `name=${name}`, "-F", `number=${n}`]);
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  const p = result.data?.repository?.pullRequest;
  if (!p) throw new Error(`Missing PR #${n}`);
  const ciState = p.commits.nodes[0]?.commit.statusCheckRollup?.state || "UNKNOWN";
  prs.push({ n: p.number, kind: p.state.toLowerCase(), draft: p.isDraft,
    head: p.headRefOid, title: p.title, body: p.body, url: p.url,
    updatedAt: p.updatedAt, mergedAt: p.mergedAt, closedAt: p.closedAt,
    mergeCommit: p.mergeCommit?.oid || null,
    reviewDecision: p.reviewDecision, ciState,
    review: ({CHANGES_REQUESTED:"需修改", APPROVED:"已批准", REVIEW_REQUIRED:"待审阅"})[p.reviewDecision] || "无汇总结论",
    gate: p.mergeStateStatus,
    ci: ({SUCCESS:"成功", FAILURE:"失败", ERROR:"失败", PENDING:"进行中", EXPECTED:"等待检查"})[ciState] || "未知",
  });
}
// Discover new open PRs without assigning work or changing the plan automatically.
// PRs a maintainer has already inspected and judged unrelated stay in plan.reviewedCandidates.
const reviewed = new Map((plan.reviewedCandidates || []).map(x => [x.n, x.head]));
const candidates = [];
for (let page = 1; ; page++) {
  const batch = gh(["api", `repos/${repo}/pulls?state=open&per_page=100&page=${page}`]);
  for (const p of batch) if (!numbers.includes(p.number) && reviewed.get(p.number) !== p.head.sha) candidates.push({
    n: p.number, title: p.title, url: p.html_url, head: p.head.sha, updatedAt: p.updated_at,
  });
  if (batch.length < 100) break;
}
const snapshot = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: plan.repo, prs, candidates };
const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `window.PLAN_PR_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`);
await rename(temporaryPath, outputPath);
console.log(`Wrote ${prs.length} tracked PRs and ${candidates.length} unassigned candidates to ${outputPath}`);
