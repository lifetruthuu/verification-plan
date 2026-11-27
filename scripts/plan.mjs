#!/usr/bin/env node
/* One entry point for maintaining the verification plan.  npm run plan -- help */
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadWindow, formatEdges, formatAccept, formatHistory, formatCatalog, path } from "./plan-store.mjs";
import { applyBlocks, renderBlocks, DOC_PATH } from "./plan-doc.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const STATE = { ready: "前置就绪", waiting: "前置待交付", active: "PR 进行中", blocked: "开工受阻", done: "已完成" };
const GATE = { start: "开工前置", accept: "验收前置" };
const SHA = /@[0-9a-f]{9,40}/;
const today = () => new Date().toLocaleDateString("sv-SE");
const J = (x) => JSON.parse(JSON.stringify(x));
const die = (msg) => { console.error(`错误：${msg}`); process.exit(1); };

/* ------------------------------------------------------------------ args */
function parseArgs(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[k] = true; else { flags[k] = next; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}
const list = (v) => (v === undefined || v === true ? [] : String(v).split(/[,，\s]+/).filter(Boolean));
const prNum = (s) => { const n = Number(String(s).replace(/^#/, "")); if (!Number.isInteger(n)) die(`PR 编号不对：${s}`); return n; };

/* ------------------------------------------------------------------ data */
async function load() {
  const w = await loadWindow();
  const d = { edges: J(w.PLAN_EDGES), accept: J(w.PLAN_ACCEPT), history: J(w.PLAN_HISTORY), catalog: J(w.PLAN_PR_CATALOG), base: w.PLAN_BASE };
  return { w, d };
}
function build(w, d) {
  const plan = w.PlanAssemble.assemble(d.base, d.edges, d.accept, d.history, d.catalog);
  return { plan, model: w.PlanModel.build(plan, w.PLAN_PR_SNAPSHOT, d.catalog) };
}
const snapPrs = (w) => new Map((w.PLAN_PR_SNAPSHOT?.prs || []).map((p) => [p.n, p]));
const prText = (p) => (p ? `#${p.n}（${p.kind === "merged" ? "已合入" : p.kind === "closed" ? "已关闭" : `${p.draft ? "草稿" : "开放"} · ${p.review} · ${p.gate} · CI ${p.ci}`}）` : "");

async function writeIfChanged(name, text) {
  let old = ""; try { old = await readFile(path(name), "utf8"); } catch { /* new file */ }
  if (old === text) return false;
  await writeFile(path(name), text);
  return true;
}
async function writeData(w, d) {
  const nodes = d.base.nodes;
  const changed = [];
  if (await writeIfChanged("plan-edges", formatEdges(d.edges, nodes, d.base.lanes))) changed.push("plan-edges.js");
  if (await writeIfChanged("plan-accept", formatAccept(d.accept))) changed.push("plan-accept.js");
  if (await writeIfChanged("plan-history", formatHistory(d.history))) changed.push("plan-history.js");
  if (await writeIfChanged("pr-catalog", formatCatalog(d.catalog))) changed.push("pr-catalog.js");
  return changed;
}
async function syncDocs() {
  const w = await loadWindow();
  const { PLAN: plan, PLAN_PR_SNAPSHOT: snapshot, PLAN_PR_CATALOG: catalog, PlanModel } = w;
  const model = PlanModel.build(plan, snapshot, catalog);
  const text = await readFile(DOC_PATH, "utf8");
  const next = applyBlocks(text, renderBlocks(plan, model));
  if (next !== text) { await writeFile(DOC_PATH, next); return true; }
  return false;
}
function diffStates(a, b) {
  const out = [];
  for (const n of b.plan.nodes) {
    const x = a.model.state[n.id], y = b.model.state[n.id];
    if (x !== y) out.push(`  ${n.id}（${n.title}）：${STATE[x] ?? "（新增）"} → ${STATE[y]}`);
  }
  return out;
}
/* Apply an edit to the data, refuse it if the merged plan has problems, write the files, refresh the document. */
async function mutate(edit, { dry = false } = {}) {
  const { w, d } = await load();
  const before = build(w, d);
  const msgs = (await edit(d, before, w)) || [];
  const after = build(w, d);
  if (after.model.issues.length) { console.error("修改后数据有问题，没有写入：\n" + after.model.issues.map((i) => "  - " + i).join("\n")); process.exit(1); }
  const changes = diffStates(before, after);
  for (const m of msgs) console.log(m);
  console.log(changes.length ? `工作项状态变化（${changes.length}）：\n${changes.join("\n")}` : "没有工作项的状态变化。");
  if (dry) { console.log("（--dry-run：没有写入）"); return; }
  const files = await writeData(w, d);
  const docChanged = await syncDocs();
  console.log(`已写入：${files.join("、") || "（数据没有变化）"}${docChanged ? "；文档生成块已更新" : ""}。提交前运行：npm run plan -- check`);
}

/* ------------------------------------------------------------------ history */
function latest(d, flags) {
  const last = d.history.at(-1);
  if (!last) die("变更记录里没有任何版本");
  if (last.date !== today() && !flags["into-latest"]) die(`最近的版本是 r${last.revision}（${last.date}），不是今天。\n  新开一个版本：plan.mjs rev "这次调整的原因"\n  或明确写入该版本：加 --into-latest`);
  return last;
}
const needWhy = (flags) => (typeof flags.why === "string" && flags.why.trim() ? flags.why.trim() : die("需要 --why \"理由\"（会写进变更记录）"));
function logEdge(entry, kind, a, b, why) {
  const opposite = { edgesAdded: "edgesRemoved", edgesRemoved: "edgesAdded" }[kind];
  const same = (x) => x.a === a && x.b === b;
  /* Net out add + remove inside one revision: the history must agree with the graph at the end of it. */
  if (opposite && (entry[opposite] || []).some(same)) {
    entry[opposite] = entry[opposite].filter((x) => !same(x));
    if (!entry[opposite].length) delete entry[opposite];
    if (kind === "edgesAdded") (entry.edgesChanged ??= []).push({ a, b, why });   // removed earlier in this revision, back with new content
    return;
  }
  (entry[kind] ??= []).push({ a, b, why });
}
const findRow = (d, a, b) => d.edges.findIndex((r) => r.from === a && r.to === b);
const nodeOf = (d, id) => d.base.nodes.find((n) => n.id === id) || die(`没有这个工作项：${id}`);

/* ------------------------------------------------------------------ commands */
const commands = {};

commands.help = async () => console.log(`用法：npm run plan -- <命令>

检查与查看
  check                      校验数据、依赖依据、变更记录与文档一致性（= check-data.mjs）
  docs                       重新生成文档里的生成块
  todo                       PR 变化之后该处理什么：待验收确认、head 变化、新 PR、过期描述……
  sync [--offline]           刷新 PR 快照（需要 gh）→ 重新生成文档 → 校验 → todo
  show ID                    一项工作：状态、前置、后继、PR、验收
  impact ID                  若 ID 验收：哪些工作的状态会变；以及它的全部间接后继

修改（都会写入变更记录、打印状态变化、拒绝产生环；加 --dry-run 只预览）
  rev "原因"                  新开一个版本；之后的修改写进它
  edge add FROM TO --gate accept|start --need "要用到的接口" --ev "文件::符号 @提交" --why "理由"
  edge add FROM TO --tag 推断|待确认 --missing "缺什么证据" --why "理由"
  edge rm FROM TO --why "理由"
  edge set FROM TO [--gate g] [--need t] [--ev t] [--tag t] [--missing t] --why "理由"   改类型 / 理由 / 依据
  edge swap OLD NEW [--for A,B] --why "理由"        把 OLD 提供的前置改由 NEW 提供（拆分、替换用）
  accept ID --evidence "核对了什么 …@<提交>" [--date YYYY-MM-DD]     记录验收（PR 合入不会自动验收）
  unaccept ID                撤销验收记录
  pr add N --scope "覆盖范围" [--note t] [--implements A,B] [--reuses C]   让一个新 PR 进入计划
  pr set N [--scope t] [--note t] [--implements A,B] [--reuses C]            整体替换
  pr link N ID [--reuse] / pr unlink N ID / pr rm N
  pr review N [--note t] [--scope t]   复核 head 之后记下：reviewedHead = 当前快照的 head
  log split|replaced|removed|added ...    记录节点层面的调整（节点本身在 plan-data.js 里手改）

日常维护说明见 README.md。`);

commands.check = async () => { try { execFileSync("node", [`${HERE}check-data.mjs`], { stdio: "inherit" }); } catch { process.exit(1); } };
commands.docs = async () => console.log((await syncDocs()) ? "文档生成块已更新。" : "文档生成块已是最新。");

/* ---------------------------------------------------------------- show / impact */
function nodeLine(model, id) { const n = model.byId[id]; return `${id}（${n.title}）${STATE[model.state[id]]}`; }
function prList(w, model, ids) { const m = snapPrs(w); return ids.map((x) => prText(m.get(x)) || `#${x}（快照里没有）`).join("；") || "—"; }
commands.show = async ([id]) => {
  const { w, d } = await load(); const { plan, model } = build(w, d);
  if (!model.byId[id]) die(`没有这个工作项：${id}`);
  const n = model.byId[id];
  console.log(`${id} — ${n.title}\n  路线：${model.lanes.find((l) => l.key === n.lane).name} · 状态：${STATE[model.state[id]]}${n.rollup ? " · 汇总验收" : n.milestone ? " · 里程碑" : ""}`);
  console.log(`  实施 PR：${prList(w, model, n.prs)}\n  复用 / 协调：${prList(w, model, n.reuse)}`);
  for (const lane of plan.lanes) for (const item of lane.packages) {
    if (item.ids.includes(id)) console.log(`  建议 PR：${item.title}（${item.ids.join("、")}）\n    ${item.scope}\n    ${item.command}`);
  }
  console.log(n.done ? `  验收记录：${n.done.slice(0, 160)}${n.done.length > 160 ? "…" : ""}` : "  验收记录：无");
  console.log(`  前置（${model.pred[id].length}）：`);
  for (const e of model.pred[id]) console.log(`    ← ${nodeLine(model, e.a)}  [${e.kind === "doc" ? `确认·${GATE[e.gate]}` : e.tag}${e.cross ? " · 跨路线" : ""}]${e.kind === "doc" ? "" : `  缺：${e.missing}`}`);
  console.log(`  后继（${model.consumers(id).length}）：`);
  for (const e of model.consumers(id)) console.log(`    → ${nodeLine(model, e.b)}  [${e.kind === "doc" ? `确认·${GATE[e.gate]}` : e.tag}]`);
  const roll = model.rolledInto(id); if (roll.length) console.log(`  另计入汇总验收：${roll.join("、")}`);
};
commands.impact = async ([id]) => {
  const { w, d } = await load(); const before = build(w, d);
  if (!before.model.byId[id]) die(`没有这个工作项：${id}`);
  const sim = J(d); sim.accept[id] = { date: today(), evidence: "（模拟）@0000000000" };
  const after = build(w, { ...sim, base: d.base });
  const changes = diffStates(before, after);
  console.log(`如果 ${id} 验收：${changes.length ? "\n" + changes.join("\n") : "没有工作项的状态会变化。"}`);
  const down = [...before.model.down(id)];
  console.log(`全部间接后继（${down.length}，不含汇总验收）：${down.map((x) => `${x}`).join("、") || "—"}`);
};

/* ---------------------------------------------------------------- edge */
commands.edge = async ([op, ...rest], flags) => {
  const dry = !!flags["dry-run"];
  if (op === "add") {
    const [from, to] = rest; if (!from || !to) die("edge add FROM TO …");
    await mutate((d) => {
      nodeOf(d, from); nodeOf(d, to);
      if (findRow(d, from, to) >= 0) die(`${from} → ${to} 已经存在；用 edge set 修改`);
      const why = needWhy(flags), entry = latest(d, flags);
      const row = { to, from };
      if (flags.tag || flags.missing) {
        if (!flags.tag || !flags.missing) die("待确认 / 推断的关系需要 --tag 与 --missing 一起给");
        Object.assign(row, { tag: String(flags.tag), missing: String(flags.missing) });
      } else {
        if (!["start", "accept"].includes(flags.gate)) die("确认的关系需要 --gate start|accept");
        if (typeof flags.need !== "string" || typeof flags.ev !== "string") die("确认的关系需要 --need（用到前置的什么）与 --ev（文件::符号 @提交）");
        if (!SHA.test(flags.ev)) die("--ev 要含固定提交，例如 …@97963e831");
        Object.assign(row, { gate: flags.gate, need: flags.need, ev: flags.ev });
      }
      d.edges.push(row);
      logEdge(entry, "edgesAdded", from, to, why);
      return [`新增依赖 ${from} → ${to}`];
    }, { dry });
  } else if (op === "rm") {
    const [from, to] = rest; if (!from || !to) die("edge rm FROM TO --why …");
    await mutate((d) => {
      const i = findRow(d, from, to); if (i < 0) die(`${from} → ${to} 不存在`);
      const why = needWhy(flags), entry = latest(d, flags);
      d.edges.splice(i, 1);
      logEdge(entry, "edgesRemoved", from, to, why);
      return [`移除依赖 ${from} → ${to}`];
    }, { dry });
  } else if (op === "set") {
    const [from, to] = rest; if (!from || !to) die("edge set FROM TO …");
    await mutate((d) => {
      const i = findRow(d, from, to); if (i < 0) die(`${from} → ${to} 不存在`);
      const why = needWhy(flags), entry = latest(d, flags);
      const row = d.edges[i];
      const wasConfirmed = !row.missing;
      const toUnconfirmed = flags.tag || flags.missing, toConfirmed = flags.gate;
      if (toUnconfirmed && toConfirmed) die("不能同时给 --gate 和 --tag/--missing");
      if (toUnconfirmed) {
        const tag = flags.tag || row.tag, missing = flags.missing || row.missing;
        if (!tag || !missing || tag === true || missing === true) die("降级为推断 / 待确认需要 --tag 与 --missing");
        for (const k of ["gate", "need", "ev"]) delete row[k];
        Object.assign(row, { tag, missing });
      } else {
        const gate = flags.gate || row.gate, need = flags.need || row.need, ev = flags.ev || row.ev;
        if (!["start", "accept"].includes(gate)) die("--gate 只能是 start 或 accept");
        if (typeof need !== "string" || typeof ev !== "string") die("确认的关系需要 --need 与 --ev");
        if (!SHA.test(ev)) die("--ev 要含固定提交，例如 …@97963e831");
        for (const k of ["tag", "missing"]) delete row[k];
        Object.assign(row, { gate, need, ev });
      }
      const addedHere = (entry.edgesAdded || []).some((x) => x.a === from && x.b === to);
      if (!addedHere) {
        const same = (x) => x.a === from && x.b === to;
        entry.edgesChanged = (entry.edgesChanged || []).filter((x) => !same(x));
        entry.edgesChanged.push({ a: from, b: to, why });
      }
      return [`修改依赖 ${from} → ${to}（${wasConfirmed ? "确认" : "未确认"} → ${row.missing ? row.tag : "确认·" + GATE[row.gate]}）`];
    }, { dry });
  } else if (op === "swap") {
    const [oldId, newId] = rest; if (!oldId || !newId) die("edge swap OLD NEW [--for A,B] --why …");
    await mutate((d) => {
      nodeOf(d, newId);
      const why = needWhy(flags), entry = latest(d, flags), only = list(flags.for);
      const rows = d.edges.filter((r) => r.from === oldId && (!only.length || only.includes(r.to)));
      if (!rows.length) die(`没有以 ${oldId} 为前置的依赖${only.length ? `（限定 ${only.join("、")}）` : ""}`);
      const msgs = [];
      for (const r of rows) {
        const dup = findRow(d, newId, r.to);
        logEdge(entry, "edgesRemoved", oldId, r.to, why);
        if (dup >= 0) { d.edges.splice(d.edges.indexOf(r), 1); msgs.push(`${r.to}：已有 ${newId} → ${r.to}，直接去掉 ${oldId} → ${r.to}`); continue; }
        r.from = newId;
        logEdge(entry, "edgesAdded", newId, r.to, why);
        msgs.push(`${r.to}：前置 ${oldId} → ${newId}（沿用原来的 need / ev，请核对是否仍然成立）`);
      }
      return msgs;
    }, { dry });
  } else die("edge 的用法：add | rm | set | swap（plan.mjs help）");
};

/* ---------------------------------------------------------------- rev / log */
commands.rev = async ([reason], flags) => {
  if (!reason) die("rev \"这次调整的原因\"");
  await mutate((d) => {
    const last = d.history.at(-1);
    d.history.push({ revision: last.revision + 1, date: today(), reason });
    return [`新版本 r${last.revision + 1}（${today()}）`];
  }, { dry: !!flags["dry-run"] });
};
commands.log = async ([kind, ...rest], flags) => {
  await mutate((d) => {
    const why = needWhy(flags), entry = latest(d, flags);
    if (kind === "split") { const [from, to] = rest; if (!from || !list(to).length) die("log split FROM TO1,TO2 --why …"); (entry.splits ??= []).push({ from, to: list(to), why }); }
    else if (kind === "replaced") { const [from, to] = rest; if (!from || !to) die("log replaced FROM TO --why …"); (entry.replaced ??= []).push({ from, to, why }); }
    else if (kind === "removed") { const [id] = rest; if (!id) die("log removed ID --why …"); (entry.removed ??= []).push({ id, why }); }
    else if (kind === "added") { const [id] = rest; if (!id) die("log added ID --why …"); (entry.added ??= []).push({ id, why }); }
    else die("log 的种类：split | replaced | removed | added");
    return [`已记入 r${entry.revision}：${kind} ${rest.join(" ")}`];
  }, { dry: !!flags["dry-run"] });
};

/* ---------------------------------------------------------------- accept */
commands.accept = async ([id], flags) => {
  if (!id) die("accept ID --evidence \"…@<提交>\"");
  await mutate((d, before, w) => {
    nodeOf(d, id);
    const evidence = typeof flags.evidence === "string" ? flags.evidence.trim() : "";
    if (!evidence) die("需要 --evidence：核对了什么、对照哪个固定提交（…@<sha>）、剩余可信边界");
    if (!SHA.test(evidence)) die("--evidence 要含固定提交，例如 …@97963e831");
    const date = typeof flags.date === "string" ? flags.date : today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die("--date 格式 YYYY-MM-DD");
    const n = before.model.byId[id], msgs = [];
    const open = before.model.openPrs(id);
    if (open.length) msgs.push(`注意：#${open.join("、#")} 仍是开放 PR；验收的是已合入 main 的交付，请确认。`);
    const unmet = before.model.blockers(id);
    if (unmet.length) msgs.push(`注意：还有 ${unmet.length} 项确认的前置未验收：${unmet.map((e) => e.a).join("、")}。`);
    d.accept[id] = { date, evidence };
    msgs.unshift(`${id} 记为已验收（${date}）`);
    return msgs;
  }, { dry: !!flags["dry-run"] });
};
commands.unaccept = async ([id], flags) => {
  await mutate((d) => { if (!d.accept[id]) die(`${id} 没有验收记录`); delete d.accept[id]; return [`已撤销 ${id} 的验收记录`]; }, { dry: !!flags["dry-run"] });
};

/* ---------------------------------------------------------------- pr */
const catalogEntry = (d, n) => d.catalog.find((p) => p.n === n);
commands.pr = async ([op, ...rest], flags) => {
  const dry = !!flags["dry-run"];
  await mutate((d, before, w) => {
    const snap = snapPrs(w);
    const known = (ids) => ids.forEach((x) => nodeOf(d, x));
    if (op === "add") {
      const n = prNum(rest[0]); if (catalogEntry(d, n)) die(`#${n} 已在目录里；用 pr set / pr link`);
      if (typeof flags.scope !== "string") die("pr add N --scope \"它覆盖什么\"");
      const impl = list(flags.implements), reuse = list(flags.reuses); known([...impl, ...reuse]);
      const p = snap.get(n);
      d.catalog.push({ n, scope: flags.scope, implements: impl, reuses: reuse, note: typeof flags.note === "string" ? flags.note : "", ...(p ? { reviewedHead: p.head, reviewedAt: today() } : {}) });
      return [`#${n} 已加入目录${p ? `（reviewedHead = 快照里的 ${p.head.slice(0, 10)}）` : "（快照里还没有它；运行 plan.mjs sync 后再 pr review）"}`];
    }
    const n = prNum(rest[0]); const e = catalogEntry(d, n) || die(`#${n} 不在目录里：先 pr add`);
    if (op === "set") {
      for (const k of ["scope", "note"]) if (typeof flags[k] === "string") e[k] = flags[k];
      if (flags.implements !== undefined) { e.implements = list(flags.implements); known(e.implements); }
      if (flags.reuses !== undefined) { e.reuses = list(flags.reuses); known(e.reuses); }
      return [`#${n} 已更新`];
    }
    if (op === "link" || op === "unlink") {
      const id = rest[1]; if (!id) die(`pr ${op} N ID [--reuse]`); nodeOf(d, id);
      const key = flags.reuse ? "reuses" : "implements";
      e[key] ??= [];
      if (op === "link") { if (!e[key].includes(id)) e[key].push(id); }
      else e[key] = e[key].filter((x) => x !== id);
      return [`#${n} ${op === "link" ? "关联" : "取消关联"} ${id}（${key === "reuses" ? "复用 / 协调" : "实施"}）`];
    }
    if (op === "rm") {
      if ((e.implements || []).length || (e.reuses || []).length) { if (!flags.force) die(`#${n} 还关联着 ${[...(e.implements || []), ...(e.reuses || [])].join("、")}；先 pr unlink，或加 --force`); }
      d.catalog.splice(d.catalog.indexOf(e), 1);
      return [`#${n} 已从目录移除（目录是计划对 PR 的判断记录；已合入 / 已关闭的 PR 建议保留）`];
    }
    if (op === "review") {
      const p = snap.get(n); if (!p) die(`快照里没有 #${n}：先 plan.mjs sync`);
      e.reviewedHead = p.head; e.reviewedAt = today();
      for (const k of ["scope", "note"]) if (typeof flags[k] === "string") e[k] = flags[k];
      return [`#${n} 记为已复核 head ${p.head.slice(0, 10)}（${today()}）。请确认已经按这个 head 核对过 scope / note。`];
    }
    die("pr 的用法：add | set | link | unlink | review | rm（plan.mjs help）");
  }, { dry });
};

/* ---------------------------------------------------------------- todo */
const MUTABLE_STATE = /#(\d+)[^。；;\n]{0,16}?(开放|草稿|需修改|审阅中|CHANGES_REQUESTED|BLOCKED|DIRTY|CLEAN|(?<![A-Za-z])CI(?![A-Za-z]))/g;
commands.todo = async () => {
  const { w, d } = await load(); const { plan, model } = build(w, d);
  const snap = snapPrs(w), snapshot = w.PLAN_PR_SNAPSHOT || {};
  const sections = [];
  const add = (title, lines) => { if (lines.length) sections.push(`## ${title}（${lines.length}）\n${lines.join("\n")}`); };

  /* 1. merged but not accepted */
  const mergedLines = [];
  for (const n of plan.nodes) {
    if (n.done || !n.prs.length) continue;
    const kinds = n.prs.map((x) => snap.get(x)?.kind);
    if (kinds.includes("merged") && !kinds.includes("open")) {
      const sim = J(d); sim.accept[n.id] = { date: today(), evidence: "（模拟）@0000000000" };
      const ch = diffStates({ plan, model }, build(w, { ...sim, base: d.base }));
      mergedLines.push(`  - ${n.id}（${n.title}）：${n.prs.map((x) => `#${x} ${snap.get(x)?.kind === "merged" ? "已合入" : snap.get(x)?.kind || "未知"}`).join("、")}`
        + `\n      核对后记录：plan.mjs accept ${n.id} --evidence "…@<提交>"${ch.length ? `\n      验收后会变化：${ch.map((c) => c.trim().replace("（", " (").replace("）", ")")).slice(0, 4).join("；")}${ch.length > 4 ? ` 等 ${ch.length} 项` : ""}` : ""}`);
    }
  }
  add("PR 已合入、等待你确认验收", mergedLines);

  /* 2. every implementing PR closed without merging */
  add("实施 PR 都已关闭但没有合入", plan.nodes.filter((n) => !n.done && n.prs.length && n.prs.every((x) => snap.get(x)?.kind === "closed"))
    .map((n) => `  - ${n.id}（${n.title}）：${n.prs.map((x) => "#" + x).join("、")}；重新关联新 PR（pr link / pr add）或调整计划`));

  /* 3. accepted work whose implementing PR is open again */
  add("已验收但仍有开放的实施 PR", plan.nodes.filter((n) => n.done && model.openPrs(n.id).length)
    .map((n) => `  - ${n.id}：#${model.openPrs(n.id).join("、#")} 仍开放；确认验收范围是否已被这些 PR 改变`));

  /* 4. head changed since the coverage review */
  add("PR 的 head 已变化，覆盖说明待复核", d.catalog.filter((c) => { const p = snap.get(c.n); return p && p.kind === "open" && p.head && c.reviewedHead && p.head !== c.reviewedHead; })
    .map((c) => `  - #${c.n}：${c.reviewedHead.slice(0, 10)}（${c.reviewedAt}）→ ${snap.get(c.n).head.slice(0, 10)}；核对后：plan.mjs pr review ${c.n}`));

  /* 5. new open PRs */
  add("尚未关联的新开放 PR", (snapshot.candidates || []).map((c) => `  - #${c.n}：${c.title || ""}；纳入：plan.mjs pr add ${c.n} --scope "…" --implements ID；与计划无关：记入 plan-data.js 的 reviewedCandidates`));

  /* 6. prose that states a changing PR state */
  const prose = [];
  for (const n of plan.nodes) for (const [where, text] of [["todo", n.todo.join(" ")], ["accept", n.accept], ...Object.entries(n.deps || {}).map(([k, v]) => [`依赖 ${k}`, v.need || ""])]) {
    for (const m of text.matchAll(MUTABLE_STATE)) prose.push(`  - ${n.id} ${where}：“${m[0]}”`);
  }
  add("文字里写了会变化的 PR 状态（只写编号，状态看快照）", prose);

  /* 7. hand-written document text naming an old head */
  const doc = (await readFile(DOC_PATH, "utf8")).replace(/<!-- BEGIN GENERATED:(\w+) -->[\s\S]*?<!-- END GENERATED:\1 -->/g, "");
  const stale = [];
  for (const line of doc.split("\n")) {
    const mentioned = [...new Set([...line.matchAll(/#(\d+)/g)].map((m) => Number(m[1])))].map((n) => snap.get(n)).filter((p) => p && p.kind === "open");
    if (!mentioned.length) continue;
    const known = mentioned.flatMap((p) => [p.head, catalogEntry(d, p.n)?.reviewedHead || ""]).filter(Boolean);
    for (const h of line.matchAll(/`([0-9a-f]{9,40})`/g)) {
      if (known.some((k) => k.startsWith(h[1]) || h[1].startsWith(k.slice(0, 9)))) continue;
      stale.push(`  - ${mentioned.map((p) => "#" + p.n).join("、")}：文档写 ${h[1]}，快照 head 是 ${mentioned.map((p) => p.head.slice(0, 9)).join(" / ")}：${line.trim().slice(0, 56)}…`);
    }
  }
  add("文档手写部分提到的 head 与快照不符", [...new Set(stale)]);

  /* 8. snapshot age */
  if (snapshot.generatedAt && Date.now() - Date.parse(snapshot.generatedAt) > 48 * 3600 * 1000) add("PR 快照过期", [`  - 生成于 ${snapshot.generatedAt}；运行 plan.mjs sync`]);

  console.log(sections.length ? sections.join("\n\n") : "没有需要处理的事项。");
  console.log(`\n（PR 快照：${snapshot.generatedAt || "无"}；先 plan.mjs sync 可以刷新）`);
};

/* ---------------------------------------------------------------- sync */
commands.sync = async (_, flags) => {
  if (!flags.offline) {
    console.log("刷新 PR 快照…");
    try { execFileSync("node", [`${HERE}update-pr-snapshot.mjs`, path("pr-snapshot")], { stdio: "inherit" }); }
    catch { die("刷新失败（需要 gh 和网络）。快照没有改动；可以用 --offline 只重新生成文档并检查。"); }
  }
  console.log((await syncDocs()) ? "文档生成块已更新。" : "文档生成块已是最新。");
  await commands.check();
  console.log("");
  await commands.todo();
};

/* ---------------------------------------------------------------- main */
const { pos, flags } = parseArgs(process.argv.slice(2));
const [cmd = "help", ...rest] = pos;
if (!commands[cmd]) die(`没有这个命令：${cmd}（plan.mjs help）`);
await commands[cmd](rest, flags);
