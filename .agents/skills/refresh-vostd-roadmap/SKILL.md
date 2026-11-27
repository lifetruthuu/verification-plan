---
name: refresh-vostd-roadmap
description: 根据 asterinas/vostd 的最新 PR 更新 lifetruthuu/verification-plan 的 PR 目录、后续工作项、依赖图和计划文档。适用于核对 PR 改动对 x86、bzImage 和 OSTD 公共模块排期或验收范围的影响。
---

在 lifetruthuu/verification-plan 的检出目录操作。VOSTD 检出目录只提供上游源码。先读路线图仓库的 AGENTS.md 和 README.md，复用已有的 `npm run plan` 命令、数据文件与网站展示。

运行 `npm run sync` 获取已跟踪 PR 的状态和新开放候选。以上次**计划修订**为起点，对照上游 main 的提交及期间新建、更新、已合并或关闭的 PR。自动快照可能比计划修订新好几轮，只看最新快照的 diff 或 `plan -- todo` 会漏掉两次刷新之间合并的 PR，以及 head 未变但正文已改的 PR。需要时用 `gh pr list -R asterinas/vostd --state all --search 'updated:>=YYYY-MM-DD'`，按实际修订日期查询并取全结果。

对影响计划的变更，核对 PR 正文、固定 head 的差异、真实消费者和相关审阅。重放或变基的 PR 要区分主线带入的修改与分支自身交付。在 pr-catalog.js 记录实施或复用关系、已查 head 和剩余缺口。新纳入的 PR 须再次刷新以取得完整快照，确认写入的 reviewedHead 正是检查的版本。无关候选可按仓库约定记下复核理由。

用 `npm run plan -- show ID` 和 `impact ID` 检查后继。当 PR 只交付原节点的一部分时，让节点说明区分已有合同与下一项可验收工作。有独立消费者和验收条件才拆分，保留已有节点 ID。依赖从提供者指向消费者，记录消费的具体合同、源码位置和提交。仅适用于某个启动模式或平台的条件要在对应范围说明；拟新增的连线若会阻塞其他路径，先核对模型能否表达这一条件。开放、合并、CI 成功和显式验收各有独立来源。

安排后续工作时，优先选择一个可执行函数、一份文件或一个紧密相关的小模块作为一份 PR。在工作项中写出源码入口、调用者如何使用结果、该 PR 要证明的前后置条件，以及对应的验证命令。一个场景涉及多个可分别消费的合同时，为每个合同保留独立的验收入口，把整条启动或运行路径放在组合验收节点。

语义变更开计划版本，同步节点、PR 关联、依赖、可信输入、历史及文档手写段落。用 `npm run docs`、`npm run check`、`npm run plan -- todo` 和 `git diff --check` 检查交付。预览变动路线，点开代表节点，核对实施 PR、后继和仍待交付的条件。报告复核基线、计划变化、剩余验收及实际发布位置。
