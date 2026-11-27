# AI 维护指南

本仓库维护 VOSTD 验证路线图，源码与 PR 来自 `asterinas/vostd`，网站发布到 `lifetruthuu/verification-plan`。维护目标是让工作项、PR 覆盖范围、依赖证据和验收记录对应实际代码。先阅读 README；需要了解计划范围时，再读 `docs/x86-verification-plan.polished.md` 的相关部分。

## 开始工作

先运行 `git status --short`，保留用户已有改动。工作区干净时执行 `git pull --ff-only`；自动刷新任务可能已提交新的快照。使用 Node.js 22 和 npm，无需安装依赖。所有命令在仓库根目录执行。

```sh
npm run plan -- help
npm run plan -- show ID
npm run plan -- impact ID
```

`show` 查看节点、前置、后继和关联 PR；`impact` 模拟验收后的影响，不会记录验收。示例中的 `ID`、`FROM`、`TO`、`N`、`<实际SHA>` 都是占位符，必须替换；固定提交使用实际核对过的至少 9 位 SHA。

## 数据放在哪里

- `public/data/plan-data.js`：工作项内容、路线、后续计划、范围与可信边界。
- `public/data/pr-catalog.js`：PR 覆盖判断、实施/复用关联及已复核 head。
- `public/data/pr-snapshot.js`：GitHub 状态快照，由程序刷新，不手工编辑。
- `public/data/plan-edges.js`：节点依赖，包含类型、消费的合同和依据。
- `public/data/plan-accept.js`：验收日期和证据；这是工作项完成状态的来源。
- `public/data/plan-history.js`：计划版本和变更原因。

`public/assets/` 负责显示、状态计算和布局。日常计划调整优先修改数据，不在页面代码中硬编码某个节点或 PR。文档的 `GENERATED` 块由数据生成，不直接编辑。

## PR 更新后如何处理

先运行 `npm run sync`，刷新快照、同步文档并查看待办。没有网络或 GitHub 登录时，可以运行 `npm run plan -- sync --offline`，但要明确说明使用的是旧快照。

自动刷新只更新 PR 事实，不会更新 `scope`、`note`、`implements`、依赖或验收。PR 的标题、描述或代码变化后，核对最新描述、文件差异、审阅意见和实际源码；即使 head 没变，描述也可能变化。不要仅凭标题、合并状态或 CI 成功判断覆盖范围。

可用 `gh pr view N --repo asterinas/vostd` 和 `gh pr diff N --repo asterinas/vostd` 查看背景；用 `gh api repos/asterinas/vostd/pulls/N --jq .head.sha` 确认 head。需要代码级判断时查看该固定提交的源码及消费者。记录实际检查的提交和证据，不声称运行过未执行的验证。

复核完成后更新覆盖范围和剩余缺口：

```sh
npm run plan -- pr review N --scope "实际交付范围" --note "核对的接口、消费者及剩余缺口"
```

该命令把快照中的 head 记为 `reviewedHead`。执行前确认快照 head 与实际审查的提交一致；若 PR 又推进了，刷新并复核增量。不要为了消除“待复核”提示直接更新 head。

新增 PR 或调整关联：

```sh
npm run plan -- pr add N --scope "实际交付范围" --implements ID
npm run plan -- pr link N ID
npm run plan -- pr link N ID --reuse
npm run plan -- pr unlink N ID
npm run plan -- pr unlink N ID --reuse
```

`implements` 表示实施这个工作项，允许一个 PR 对应多个节点，也允许多个 PR 实施同一节点。`reuses` 只表示复用或协调，不计入实施进展。已完成卡片的 PR 编号自动来自 `implements`，无需再维护一份编号。

`pr set --implements A,B` 和 `--reuses A,B` 会替换对应的整个列表，单条调整优先用 `link/unlink`。新 PR 加入目录后再运行 `npm run sync` 获取完整快照；`pr add` 可能直接记录已有快照 head，因此也应在核对覆盖后执行。已合并或关闭的 PR 通常保留作为历史证据。确认无关的新 PR 可在 `plan-data.js` 的 `reviewedCandidates` 记录编号、head、复核日期和理由。

## 新增和调整节点

计划语义发生变化时，先开版本：

```sh
npm run plan -- rev "本次调整的原因"
```

工作项记录可验收的合同。贡献者挑选 PR 时查看 `plan-data.js` 中各路线的 `packages`。选一段原始执行流程，写出基线、准备接入的函数及分支、消费结果的真实调用者、验收条件和验证命令，用 `ids` 指向对应节点。一份 PR 可以覆盖多个节点，也可以先在一个宽节点中交付一段可验证的执行路径。更新任务时复核开放 PR 和模块开关，具体边界遵循 VOSTD 的执行代码保留规范。

保持节点 ID 稳定。修改标题、模块或交付描述不需要换 ID。在 `plan-data.js` 的 `nodes` 中添加或编辑节点，字段沿用邻近节点：

```js
{ id: "NEW_ID", lane: "common", face: "模块路径",
  title: "明确的交付内容", mods: ["模块路径"],
  todo: ["具体接口、消费者与待完成证明"],
  accept: "验收条件、证据要求和剩余可信边界。",
  src: "对应的计划章节" },
```

