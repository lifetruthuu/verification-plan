/* VOSTD verification roadmap page.
 *
 * Three lane views behind tabs (x86 is the default). The main graph shows ONE lane:
 * its own work, its stages (longest chain inside the lane) and the dependencies
 * between them. Work of other lanes appears only as compact stubs that are directly
 * connected to this lane: above the graph what this lane needs first, below it what is
 * unlocked in other lanes. Clicking a stub switches to that lane. The graph, plan
 * status and layout come from plan-model.js / plan-layout.js; the data files are merged by plan-assemble.js (see README.md).
 * Module colours (auxiliary, never plan status) come from the newest dashboard snapshot
 * (the public Pages URL, then PLAN.baseline). All strings
 * enter the DOM as text nodes. */

"use strict";
(function () {
  const P = window.PLAN;
  const M = window.PlanModel.build(P);
  const $ = (q, r = document) => r.querySelector(q);
  const LOCK = P.statuses.filter((x) => x.key !== "unplanned"); // code-line classes shown on bars
  const LKEYS = LOCK.map((x) => x.key);
  const LANE = Object.fromEntries(P.lanes.map((l) => [l.key, l]));
  const DEFAULT_LANE = P.lanes[0].key;
  const nf = new Intl.NumberFormat("en");
  const fmt = (n) => nf.format(n);
  const pct = (n, d) => (d > 0 ? Math.round((100 * n) / d) + "%" : "—");
  const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const prUrl = (n) => `${P.repo}/pull/${n}`;
  const NODE = M.byId;
  const HIDDEN_MODS = /^arch\/(riscv|loongarch)\//;   // not part of the displayed lanes

  const STATE = {
    ready: { name: "前置就绪", short: "可认领", tile: "未关联开放 PR；已确认的前置均已验收，待确认关系另列" },
    waiting: { name: "前置待交付", short: "可先做局部证明", tile: "确认的验收前置未完成；可先做条件证明，尚不能组合验收" },
    active: { name: "PR 进行中", short: "先协调评审", tile: "已有开放 PR：先协调或评审，避免重复" },
    blocked: { name: "开工受阻", short: "缺开工前置", tile: "未关联开放 PR，存在尚未满足的开工前置" },
    done: { name: "已完成", short: "已验收", tile: "达到文档验收口径的工作包；PR 合入、CI 通过、代码行变绿都不算完成（文档 §2）" },
  };
  const STATE_ORDER = window.PlanModel.STATES;

  /* ------------------------------------------------------------------ DOM */
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  function mk(ns, tag, attrs, kids) {
    const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class" && !ns) el.className = v;
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    append(el, kids);
    return el;
  }
  const h = (tag, attrs, ...kids) => mk(null, tag, attrs, kids);
  const s = (tag, attrs, ...kids) => mk("http://www.w3.org/2000/svg", tag, attrs, kids);

  /* status glyphs: a different shape per status, so colour is never the only cue */
  function icon(state) {
    const a = { class: `ico ${state}`, viewBox: "0 0 12 12", "aria-hidden": "true" };
    const line = { fill: "none", stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round", "stroke-linejoin": "round" };
    if (state === "ready") return s("svg", a, s("circle", { cx: 6, cy: 6, r: 5.2, ...line }), s("path", { d: "M4.8 3.7 L8.5 6 L4.8 8.3 Z", fill: "currentColor" }));
    if (state === "waiting") return s("svg", a, s("circle", { cx: 6, cy: 6, r: 5.2, ...line }), s("path", { d: "M6 2.7 V6 L8.6 7.6", ...line }));
    if (state === "active") return s("svg", a, s("circle", { cx: 3, cy: 2.8, r: 1.5, ...line }), s("circle", { cx: 3, cy: 9.2, r: 1.5, ...line }), s("circle", { cx: 9.2, cy: 9.2, r: 1.5, ...line }), s("path", { d: "M3 4.3 V7.7 M9.2 7.7 V5.6 A2.4 2.4 0 0 0 6.8 3.2 H5.4", ...line }));
    if (state === "blocked") return s("svg", a, s("rect", { x: 2.4, y: 5.3, width: 7.2, height: 5.2, rx: 1.2, fill: "currentColor" }), s("path", { d: "M4.1 5.3 V4 A1.9 1.9 0 0 1 7.9 4 V5.3", ...line }));
    return s("svg", a, s("circle", { cx: 6, cy: 6, r: 5.6, fill: "currentColor" }), s("path", { d: "M3.5 6.2 L5.2 7.9 L8.6 4.4", fill: "none", stroke: "#fff", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }

  /* -------------------------------------------------------------- tooltip */
  const tip = $("#tip");
  function placeTip(x, y) {
    const m = 12;
    tip.style.left = `${Math.max(m, Math.min(x + m, window.innerWidth - tip.offsetWidth - m))}px`;
    tip.style.top = `${Math.max(m, Math.min(y + m, window.innerHeight - tip.offsetHeight - m))}px`;
  }
  function tipFor(el, build) {
    const show = (e) => {
      tip.replaceChildren(build());
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      placeTip(e.clientX ?? r.left, e.clientY ?? r.bottom);
    };
    el.addEventListener("pointerenter", show);
    el.addEventListener("pointermove", (e) => placeTip(e.clientX, e.clientY));
    el.addEventListener("pointerleave", () => { tip.hidden = true; });
    el.addEventListener("focus", show);
    el.addEventListener("blur", () => { tip.hidden = true; });
  }

  /* ------------------------------------------------- dashboard (auxiliary) */
  let DATA = null;
  function buildData(live, snap) {
    let mods, meta;
    if (snap) { mods = snap.modules; meta = { date: snap.date, sha: snap.sha }; }
    else {
      const b = P.baseline;
      mods = b.rows.map((r) => Object.fromEntries(b.cols.map((c, i) => [c, r[i]])));
      meta = { date: b.date, sha: b.sha };
    }
    const byKey = {};
    for (const m of mods) {
      const c = { total: m.total };
      for (const k of LKEYS) c[k] = m[k] || 0;
      c.unplanned = m.unplanned || 0;
      byKey[`${m.group}/${m.child}`] = c;
    }
    return { live, meta, byKey };
  }
  function sumMods(keys) {
    const o = { total: 0 };
    for (const k of LKEYS) o[k] = 0;
    for (const key of keys) {
      const c = DATA.byKey[key];
      if (!c) continue;
      o.total += c.total;
      for (const k of LKEYS) o[k] += c[k];
    }
    return o;
  }
  function statTip(title, c) {
    const total = LKEYS.reduce((a, k) => a + (c[k] || 0), 0);
    const box = h("div", null, h("strong", null, title));
    for (const st of LOCK) {
      box.append(h("div", { class: "trow" },
        h("span", { class: "sw", style: `background:var(${st.cssVar})` }), h("span", null, `${st.glyph} ${st.name}`),
        h("b", null, fmt(c[st.key] || 0)), h("span", { class: "share" }, pct(c[st.key] || 0, total))));
    }
    box.append(h("div", { class: "tl" }, "代码行统计，不是计划进度"));
    return box;
  }
  function sbar(c, label, cls = "") {
    const total = LKEYS.reduce((a, k) => a + (c[k] || 0), 0);
    const el = h("div", { class: "sbar " + cls, role: "img",
      "aria-label": `代码行验证分布（辅助信息）${label}：${LOCK.map((x) => `${x.name} ${fmt(c[x.key] || 0)} 行`).join("，")}` });
    for (const st of LOCK) if (c[st.key]) el.append(h("span", { class: "seg", style: `flex-grow:${c[st.key]};background:var(${st.cssVar})` }));
    if (!total) el.classList.add("empty");
    tipFor(el, () => statTip(label, c));
    return el;
  }

  /* --------------------------------------------------------- shared pieces */
  const GATE_CLS = { CLEAN: "g-clean", BLOCKED: "g-block", DIRTY: "g-dirty" };
  const prState = (p) => `${p.kind === "merged" ? "已合并" : p.kind === "closed" ? "已关闭" : p.kind === "unknown" ? "状态未知" : p.draft ? "草稿" : "开放"} · 审阅：${p.review} · 合并状态：${p.gate} · CI：${p.ci}`;
  const ROLE_NOTE = { merged: "已合入 main，但计划验收尚未确认", ref: "只是复用 / 协调的 PR，不计入这项工作的进展" };
  /* role: "" = implementing PR (colour = merge gate), "merged" = merged but not accepted, "ref" = reuse / coordination only.
   * cross: the PR belongs to work in another lane (red edge, same language as the cross-lane lines). */
  function prChip(n, { link = true, big = false, role = "", cross = false, note = "", more = [] } = {}) {
    const p = M.prMap.get(n);
    const attrs = { class: `prchip ${p.draft ? "draft" : "open"} ${GATE_CLS[p.gate] || "g-unk"}${role ? " " + role : ""}${cross ? " xl" : ""}${big ? " big" : ""}`,
      title: `${note ? note + "\n" : ""}#${n}${role && ROLE_NOTE[role] ? `（${ROLE_NOTE[role]}）` : ""} · ${prState(p)} · ${p.scope}${more.length ? `\n同组另有：${more.map((x) => "#" + x).join("、")}` : ""}` };
    const text = (role === "ref" ? `参考 #${n}` : `#${n}`) + (more.length ? ` +${more.length}` : "");
    return link ? h("a", { ...attrs, href: prUrl(n), target: "_blank", rel: "noopener" }, text) : h("span", attrs, text);
  }
  /* The PRs behind one work item: implementing PRs (open; merged ones only while the item is not accepted),
   * then open PRs it merely reuses / coordinates with. Closed PRs are history and are not listed. */
  function prRefs(id) {
    const w = NODE[id], out = [];
    for (const x of w.prs) {
      const k = M.prMap.get(x)?.kind;
      if (k === "open") out.push({ n: x, role: "", from: id });
      else if (k === "merged" && !w.done) out.push({ n: x, role: "merged", from: id });
    }
    for (const x of w.reuse) if (M.prMap.get(x)?.kind === "open" && !out.some((o) => o.n === x)) out.push({ n: x, role: "ref", from: id });
    return out;
  }
  const ROLE_RANK = { "": 0, merged: 1, ref: 2 };
  /* PRs behind the prerequisites of `id` that are not accepted yet: what this work is waiting for. */
  function preRefs(id) {
    const seen = new Set(), out = [];
    for (const e of M.blockers(id)) {
      for (const r of prRefs(e.a)) {
        if (seen.has(r.n)) continue;
        seen.add(r.n);
        out.push({ ...r, cross: NODE[e.a].lane !== NODE[id].lane });
      }
    }
    return out.sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || Number(b.cross) - Number(a.cross) || a.n - b.n);
  }
  /* At most `max` chips: implementing / merged PRs one by one, all reuse-only PRs folded into ONE “参考 #a +n” chip,
   * the rest as “+n”. Used where width is tight (cards, stubs). */
  function refChips(refs, { max = 2, ...o } = {}) {
    const items = refs.filter((r) => r.role !== "ref").map((r) => ({ r, more: [] }));
    const soft = refs.filter((r) => r.role === "ref");
    if (soft.length) items.push({ r: soft[0], more: soft.slice(1).map((x) => x.n) });
    const out = items.slice(0, max).map(({ r, more }) => prChip(r.n, { ...o, role: r.role, cross: !!r.cross, more }));
    const hidden = items.slice(max);
    if (hidden.length) out.push(h("span", { class: "gmore", title: hidden.map(({ r, more }) => [r.n, ...more].map((x) => "#" + x).join(" ")).join(" ") }, `+${hidden.reduce((a, x) => a + 1 + x.more.length, 0)}`));
    return out;
  }
  const refNote = (r) => `${NODE[r.from].title}（${LANE[NODE[r.from].lane].name}）`;
  const refChip = (r, o = {}) => prChip(r.n, { role: r.role, cross: r.cross, note: refNote(r), ...o });
  /* How an edge gates its consumer: confirmed start gate / confirmed acceptance gate / unconfirmed. */
  const EDGE_NAME = { start: "确认 · 开工前置", accept: "确认 · 验收前置（局部可先行）", none: "未确认" };
  const edgeName = (e) => (e.kind === "inf" ? e.tag : EDGE_NAME[e.gate]);
  const edgeClass = (e) => `${e.kind}${e.gate === "accept" ? " acc" : ""}`;
  const unlockWord = (u) => (u.kind === "inf" ? `${u.tag}：不计入阻塞`
    : u.accepted ? `本项合同已验收；${u.rest ? `消费者仍缺 ${u.rest} 项确认前置` : "消费者已确认的前置均已满足"}`
    : `${u.immediate ? "本项验收后，它已确认的前置全部满足" : `它另需 ${u.rest} 项前置`}${u.gate === "accept" ? "；目前可先做条件证明" : ""}`);
  const mergedPrs = (id) => NODE[id].prs.filter((x) => M.prMap.get(x)?.kind === "merged");

  /* ------------------------------------------------------------ page state */
  let lane = DEFAULT_LANE;
  let V = M.view(lane);          // the lane on screen
  let G = null;                  // its layout
  let selected = "", hovered = "", spot = "", showLoc = false, hlEdge = null;
  const els = {};                // layout key → element ("ID", "u:ID", "d:ID")
  let edgeEls = [];              // [{a,b,g}]

  /* --------------------------------------------------------------- header */
  function renderHeader() {
    const m = DATA.meta;
    let t = `计划 r${P.revision}（${P.updatedAt}）· 文档复核 ${P.doc.date}（源码 ${P.doc.sha.slice(0, 9)}）· 仪表盘快照 ${m.date.slice(0, 10)}（${m.sha.slice(0, 9)}）`;
    t += DATA.live ? (m.sha === (P.doc.snapshotSha || P.doc.sha) ? " · 与计划使用的仪表盘基线一致" : " · 代码行快照已更新") : " · 离线，使用内置基线";
    const ps = window.PLAN_PR_SNAPSHOT;
    t += ps?.generatedAt ? ` · PR 快照 ${ps.generatedAt.slice(0, 16).replace("T", " ")} UTC` : " · PR 使用历史复核快照";
    if (ps?.candidates?.length) t += ` · ${ps.candidates.length} 个新 PR 尚待关联计划`;
    if (ps?.generatedAt && Date.now() - Date.parse(ps.generatedAt) > 48 * 3600 * 1000) t += " · PR 快照已超过 48 小时，请刷新";
    $("#meta").textContent = t;
  }
  function renderIssues() {
    const box = $("#issues");
    if (!M.issues.length) { box.hidden = true; return; }
    box.hidden = false;
    box.replaceChildren(h("b", null, "路线图数据有问题，下面的图可能不完整："), h("ul", null, M.issues.map((i) => h("li", null, i))));
  }

  /* ------------------------------------------------------------------ tabs */
  function renderTabs() {
    const tab = (l) => {
      const c = M.counts[l.key];
      const on = l.key === lane;
      const pill = (st) => h("span", { class: c[st] ? "" : "z", title: `${STATE[st].name} ${c[st]} 项` }, icon(st), String(c[st]));
      return h("button", { type: "button", role: "tab", id: `tab-${l.key}`, class: `tab${on ? " on" : ""}`, "data-lane": l.key,
        "aria-selected": String(on), "aria-controls": "panel", tabindex: on ? "0" : "-1", title: l.sub,
        onclick: () => setLane(l.key),
        onkeydown: (e) => {
          const i = P.lanes.findIndex((x) => x.key === l.key);
          const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? P.lanes.length - 1 : -1;
          if (to < 0) return;
          e.preventDefault();
          setLane(P.lanes[(to + P.lanes.length) % P.lanes.length].key);
          $(`#tab-${lane}`).focus();
        } },
      h("span", { class: "tname" }, l.name, h("span", { class: "tn" }, `${c.total} 项`)),
      h("span", { class: "tcnt" }, STATE_ORDER.filter((st) => st !== "done" || c.done).map(pill)));
    };
    $("#tabs").replaceChildren(...P.lanes.map(tab));
  }

  /* -------------------------------------------------------------- summary */
  function nodeChip(n, extra) {
    return h("button", { type: "button", class: "nchip", title: `${n.face} · ${n.title}`, onclick: () => select(n.id) },
      icon(M.state[n.id]), n.title, extra || null);
  }
  function laneCounts(ids) {
    const m = {};
    for (const id of ids) m[NODE[id].lane] = (m[NODE[id].lane] || 0) + 1;
    return Object.entries(m).map(([l, n]) => `${LANE[l].name} ${n}`).join("、");
  }
  /* The ready list is limited to two rows so the summary has the same height on every lane;
   * the rest opens in a popover that does not push the page down. */
  function fitChips() {
    const box = $("#summary .readybox .chips");
    if (!box) return;
    const kids = [...box.querySelectorAll(".nchip")];
    box.querySelector(".more")?.remove();
    for (const k of kids) k.classList.remove("off");
    const rows = [...new Set(kids.map((k) => k.offsetTop))].sort((a, b) => a - b);
    if (rows.length <= 2) return;
    const limit = rows[1];
    let keep = kids.filter((k) => k.offsetTop <= limit).length;
    const more = h("button", { type: "button", class: "nchip more", "aria-expanded": "false" });
    box.append(more);
    const apply = () => {
      kids.forEach((k, i) => k.classList.toggle("off", i >= keep));
      more.textContent = `另 ${kids.length - keep} 项 ▾`;
    };
    apply();
    while (keep > 1 && more.offsetTop > limit) { keep--; apply(); }
    const pop = h("div", { class: "chip-pop", hidden: true, role: "dialog", "aria-label": "其余可认领的工作" },
      ready_.slice(keep).map((n) => nodeChip(n, [n.star ? h("span", { class: "starmark", title: n.star }, "★") : null])));
    box.parentElement.append(pop);
    const close = () => { pop.hidden = true; more.setAttribute("aria-expanded", "false"); more.textContent = `另 ${kids.length - keep} 项 ▾`; };
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!pop.hidden) { close(); return; }
      pop.hidden = false;
      more.setAttribute("aria-expanded", "true");
      more.textContent = "收起 ▴";
    });
    pop.addEventListener("click", close);
    closeChipPop = close;
  }
  let ready_ = [], closeChipPop = null;
  document.addEventListener("click", () => closeChipPop?.());
  function lanePrList() {
    const rows = [];
    const openPrs = [...M.prMap.values()].filter((p) => p.kind === "open").sort((a, b) => b.n - a.n);
    const links = (label, nodes) => nodes.length
      ? h("div", { class: "chips" }, h("span", { class: "hint" }, label), nodes.map((n) => nodeChip(n)))
      : null;
    for (const p of openPrs) {
      const implementsHere = V.nodes.filter((n) => n.prs.includes(p.n));
      const reusedHere = V.nodes.filter((n) => n.reuse.includes(p.n));
      if (!implementsHere.length && !reusedHere.length) continue;
      rows.push(h("li", null,
        h("div", { class: "prline" }, prChip(p.n), h("b", null, p.scope || p.title)),
        p.note ? h("div", null, p.note) : null,
        p.needsReview ? h("div", { class: "hint" }, "PR 已更新，覆盖范围待复核") : null,
        links("实施", implementsHere), links("复用或协调", reusedHere)));
    }
    if (!rows.length) return null;
    return h("details", { class: "fold", id: "lane-prs", open: $("#lane-prs")?.open },
      h("summary", null, `本路线关联的开放 PR（${rows.length}）`), h("ul", { class: "lane-pr-list" }, rows));
  }
  function renderSummary() {
    const l = LANE[lane];
    const c = M.counts[lane];
    const tipFull = {
      ready: STATE.ready.tile,
      waiting: STATE.waiting.tile,
      active: `${STATE.active.tile}${c.activeWaiting ? `；其中 ${c.activeWaiting} 项仍有未完成的前置` : ""}`,
      blocked: STATE.blocked.tile,
      done: STATE.done.tile,
    };
    const tile = (st) => h("button", { type: "button", class: `stile ${st}${c[st] ? "" : " zero"}`, "aria-pressed": String(spot === st), "data-spot": st,
      title: `${STATE[st].name}：${tipFull[st]}\n点击只突出这类工作；再点一次取消`,
      onclick: () => { spot = spot === st ? "" : st; applySpot(); syncTiles(); } },
    h("span", { class: "top" }, icon(st), STATE[st].name), h("span", { class: "num" }, String(c[st])), h("span", { class: "sub" }, STATE[st].short));

    ready_ = V.nodes.filter((n) => M.state[n.id] === "ready")
      .sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || M.consumers(b.id).length - M.consumers(a.id).length);
    const edge = (cls, text, tip) => h("span", { class: "li", title: tip || null }, s("svg", { width: 28, height: 10, viewBox: "0 0 28 10", "aria-hidden": "true" }, s("path", { d: "M1 5 H27", class: `lgedge ${cls}` })), text);
    const prdot = (cls, text) => h("span", { class: "li" }, h("span", { class: `prchip ${cls}` }, "#PR"), text);
    const cn = (cls, t, text, tip) => h("span", { class: "li", title: tip }, h("span", { class: `cnt ${cls} cnt-demo` }, t), text);

    const lanePart = (ids) => laneCounts(ids).replace(/、/g, " · ");
    const ext = [
      h("span", { class: "lgt" }, "跨路线"),
      V.upIds.length ? h("span", null, "图顶需要 ", h("b", null, String(V.upIds.length)), ` 项（${lanePart(V.upIds)}）`) : h("span", null, "不需要其他路线的合同"),
      V.downIds.length ? h("span", null, "图底提供给 ", h("b", null, String(V.downIds.length)), ` 项（${lanePart(V.downIds)}）`) : null,
    ];

    $("#summary").replaceChildren(
      h("div", { class: "sumhead" }, h("h2", null, l.name), h("span", { class: "hint", title: l.sub }, l.sub),
        l.note ? h("span", { class: "docnote", title: l.note }, l.note) : null),
      h("div", { class: "sum-top" },
        h("div", { class: "status-tiles" }, STATE_ORDER.map(tile)),
        h("div", { class: "readybox" },
          h("h2", null, "可认领的工作", h("span", { class: "hint" },
            ready_.length ? `${ready_.length} 项 · 前置已就绪、未关联开放 PR${ready_.some((n) => n.star) ? " · ★ 文档点名的下一步" : ""}` : "本路线暂无")),
          ready_.length
            ? h("div", { class: "chips" }, ready_.map((n) => nodeChip(n, [n.star ? h("span", { class: "starmark", title: n.star }, "★") : null, M.waits(n.id).length ? h("span", { class: "inftag", title: "有推断 / 待确认的前置，不算阻塞" }, "待确认") : null])))
            : h("p", { class: "hint" }, c.active ? `可查看「PR 进行中」的 ${c.active} 项。` : c.waiting || c.blocked ? "其余工作都在等前置，见各工作项详情。" : "本路线工作已验收。"),
          h("div", { class: "extsum" }, ext))),
      lanePrList(),
      h("div", { class: "sum-legend" },
        h("span", { class: "lgt" }, "卡片"),
        cn("up", "↑2", "未完成前置", "还有 2 项已确认的前置未完成，类型见详情"),
        cn("wait", "…1", "待确认关系", "另有 1 项推断 / 待确认的前置，不算阻塞"),
        cn("down", "↓3", "后继", "完成后有 3 项工作少一个前置"),
        h("span", { class: "lgt" }, "PR"),
        prdot("open g-clean", "可合并"), prdot("open g-block", "需修改"), prdot("open g-dirty", "冲突"), prdot("draft g-unk", "草稿"), prdot("open g-unk merged", "已合入未验收"), h("span", { class: "li", title: "只是复用 / 协调的 PR，不计入这项工作的进展" }, h("span", { class: "prchip ref" }, "参考 #PR"), "复用"),
        h("span", { class: "lgt" }, "连线"),
        edge("", "开工前置", "确认的开工前置：没有它后继的证明无法开始（实线）"), edge("acc", "验收前置", "确认的验收前置：后继可先用 requires 做局部证明，验收时才需要它（点线）"),
        edge("inf", "待确认", "推断 / 待确认：缺少证据，不算阻塞（虚线）"), edge("cross", "跨路线", "连接其他路线的依赖（红）"),
        h("span", { class: "spacer" }),
        h("label", { class: "toggle", title: "代码行验证分布来自仪表盘，是模块级的辅助数据：不代表该工作的完成度，同一模块可能被多项工作共享" },
          h("input", { type: "checkbox", checked: showLoc || null, onchange: (e) => { showLoc = e.target.checked; $("#board .board")?.classList.toggle("loc", showLoc); } }),
          "叠加代码行验证分布（辅助）")));
    fitChips();
  }
  function syncTiles() { for (const t of document.querySelectorAll(".stile")) t.setAttribute("aria-pressed", String(t.dataset.spot === spot)); }

  /* ----------------------------------------------------------------- board */
  function cardEl(n, c) {
    const st = M.state[n.id];
    const unmet = M.blockers(n.id).length, wait = M.waits(n.id).length, unl = M.consumers(n.id).filter((e) => e.kind === "doc").length;
    const pre = preRefs(n.id);
    const roll = n.rollup ? { done: M.pred[n.id].filter((e) => NODE[e.a].done).length, total: M.pred[n.id].length } : null;
    const local = !n.done && M.localOk(n.id);
    // PR associations have one source: pr-catalog.js implements. Reuse PRs are not delivery PRs.
    const completedLabel = n.prs.length ? `已验收 · ${n.prs.map((x) => `#${x}`).join("、")}` : "已验收 · 未关联 PR";
    const left = st === "active"
      ? [n.prs.slice(0, 2).map((x) => prChip(x, { link: false })), n.prs.length > 2 ? h("span", { class: "gmore", title: n.prs.slice(2).map((x) => "#" + x).join(" ") }, `+${n.prs.length - 2}`) : null]
      : h("span", { class: `slabel st-${st}`, title: st === "done" ? completedLabel : null }, st === "done" ? completedLabel : STATE[st].name);
    /* One small tag at most, for what the state label cannot say. “局部可先行” is not repeated here: it is what
     * “前置待交付” means, and the hover text and details spell it out. */
    const tag = n.rollup ? h("span", { class: "n-tag", title: "最终验收：前置是逐项交付清单，不画连线；点开看清单与进度" }, "汇总验收")
      : n.milestone ? h("span", { class: "n-tag" }, "里程碑")
      : n.standalone ? h("span", { class: "n-tag", title: "计划没有写出它与其他工作的依赖，不阻塞也不被阻塞" }, "独立") : null;
    const el = h("div", {
      class: `node ${st}${n.milestone ? " milestone" : ""}${pre.length ? " has-pre" : ""}`, role: "button", tabindex: "0", "data-id": n.id, "aria-pressed": "false",
      style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px`,
      title: `${n.title}\n${n.face}\n${STATE[st].name}${unmet ? `，还有 ${unmet} 项已确认的前置未完成${local ? "（都是验收前置，局部证明可先行）" : ""}` : ""}${wait ? `，另有 ${wait} 项推断 / 待确认的前置` : ""}${unl ? `，完成后有 ${unl} 项工作少一个前置` : ""}`,
      "aria-label": `${n.title}。${LANE[n.lane].name}，${n.rollup ? "汇总验收" : `关系层 ${c.stage + 1}`}，模块 ${n.face}。${st === "done" ? completedLabel : STATE[st].name}。${unmet ? `还有 ${unmet} 项已确认的前置未完成：` + M.blockers(n.id).map((e) => NODE[e.a].title).join("、") + "。" : "已确认的前置都已完成。"}${wait ? `另有 ${wait} 项推断或待确认的前置，不算阻塞。` : ""}`,
      onclick: () => select(selected === n.id ? "" : n.id),
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(selected === n.id ? "" : n.id); } },
    },
    h("div", { class: "n-head" }, icon(st), h("span", { class: "n-face" }, n.face), n.star ? h("span", { class: "starmark", title: n.star }, "★") : null, tag),
    h("div", { class: "n-title" }, n.title),
    pre.length ? h("div", { class: "n-pre", title: `这项工作在等这些前置背后的 PR：\n${pre.map((r) => `#${r.n} — ${refNote(r)}${r.role ? `（${ROLE_NOTE[r.role]}）` : ""}`).join("\n")}` },
      h("span", { class: "npl" }, "前置 PR"), refChips(pre, { max: 2, link: false })) : null,
    h("div", { class: "n-foot" }, h("div", { class: "n-left" }, left),
      roll ? h("span", { class: "cnt roll", title: `汇总清单 ${roll.total} 项，已验收 ${roll.done} 项；清单见详情` }, `已验收 ${roll.done}/${roll.total}`)
        : unmet ? h("span", { class: "cnt up", title: `还有 ${unmet} 项已确认的前置未完成，类型见详情` }, `↑${unmet}`) : null,
      wait ? h("span", { class: "cnt wait", title: `另有 ${wait} 项推断 / 待确认的前置（不算阻塞）` }, `…${wait}`) : null,
      unl ? h("span", { class: "cnt down", title: `完成后有 ${unl} 项工作少一个前置` }, `↓${unl}`) : null),
    n.mods.length ? h("div", { class: "n-loc" }, sbar(sumMods(n.mods), n.face, "thin")) : null);
    el.addEventListener("pointerenter", () => { hovered = n.id; applyHighlight(); });
    el.addEventListener("pointerleave", () => { hovered = ""; applyHighlight(); });
    el.addEventListener("focus", () => { hovered = n.id; applyHighlight(); });
    el.addEventListener("blur", () => { hovered = ""; applyHighlight(); });
    return el;
  }

  /* A work item of another lane that is directly connected to this lane. */
  function stubEl(n, c) {
    const st = M.state[n.id];
    const up = c.kind === "up";
    const refs = prRefs(n.id);
    const go = () => select(n.id);
    const el = h("div", {
      class: `stub dir-${c.kind}`, role: "button", tabindex: "0", "data-id": n.id,
      style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px`,
      title: `${n.title}\n${LANE[n.lane].name} · ${STATE[st].name}${refs.length ? `\nPR：${refs.map((r) => `#${r.n}${r.role ? `（${r.role === "ref" ? "参考" : "已合入未验收"}）` : ""}`).join("、")}` : ""}\n点击切换到「${LANE[n.lane].name}」路线查看`,
      "aria-label": `${up ? "来自其他路线的前置关系" : "向其他路线提供接口"}：${LANE[n.lane].name}的${n.title}，${STATE[st].name}${refs.length ? `，相关 PR ${refs.map((r) => "#" + r.n).join("、")}` : ""}。按回车切换到该路线。`,
      onclick: go,
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } },
    }, h("div", { class: "s-head" }, icon(st), h("span", { class: "s-lane" }, LANE[n.lane].name), h("span", { class: "s-go", "aria-hidden": "true" }, "↗")),
    h("div", { class: "s-title" }, n.title),
    h("div", { class: "s-foot" }, h("span", { class: `slabel st-${st}` }, STATE[st].name),
      refChips(refs, { max: 2, link: false })));
    el.addEventListener("pointerenter", () => { hovered = n.id; applyHighlight(); });
    el.addEventListener("pointerleave", () => { hovered = ""; applyHighlight(); });
    el.addEventListener("focus", () => { hovered = n.id; applyHighlight(); });
    el.addEventListener("blur", () => { hovered = ""; applyHighlight(); });
    return el;
  }

  /* “含 N 个 PR” under a stub band label: distinct open PRs implementing the listed work. */
  function prCount(ids) {
    const open = new Set(ids.flatMap((id) => NODE[id].prs.filter((x) => M.prMap.get(x)?.kind === "open")));
    return open.size ? h("span", { class: "pc" }, `含 ${open.size} 个开放 PR`) : null;
  }
  function renderBoard() {
    const wrap = $("#boardwrap");
    G = window.PlanLayout.layout(M, V, { width: Math.floor(wrap.clientWidth) });
    const board = h("div", { class: "board" + (showLoc ? " loc" : ""), style: `width:${G.width}px;height:${G.height}px`,
      onclick: (e) => { if (e.target === board || e.target.classList.contains("lanepanel") || e.target.classList.contains("bandtint")) select(""); } });

    board.append(h("div", { class: "lanepanel", style: `left:${G.panel.x}px;width:${G.panel.w}px;top:${G.panel.top}px;height:${G.panel.bottom - G.panel.top}px` }));
    const rowY = {};
    for (const c of Object.values(G.cards)) rowY[c.row] = c.y;
    G.bands.forEach((b, i) => {
      const ext = b.type === "up" || b.type === "down";
      if (ext || b.stage % 2 === 1) board.append(h("div", { class: `bandtint${ext ? " ext" : ""}`, style: `top:${b.top}px;height:${b.bottom - b.top}px;width:${G.width}px` }));
      if (i > 0) board.append(h("div", { class: "bandline", style: `top:${b.top}px;width:${G.width}px` }));
      const y = rowY[b.firstRow] ?? b.top + 8;
      const label = b.type === "up"
        ? h("div", { class: "stagelabel ext", style: `top:${y}px`, title: "本路线的工作需要用到这些其他路线工作的接口。只列直接相关的；点击卡片切换到对应路线。" },
          h("b", null, "来自其他路线的前置"), h("span", null, `${b.count} 项`), prCount(V.upIds))
        : b.type === "rollup"
          ? h("div", { class: "stagelabel", style: `top:${y}px`, title: "最终验收的前置是逐项交付清单，不是接口依赖：不画连线，也不规定先后。点卡片查看清单与进度。" },
            h("b", null, "汇总验收"), h("span", null, "清单见详情"))
        : b.type === "down"
          ? h("div", { class: "stagelabel ext", style: `top:${y}px`, title: "这些其他路线的工作需要用到本路线工作的接口。只列直接相关的；点击卡片切换到对应路线。" },
            h("b", null, "向其他路线提供接口"), h("span", null, `${b.count} 项`), prCount(V.downIds))
          : h("div", { class: "stagelabel", style: `top:${y}px`, title: "关系层仅用于摆放确认/待确认关系，不代表排期。验收前置两侧可并行开展局部证明；跨路线合同另见图顶。" },
            h("b", null, `关系层 ${b.stage + 1}`), b.stage === 0 ? h("span", null, "本路线内无前置") : null, h("span", null, `${b.count} 项`));
      board.append(label);
    });

    const svg = s("svg", { class: "edges", width: G.width, height: G.height, "aria-hidden": "true" });
    edgeEls = [];
    for (const r of [...G.routes].sort((p, q) => Number(p.cross) - Number(q.cross))) {
      const [tx, ty] = r.tip;
      const g = s("g", { class: `edge ${edgeClass(r)}${r.cross ? " cross" : ""}` },
        s("path", { class: "line", d: r.d }), s("polygon", { points: `${tx},${ty} ${tx - 4.2},${ty - 7.5} ${tx + 4.2},${ty - 7.5}` }), s("path", { class: "hit", d: r.d }));
      const label = () => h("div", null, h("strong", null, `${NODE[r.a].title} → ${NODE[r.b].title}`),
        h("div", { class: "tl" }, `${edgeName(r)}${r.cross ? ` · 跨路线：${LANE[NODE[r.a].lane].name} → ${LANE[NODE[r.b].lane].name}` : ""}`),
        r.need ? h("div", { class: "tw" }, "要用到：", r.need) : null,
        prRefs(r.a).length ? h("div", { class: "tw" }, "前置的 PR：", prRefs(r.a).map((x) => `#${x.n}${x.role ? `（${x.role === "ref" ? "参考" : "已合入未验收"}）` : ""}`).join("、")) : null,
        r.kind === "inf" && r.missing ? h("div", { class: "tw" }, "缺：", r.missing) : null);
      g.addEventListener("pointerenter", (e) => { hlEdge = { a: r.a, b: r.b }; applyHighlight(); tip.replaceChildren(label()); tip.hidden = false; placeTip(e.clientX, e.clientY); });
      g.addEventListener("pointermove", (e) => placeTip(e.clientX, e.clientY));
      g.addEventListener("pointerleave", () => { hlEdge = null; applyHighlight(); tip.hidden = true; });
      svg.append(g);
      edgeEls.push({ a: r.a, b: r.b, g });
    }
    board.append(svg);
    for (const k of Object.keys(els)) delete els[k];
    for (const c of Object.values(G.cards)) {
      const el = c.kind === "node" ? cardEl(NODE[c.id], c) : stubEl(NODE[c.id], c);
      els[c.key] = el;
      board.append(el);
    }

    $("#board").replaceChildren(board);
    applyHighlight();
    applySpot();
  }

  function applySpot() {
    const board = $("#board .board");
    if (!board) return;
    board.classList.toggle("spot", !!spot);
    for (const el of Object.values(els)) el.classList.toggle("nospot", !!spot && M.state[el.dataset.id] !== spot);
  }

  /* Highlight follows the hovered/selected work item across the WHOLE dependency graph
   * (so a chain that leaves the lane is still marked on the stubs), and is recomputed
   * whenever the view changes. */
  function applyHighlight() {
    const board = $("#board .board");
    if (!board) return;
    const f = hlEdge ? "" : hovered || selected;
    const up = f ? M.up(f) : new Set(), down = f ? M.down(f) : new Set();
    board.classList.toggle("focus", !!f || !!hlEdge);
    for (const el of Object.values(els)) {
      const id = el.dataset.id;
      el.classList.toggle("sel", id === selected && el.classList.contains("node"));
      el.classList.toggle("cur", id === f || (!!hlEdge && (id === hlEdge.a || id === hlEdge.b)));
      el.classList.toggle("up", up.has(id));
      el.classList.toggle("down", down.has(id));
      if (el.classList.contains("node")) el.setAttribute("aria-pressed", String(id === selected));
    }
    for (const e of edgeEls) {
      e.g.classList.toggle("up", !!f && (e.b === f || up.has(e.b)));
      e.g.classList.toggle("down", !!f && (e.a === f || down.has(e.a)));
      e.g.classList.toggle("hl", !!hlEdge && e.a === hlEdge.a && e.b === hlEdge.b);
    }
  }

  /* ------------------------------------------------------------------ dock */
  const dock = $("#dock");
  function section(title, ...kids) { return h("section", { class: "dsec" }, h("h4", null, title), ...kids); }
  function depBtn(id, extras, why) {
    const n = NODE[id];
    const other = n.lane !== lane;
    return h("li", null, h("button", { type: "button", class: "dep", title: other ? `切换到「${LANE[n.lane].name}」路线查看` : null, onclick: () => select(id) },
      icon(M.state[id]), h("span", { class: "dn" }, n.title),
      h("span", { class: "dm" }, h("span", null, `${LANE[n.lane].name} · ${STATE[M.state[id]].name}`), other ? h("span", { class: "cx" }, "其他路线 ↗") : null,
        prRefs(id).map((r) => prChip(r.n, { link: false, role: r.role })), extras)), why || null);
  }
  /* The reason an edge exists: what the consumer needs, where that was checked; for an
   * unconfirmed edge, which evidence is missing. */
  function edgeWhy(e) {
    const merged = mergedPrs(e.a);
    return h("div", { class: `depwhy ${e.kind}` },
      e.need ? h("div", null, h("b", null, "要用到："), e.need) : null,
      e.kind === "doc" && e.ev ? h("div", { class: "ev" }, h("b", null, "依据："), e.ev) : null,
      e.kind === "doc" && NODE[e.a].done ? h("div", { class: "ev" }, h("b", null, "前置验收记录："), NODE[e.a].done) : null,
      e.kind === "inf" && e.missing ? h("div", null, h("b", null, "缺少证据："), e.missing) : null,
      merged.length && !NODE[e.a].done ? h("div", { class: "ev" }, `前置的 ${merged.map((x) => "#" + x).join("、")} 已合入，但计划验收尚未确认。`) : null);
  }
  function renderDock(id) {
    const n = NODE[id], st = M.state[id];
    const blk = M.blockers(id), start = M.startBlockers(id), wt = M.waits(id);
    const c = sumMods(n.mods);
    const col1 = h("div", { class: "dcol" },
      h("div", { class: "dlane" }, h("span", { class: "lt" }, LANE[n.lane].name), h("span", null, n.rollup ? "汇总验收" : `关系层 ${V.stage[id] + 1}`), h("span", { class: "mn" }, n.face), n.star ? h("span", { class: "starmark" }, "★") : null),
      h("h3", null, n.title),
      h("div", { class: `dstate ${st}` },
        h("b", null, icon(st), STATE[st].name),
        n.rollup && (st === "ready" || st === "waiting" || st === "blocked") ? h("span", null, `汇总清单 ${M.pred[id].length} 项，已验收 ${M.pred[id].filter((e) => NODE[e.a].done).length} 项；逐项核对见右侧「汇总清单」。这是最终覆盖验收，不规定先后。`) : null,
        !n.rollup && st === "ready" ? h("span", null, `未关联开放 PR；已确认的前置均有显式验收记录，或本项无确认前置。${wt.length ? `另有 ${wt.length} 项待确认关系，不构成确定阻塞。` : ""}`) : null,
        !n.rollup && st === "waiting" ? h("span", null, `等待 ${blk.length} 项验收前置交付：${blk.map((e) => NODE[e.a].title).join("、")}。可先写明 requires 开展局部证明，组合验收须补齐这些合同的来源。${wt.length ? `另有 ${wt.length} 项待确认关系。` : ""}`) : null,
        st === "active" ? h("span", null, `已有 ${M.openPrs(id).length} 个开放 PR。${start.length ? `开工前置仍未交付：${start.map((e) => NODE[e.a].title).join("、")}。` : ""}${M.acceptanceWaits(id).length ? `验收前置仍未交付：${M.acceptanceWaits(id).map((e) => NODE[e.a].title).join("、")}。` : ""}${!blk.length ? "已确认的前置均已满足。" : "开放 PR 不表示前置已满足。"}${wt.length ? `另有 ${wt.length} 项待确认关系。` : ""}`) : null,
        st === "active" ? h("div", { class: "prs" }, M.openPrs(id).map((x) => prChip(x, { big: true }))) : null,
        !n.rollup && st === "blocked" ? h("span", null, `开工前置尚未满足：${start.map((e) => NODE[e.a].title).join("、")}。${M.acceptanceWaits(id).length ? `另有 ${M.acceptanceWaits(id).length} 项验收前置待完成。` : ""}${wt.length ? `另有 ${wt.length} 项推断 / 待确认关系，不算阻塞。` : ""}`) : null,
        st === "done" ? h("div", { class: "prs" },
          h("span", null, "关联实施 PR："),
          n.prs.length ? n.prs.map((x) => prChip(x, { big: true })) : h("span", { class: "hint" }, "未关联 PR")) : null,
        st === "done" ? h("span", null, `验收依据：${n.done}`) : null),
      n.star ? h("p", { class: "starnote" }, "★ ", n.star) : null,
      ...M.prBlockers(id).map(b => h("p", { class: "hint" }, `#${b.pr}：${b.reason}`)),
      h("span", { class: "src" }, `计划说明复核 ${P.doc.date} · 文档出处 ${n.src}`));

    const col2 = h("div", { class: "dcol" },
      n.todo.length ? section("要做什么", h("ul", { class: "todo" }, n.todo.map((t) => h("li", null, t)))) : null,
      n.accept ? section(n.todo.length ? "验收 / 限定" : "说明", h("p", { class: "acc" }, n.accept), h("p", { class: "hint" }, P.acceptanceRule)) : null,
      n.cmd ? section("验证命令", h("code", { class: "cmd" }, n.cmd)) : null);

    const gateTag = (e) => h("span", { class: `etag ${e.kind === "inf" ? "inf" : e.gate}`, title: e.kind === "inf" ? "尚未确认的关系：不算阻塞，也不使工作显示为受阻" : e.gate === "accept" ? "仅限制最终验收；后继可先用 requires 写明接口前提并开展局部证明" : "没有它，后继工作的证明无法开始" }, edgeName(e));
    const preList = M.pred[id].map((e) => depBtn(e.a, [gateTag(e), e.kind === "doc" ? h("span", { class: NODE[e.a].done ? "ok" : "" }, NODE[e.a].done ? "已验收交付" : "尚未验收交付") : null],
      n.rollup ? h("details", { class: "why-fold" }, h("summary", null, "查看依据"), edgeWhy(e)) : edgeWhy(e)));
    const un = M.unlocks(id);
    const col3 = h("div", { class: "dcol" },
      section(n.rollup ? `汇总清单 · ${M.pred[id].length}（已验收 ${M.pred[id].filter((e) => NODE[e.a].done).length}）` : `前置 · ${M.pred[id].length}`,
        preRefs(id).length ? h("p", { class: "hint prline" }, "未完成前置涉及的 PR：", preRefs(id).map((r) => refChip(r, { note: "" }))) : null,
        preList.length ? h("ul", { class: "deplist" }, preList) : h("p", { class: "muted" }, "没有前置。"),
        preList.length ? h("p", { class: "hint" }, n.rollup ? "清单是逐项交付与可信边界记录，不是接口依赖；主图不画这些连线，也不规定先后。"
          : "依赖表示“要用到对方的接口、规格、资源或状态”：共用模块、存在调用关系或运行时初始化顺序都不算。不规定 PR 合并顺序。") : null),
      section(`做完后影响 · ${un.length}`, un.length ? h("ul", { class: "deplist" }, un.map((u) => depBtn(u.id, [
        h("span", { class: u.immediate ? "ok" : "" }, unlockWord(u)),
        u.kind === "inf" ? h("span", { class: "etag inf" }, u.tag) : null]))) : h("p", { class: "muted" }, "没有其他工作直接依赖它。"),
        M.rolledInto(id).length ? h("p", { class: "hint" }, "另计入汇总验收：", h("span", { class: "chips inline" }, M.rolledInto(id).map((x) => nodeChip(NODE[x])))) : null));

    const total = LKEYS.reduce((a, k) => a + c[k], 0);
    const rel = (list) => list.map((x) => {
      const p = M.prMap.get(x);
      return h("li", null, prChip(x), h("span", { class: "pstate" }, prState(p)), h("span", { class: "pscope" }, clip(p.scope || p.title || "", 90)), p.needsReview ? h("span", { class: "hint" }, "head 已变化，计划覆盖说明待复核") : null);
    });
    const col4 = h("div", { class: "dcol" },
      n.prs.length || n.reuse.length ? section("相关 PR",
        n.prs.length ? h("p", { class: "hint" }, "做这项工作的 PR") : null, n.prs.length ? h("ul", { class: "prl" }, rel(n.prs)) : null,
        n.reuse.length ? h("p", { class: "hint" }, "复用 / 需要协调（不计入进展）") : null, n.reuse.length ? h("ul", { class: "prl" }, rel(n.reuse)) : null,
        h("p", { class: "hint" }, "CLEAN 可合并，BLOCKED 需修改或门禁未过，DIRTY 有冲突，UNKNOWN 未知；来自 PR 快照；覆盖说明是历史复核，不替代当前 head 的语义审阅。")) : null,
      n.mods.length ? section("模块标签", h("div", { class: "modtags" }, n.mods.map((m) => h("span", { class: "modtag" }, m)))) : null,
      n.mods.length ? h("div", { class: "locbox" },
        h("h4", null, "代码行验证分布", h("small", null, "仪表盘 · 辅助信息")),
        sbar(c, n.face, "tall"),
        h("p", { class: "hint" }, `模块级合计 ${fmt(total)} 行 · 已验证 ${pct(c.verified_exec, total)}。这是这些模块里的代码行统计，同一模块可能被多项工作共享，不代表这项工作的完成度。`),
        h("ul", { class: "modlist" }, n.mods.map((m) => {
          const mc = DATA.byKey[m];
          return h("li", null, h("span", { class: "mn" }, m), mc ? sbar(mc, m, "thin") : h("span", { class: "muted" }, "仪表盘无此 module"));
        }))) : null);

    dock.replaceChildren(h("button", { type: "button", class: "dclose", "aria-label": "关闭详情", onclick: () => select("") }, "×"),
      h("div", { class: "dgrid" }, col1, col2, col3, col4));
  }

  /* ----------------------------------------------------------------- state */
  function writeHash() {
    const q = new URLSearchParams();
    if (lane !== DEFAULT_LANE) q.set("lane", lane);
    if (selected) q.set("n", selected);
    const hash = q.toString() ? "#" + q.toString() : "";
    if (hash === location.hash || (!hash && !location.hash)) return;
    try { history.replaceState(null, "", hash || location.pathname + location.search); } catch (e) { /* file:// */ }
  }
  function syncDock() {
    if (selected) { renderDock(selected); dock.hidden = false; dock.scrollTop = 0; } else dock.hidden = true;
    document.body.style.paddingBottom = dock.hidden ? "" : `${dock.offsetHeight}px`;
  }
  function reveal(id) {
    const el = els[id];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const lo = 84, hi = window.innerHeight - (dock.hidden ? 0 : dock.offsetHeight) - 14;
    if (r.top < lo || r.bottom > hi) window.scrollBy({ top: r.top - (lo + Math.max(0, (hi - lo - r.height) / 2)), behavior: "smooth" });
  }

  /* Switch the lane on screen. Everything that depends on the lane is recomputed:
   * the tab counts, the status tiles and start list, the graph with its stubs, and the
   * highlight. The state spotlight stays on and applies to the new lane. A selection
   * that belongs to another lane is dropped, unless it is what we are switching to. */
  function setLane(key, pick = "") {
    if (!LANE[key]) return;
    const changed = key !== lane;
    lane = key;
    V = M.view(key);
    hovered = ""; hlEdge = null; tip.hidden = true;
    selected = pick && V.inLane.has(pick) ? pick : V.inLane.has(selected) ? selected : "";
    renderTabs(); renderSummary(); renderBoard(); syncDock(); writeHash();
    if (changed && !pick) {
      const top = $("#tabs").getBoundingClientRect().top + window.scrollY - 8;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "auto" });
    }
    if (selected) reveal(selected);
  }
  function select(id) {
    if (id && !V.inLane.has(id)) { setLane(NODE[id].lane, id); return; }   // work of another lane: go there
    selected = id;
    syncDock();
    applyHighlight();
    writeHash();
    if (id) reveal(id);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { tip.hidden = true; closeChipPop?.(); if (selected) select(""); } });

  /* ------------------------------------------------------------------ rest */
  function renderRest() {
    const claimed = new Set(M.nodes.flatMap((n) => n.mods));
    const rest = Object.keys(DATA.byKey).filter((k) => !claimed.has(k) && !HIDDEN_MODS.test(k) && DATA.byKey[k].total > 0 && DATA.byKey[k].unplanned < DATA.byKey[k].total)
      .sort((a, b) => DATA.byKey[b].total - DATA.byKey[a].total);
    $("#restmods").replaceChildren(
      h("h2", null, "图中没有单独列出的 module"),
      h("p", { class: "hint" }, "这些 module 要么已基本验证，要么文档没有给出具体顺序（如 task/scheduler、cpu/set 等），所以没有对应的工作项。它们不在依赖图里，不代表不需要验证。色条是仪表盘的代码行验证分布，不是计划进度。"),
      h("details", { class: "fold" }, h("summary", null, `展开 ${rest.length} 个 module 的代码行验证分布`),
        h("div", { class: "mods" }, rest.map((k) => h("div", { class: "mod" }, h("span", { class: "mn" }, k), sbar(DATA.byKey[k], k, "thin"))))));
  }
  /* Work outside the current x86 critical path, and inputs the plan consumes but does not verify. */
  function renderScope() {
    const later = P.later || [], trusted = P.trusted || [], cand = P.reviewedCandidates || [];
    const chips = (ids) => h("span", { class: "chips inline" }, ids.map((id) => (NODE[id] ? nodeChip(NODE[id]) : h("span", { class: "muted" }, id))));
    $("#scopebox").replaceChildren(
      h("h2", null, "后续工作与可信边界"),
      h("p", { class: "hint" }, "不在依赖图里：后续工作没有任何当前工作项依赖它；可信边界是计划内代码消费、但本计划不验证的输入（每个消费者要把它写成 requires）。"),
      later.length ? h("details", { class: "fold" }, h("summary", null, `展开 ${later.length} 项后续工作（不在当前范围内）`),
        h("ul", { class: "scopelist" }, later.map((x) => h("li", null,
          h("div", null, h("b", null, x.title), h("span", { class: "mn" }, ` ${LANE[x.lane].name} · ${x.face}`)),
          h("div", { class: "hint" }, x.why),
          x.after.length ? h("div", { class: "hint" }, "计划建议在这些之后（不是已核对的依赖）：", chips(x.after)) : null,
          h("div", { class: "ev" }, x.todo.join(" "), " 依据：", x.ev))))) : h("p", { class: "hint" }, "当前没有推迟的工作：原先放在“后续”的项目已并入当前范围。"),
      h("details", { class: "fold" }, h("summary", null, `展开 ${trusted.length} 项可信边界`),
        h("ul", { class: "scopelist" }, trusted.map((t) => h("li", null,
          h("div", null, h("b", null, t.id), h("span", { class: "mn" }, ` ${t.provider}`)),
          h("div", null, t.input),
          h("div", { class: "hint" }, t.record),
          h("div", { class: "hint" }, "消费它的工作项：", chips(t.consumers)))))),
      cand.length ? h("p", { class: "hint" }, `已检查、未关联到工作项的 PR：${cand.map((c) => `#${c.n}`).join("、")}（${cand.map((c) => c.note).join(" ")}）`) : null);
  }
  function renderFooter() {
    $("#footer").replaceChildren(
      h("p", null, `数据来源：x86-verification-plan.polished.md（r${P.revision}，复核 ${P.doc.date}，源码 ${P.doc.sha.slice(0, 9)}）。依赖、工作内容和路线归属来自计划文件，计划文档的工作项与依赖表由同一份数据生成；PR 状态来自发布时生成的 GitHub 快照，快照缺失时显示状态未知；代码行分布取自`,
        h("a", { href: "https://asterinas.github.io/vostd/stats/snapshot.json" }, "验证仪表盘快照"), "，完整模块明细请到", h("a", { href: "https://asterinas.github.io/vostd/" }, "仪表盘"), "查看。"),
      h("ul", null,
        h("li", null, "一次只显示一条路线。主图只含该路线自己的工作和它们之间的依赖；其他路线的工作只以桩的形式出现，且只列直接相连的：图顶是本路线需要的，图底是本路线为其提供接口的。点桩会切换到那条路线。"),
        h("li", null, "关系层按本路线内最长关系链排列，包含待确认关系，仅用于布图。同层之间没有直接关系；不同层也可并行开展局部证明。跨路线关系见图顶。层数不规定排期或 PR 合并顺序。"),
        h("li", null, "PR 怎么看：桩的底部和卡片的“前置 PR”一行，列的是它在等的那些前置工作背后的 PR。实心点是正在实施的开放 PR（颜色是合并门禁）；灰色“已合入”表示 PR 已合入但计划验收未确认，工作仍算未完成；虚线“参考”只是复用 / 协调的 PR，不计入进展；红边表示属于其他路线。前置没有 PR 就不显示。详情里每个前置都带 PR，并汇总一行可点击的链接。"),
        h("li", null, "bzImage 是独立路线，不是 x86 的整体前置：它和 x86 之间只有最终镜像验收处的连接。"),
        h("li", null, "“汇总验收”（x86 当前范围最终验收）的前置是逐项交付与可信边界清单，不是它要消费的接口，所以主图不画这些连线，也不为它列出其他路线的桩；卡片显示已验收进度，清单见详情。它不规定其他工作的先后，也不计入“完成后解锁”。"),
        h("li", null, "同一外部工作项可能在图顶和图底各出现一次，表示它消费本路线某项合同，也向本路线的另一个工作项提供合同；具体接口和验收条件见连线详情。"),
        h("li", null, "已完成以显式验收依据为准；有开放 PR 显示 PR 进行中，同时列出未交付前置。其余工作按未交付的确认前置判定：有开工前置则开工受阻，只有验收前置则前置待交付，全部满足才前置就绪。前置待交付可先做条件证明。PR 合并和 CI 成功不自动结项或解除依赖；审阅、CI、冲突分别显示。"),
        h("li", null, "每条依赖都写明它用到前置的哪个接口、规格、资源或状态，以及在哪个固定提交核对过（点工作项看详情，或悬停连线）。确认的依赖分两类：开工前置（没有它后继的证明无法开始，实线）和验收前置（后继可先用 requires 做局部证明，验收时才需要它，点线）；只有开工前置限制开始；验收前置的卡片标“局部可先行”，不代表必须串行推进。尚未确认的关系标“推断”或“待确认”并写明缺什么证据（虚线），它们不会让工作显示为受阻。"),
        h("li", null, "路线按交付责任归属：x86 平台、独立的 bzImage 与 OSTD 公共接口。跨路线消费者通过具体接口合同连接。"),
        h("li", null, "代码行验证分布是仪表盘的模块级统计，仅作辅助；它不是计划完成度，PR 合入、CI 成功或旁边模块变绿也都不能标记完成。"),
        h("li", null, "arch/<arch>/boot、arch/<arch>/iommu、arch/x86/tdx_guest.rs 与 ostd-macros 本轮不纳入验证，图中不显示；它们提供给计划内代码的输入仍需明确调用合同或可信边界记录。"),
        h("li", null, "PR 状态是复核而非正确性审计；CI 成功不代表已获批，也不代表多个分支组合验收通过。")));
  }

  /* ----------------------------------------------------------------- boot */
  function renderAll() {
    renderHeader(); renderIssues(); renderTabs(); renderSummary(); renderBoard(); renderScope(); renderRest(); renderFooter();
    syncDock();
  }
  async function loadSnapshot() {
    if (new URLSearchParams(location.search).get("snapshot") === "baseline") return { live: false, snap: null };
    for (const url of [P.liveUrl]) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      try {
        const res = await fetch(url, { signal: ctl.signal });
        if (!res.ok) continue;
        const j = await res.json();
        if (j && Array.isArray(j.modules) && j.totals) return { live: true, snap: j };
      } catch (e) { /* next source */ } finally { clearTimeout(timer); }
    }
    return { live: false, snap: null };
  }
  let lastW = 0, resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = Math.floor($("#boardwrap").clientWidth);
      if (w !== lastW) { lastW = w; renderSummary(); renderBoard(); syncDock(); }
    }, 120);
  });
  async function boot() {
    const q = new URLSearchParams(location.hash.slice(1));
    const wantLane = LANE[q.get("lane")] ? q.get("lane") : DEFAULT_LANE;
    const wantNode = NODE[q.get("n")] ? q.get("n") : "";
    lane = wantNode ? NODE[wantNode].lane : wantLane;       // a linked work item decides the lane
    V = M.view(lane);
    selected = wantNode;
    DATA = buildData(false, null);          // never blank: paint the built-in baseline first
    renderAll();
    lastW = Math.floor($("#boardwrap").clientWidth);
    document.documentElement.dataset.ready = "baseline";
    if (selected) reveal(selected);
    const { live, snap } = await loadSnapshot();
    if (live) {
      DATA = buildData(true, snap);
      renderAll();
      document.documentElement.dataset.ready = "live";
    } else renderHeader();
  }
  boot().catch((e) => { $("#meta").textContent = "页面加载失败：" + e.message; console.error(e); });
})();
