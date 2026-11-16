#!/usr/bin/env node
/* Keeps x86-verification-plan.polished.md consistent with the plan data files.
 *
 * The document is written by hand except for the blocks between
 *   <!-- BEGIN GENERATED:name --> ... <!-- END GENERATED:name -->
 * which are rendered from the merged plan (work items, dependency evidence, later work,
 * trusted boundaries, change log). Volatile PR facts (state, CI, gate) are not rendered here:
 * they come from pr-snapshot.js and belong to the dated PR tables written by hand.
 *
 *   node plan-doc.mjs --write   regenerate the blocks in place
 *   node check-data.mjs         fails when the blocks are out of date
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadWindow } from "./plan-store.mjs";

export const DOC_PATH = fileURLToPath(new URL("./x86-verification-plan.polished.md", import.meta.url));

const GATE = { start: "开工前置", accept: "验收前置" };
const edgeLabel = (e) => (e.kind === "inf" ? e.tag : `确认 · ${GATE[e.gate]}`);
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const prList = (l) => (l.length ? l.map((x) => `#${x}`).join("、") : "—");

export function renderBlocks(plan, model) {
  const lane = Object.fromEntries(plan.lanes.map((l) => [l.key, l]));
  const out = {};

  out.meta = `计划版本 r${plan.revision}（${plan.updatedAt}）· 源码基线 main [\`${plan.doc.sha.slice(0, 9)}\`](${plan.repo}/commit/${plan.doc.sha}) · 仪表盘快照 ${plan.doc.snapshotAt}（\`${plan.doc.snapshotSha.slice(0, 9)}\`）· ${plan.nodes.length} 个工作项、${model.edges.length} 条依赖`;

  /* ---- work items ---- */
  const items = [];
  for (const l of plan.lanes) {
    items.push(`#### ${l.name}`, "");
    for (const n of plan.nodes.filter((x) => x.lane === l.key)) {
      const tags = [n.milestone ? "里程碑" : "", n.rollup ? "汇总验收" : "", n.standalone ? "独立" : ""].filter(Boolean).join("、");
      items.push(`**${n.id}** — ${n.title}${tags ? `（${tags}）` : ""}`, "");
      items.push(`- 实施 PR：${prList(n.prs)}；复用 / 协调：${prList(n.reuse)}；模块：${n.mods.length ? n.mods.join("、") : "—"}`);
      items.push(`- 要做什么：${n.todo.join(" ")}`);
      items.push(`- 验收 / 限定：${n.accept}`);
      if (n.done) items.push(`- 已完成依据：${n.done}`);
      const pre = model.pred[n.id];
      items.push(`- 前置：${pre.length ? pre.map((e) => `${e.a}（${edgeLabel(e)}）`).join("、") : "无"}`);
      items.push("");
    }
  }
  out.items = `${plan.acceptanceRule}\n\n${items.join("\n").trimEnd()}`;

  /* ---- dependency evidence ---- */
  const deps = [];
  for (const l of plan.lanes) {
    deps.push(`#### ${l.name}`, "", "| 工作项 | 前置 | 类型 | 用到前置的什么 / 缺少的证据 | 依据（文件::符号 @固定提交） |", "|---|---|---|---|---|");
    for (const n of plan.nodes.filter((x) => x.lane === l.key)) {
      for (const e of model.pred[n.id]) {
        deps.push(`| ${n.id} | ${e.a}${e.cross ? "（跨路线）" : ""} | ${edgeLabel(e)} | ${cell(e.kind === "inf" ? e.missing : e.need)} | ${cell(e.kind === "inf" ? "尚无" : e.ev)} |`);
      }
    }
    deps.push("");
  }
  out.deps = deps.join("\n").trimEnd();

  /* ---- later ---- */
  out.later = (plan.later || []).map((x) =>
    `- **${x.id}**（${lane[x.lane].name}）${x.title}：${x.why}${x.after.length ? ` 计划建议的先后：在 ${x.after.join("、")} 之后（不是已核对的依赖）。` : ""} ${x.todo.join(" ")} 依据：${x.ev}`).join("\n") || "r2 的七项后续工作已保留 ID 纳入当前范围（见 r3 变更记录）。多架构迁移仍在 outOfScope；不因某项不在首个 BSP 中断路径上就将其排除。";

  /* ---- trusted boundaries ---- */
  out.trusted = ["| 编号 | 提供者 | 计划内代码消费的输入 | 消费者 | 记录方式 |", "|---|---|---|---|---|",
    ...(plan.trusted || []).map((t) => `| ${t.id} | ${cell(t.provider)} | ${cell(t.input)} | ${t.consumers.join("、")} | ${cell(t.record)} |`)].join("\n");

  /* ---- inspected, not linked PRs ---- */
  out.candidates = (plan.reviewedCandidates || []).map((c) => `- [#${c.n}](${plan.repo}/pull/${c.n})（${c.reviewedAt} 复核，head ${c.head || "未记录"}，未关联）：${c.note}`).join("\n");

  /* ---- change log ---- */
  const log = [];
  for (const c of [...plan.changes].reverse()) {
    log.push(`- **r${c.revision} · ${c.date}**：${c.reason}`);
    for (const x of c.splits || []) log.push(`  - 拆分 ${x.from} → ${x.to.join(" + ")}：${x.why}`);
    for (const x of c.replaced || []) log.push(`  - 替换 ${x.from} → ${x.to}：${x.why}`);
    for (const x of c.removed || []) log.push(`  - 移出范围 ${x.id}：${x.why}`);
    for (const x of c.moved || []) log.push(`  - 范围调整 ${x.id}（${x.from} → ${x.to}，保留 ID）：${x.why}`);
    for (const x of c.added || []) log.push(`  - 新增 ${x.id}：${x.why}`);
    for (const x of c.edgesRemoved || []) log.push(`  - 移除依赖 ${x.a} → ${x.b}：${x.why}`);
    for (const x of c.edgesAdded || []) log.push(`  - 新增依赖 ${x.a} → ${x.b}：${x.why}`);
    for (const x of c.edgesChanged || []) log.push(`  - 调整依赖 ${x.a} → ${x.b}：${x.why}`);
    if (c.prs) log.push(`  - PR：${c.prs}`);
  }
  out.changes = log.join("\n");
  return out;
}

const marker = (name, which) => `<!-- ${which} GENERATED:${name} -->`;

/* Returns the document text with every generated block replaced; throws when a marker pair is missing. */
export function applyBlocks(text, blocks) {
  let result = text;
  for (const [name, body] of Object.entries(blocks)) {
    const begin = marker(name, "BEGIN"), end = marker(name, "END");
    const i = result.indexOf(begin), j = result.indexOf(end);
    if (i < 0 || j < i) throw new Error(`plan document is missing the ${name} block (${begin} … ${end})`);
    result = result.slice(0, i + begin.length) + "\n" + body + "\n" + result.slice(j);
  }
  return result;
}

export async function loadContext() {
  const { PLAN: plan, PLAN_PR_SNAPSHOT: snapshot, PLAN_PR_CATALOG: catalog, PlanModel } = await loadWindow();
  return { plan, snapshot, catalog, model: PlanModel.build(plan, snapshot, catalog) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { plan, model } = await loadContext();
  const text = await readFile(DOC_PATH, "utf8");
  const next = applyBlocks(text, renderBlocks(plan, model));
  if (process.argv.includes("--write")) {
    await writeFile(DOC_PATH, next);
    console.log(`Updated generated blocks in ${DOC_PATH}`);
  } else console.log(next === text ? "Plan document is up to date." : "Plan document is out of date: run with --write.");
}