`lane` 使用现有的 `x86`、`bzimage`、`common`。不要把 `prs`、`done` 或依赖列表写入节点：它们分别由 PR 目录、验收记录和依赖表合成。实际内容不能保留占位文字。

添加节点后记录原因，再建立 PR 关联和依赖：

```sh
npm run plan -- log added NEW_ID --why "新增的交付缺口"
```

检查新节点是否通过确认依赖纳入最终汇总验收（当前为 `ACC_SCOPE`）。若没有被现有汇总链覆盖，应增加到汇总节点的交付边。汇总边表示验收清单，不意味着所有工作必须串行；汇总节点不能作为其他节点的前置。

拆分时原 ID 保留一部分工作，再新增其余节点，分别写清交付范围、迁移 PR 关联并重接依赖，用 `log split OLD OLD,NEW --why "原因"` 留痕。旧验收不能自动覆盖新增或扩大后的范围；逐项复核，必要时撤销原验收。

移出范围时，把节点保留到 `outOfScope`，清理活动依赖、PR 关联、验收和其他引用，再用 `log removed ID --why "原因"` 记录。替换 ID 使用 `log replaced OLD NEW --why "原因"`，旧 ID 必须退出节点集合且不能复用；同时检查历史记录是否仍符合校验约束。复杂调整可成组手工编辑最小范围的数据和变更记录，再统一生成文档、校验；不要通过删除历史证据或放松检查来掩盖不一致。

## 前置节点和依赖方向

`FROM → TO` 表示 **TO 消费 FROM 的交付**。例如 B 的验收需要 A 的资源合同，应添加 `edge add A B`。PR 关联和节点依赖是两回事；给两个节点关联同一 PR 不会自动产生前置关系。

只有能够指出具体接口合同、资源或状态及核对提交，才建立确认依赖。共用模块、调用关系或运行时初始化顺序本身不足以证明依赖。

- `--gate accept`：只限制最终验收，后继可以先用明确前提开展局部证明。
- `--gate start`：没有前置交付，连局部证明都无法开始；使用前须说明原因。
- `--tag 待确认 --missing "缺少的证据"`：证据不足的关系，显示为虚线，不阻塞工作。

```sh
npm run plan -- edge add FROM TO --gate accept --need "TO 消费的具体合同" --ev "文件::符号 @<实际SHA>" --why "新增依赖的原因"
npm run plan -- edge add FROM TO --tag 待确认 --missing "尚未核对的接口证据" --why "待确认的理由"
npm run plan -- edge set FROM TO --gate accept --need "更新后的合同" --ev "文件::符号 @<实际SHA>" --why "调整原因"
npm run plan -- edge rm FROM TO --why "该合同已不再被消费"
npm run plan -- edge swap OLD NEW --for TO --why "TO 改为消费 NEW 的交付"
```

`edge swap` 沿用原来的 `need/ev`，必须重新核对并按需用 `edge set` 更新。省略 `--for` 会替换 OLD 的所有后继，操作前先检查影响。可先加 `--dry-run` 预览；命令会拒绝成环的修改。

依赖命令要求最近版本日期为当天。跨天调整应新开版本，不默认使用 `--into-latest` 绕过。旧证据 SHA 表示当时核对的版本，不随 main 推进批量替换；接口合同变更时才重新核对。

## 验收与变更记录

PR 合并、CI 通过和仪表盘颜色不会自动完成节点。核对节点的 `todo`、`accept` 和公共 `acceptanceRule`，记录实际交付、消费者、固定提交、验证结果及剩余可信边界：

```sh
npm run plan -- impact ID
npm run plan -- accept ID --evidence "核对的交付、消费者、验证结果和剩余边界 @<实际SHA>"
npm run plan -- unaccept ID
```

验收命令对未交付前置和开放 PR 可能只给出提示，AI 仍须判断是否满足验收条件。范围扩大或证据失效时先复核已有验收，不能沿用旧完成标记。

依赖和节点 `log` 命令会记录相应历史；直接编辑节点、PR 关联和验收操作不会自动生成完整的语义变更说明。为本轮计划调整写清版本 `reason`，按实际变动补充已有历史字段。仅刷新 PR 事实快照不需要增加计划版本。

## 收尾与发布

```sh
npm run docs
npm run check
npm run plan -- todo
git diff --check
```

`check` 是数据和文档一致性检查，不是 Verus 证明验证。`todo` 中的待复核事项可能需要更多证据，不要为清空待办而伪造完成记录。涉及显示或布局时，用 `npm run preview` 查看相关路线、节点详情及 PR 链接。

提交前检查差异是否只覆盖本次任务。主分支可能被自动刷新机器人推进；推送被拒绝时 fetch 并核对冲突，不强推覆盖快照或其他修改。按用户授权提交、推送；推送到 `main` 会自动刷新 PR 并部署 `public/`，每 6 小时也会执行。需要确认上线时检查 Actions 结果及线上 `data/pr-snapshot.js` 的 `generatedAt`，不能仅凭提交成功断言网站已更新。
