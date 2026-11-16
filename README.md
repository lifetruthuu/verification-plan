# 验证路线图：数据与维护手册

页面（`index.html`）和计划文档（根目录 `x86-verification-plan.polished.md`）都由这里的数据生成。范围是 x86 平台、独立的 bzImage 和 OSTD 公共模块；架构适配和多架构迁移保存在 `outOfScope`，不显示。

## 文件分工

按“谁来改、多久改一次”拆开，日常维护只碰一两个小文件：

| 文件 | 内容 | 谁改 | 多久改一次 |
|---|---|---|---|
| `pr-snapshot.js` | GitHub 事实：head、开放/合入、审阅、CI、合并门禁 | `plan.mjs sync`（**不要手改**） | 每次 PR 变化 |
| `pr-catalog.js` | 每个 PR 的判断：覆盖范围、`implements` / `reuses`（关联哪些工作项）、复核过的 head | `plan.mjs pr …` 或手改 | PR 进入计划、复核 head 时 |
| `plan-accept.js` | 验收记录（`done`）：日期 + 核对了什么、对照哪个固定提交 | `plan.mjs accept` 或手改 | 一项工作验收时 |
| `plan-edges.js` | 依赖表：一行一条“前置 → 后继”，写明用到什么、依据在哪 | `plan.mjs edge …` 或手改 | 调整计划时 |
| `plan-history.js` | 变更记录；最后一条就是计划版本号 | `plan.mjs rev / log` 或手改 | 每次调整计划 |
| `plan-data.js` | 工作项内容（标题、模块、要做什么、完成条件）、路线、后续工作、可信边界、基线 | 手改 | 范围变化时 |

`plan-assemble.js` 把它们合成页面和工具使用的 `window.PLAN`；`plan-model.js` 推出状态和依赖，`plan-layout.js` 布局，`plan.js` / `plan.css` 是页面。根目录文档里的 `GENERATED` 块由数据生成，**不要手改**。

独立站点入口是 `index.html`。部署时将本仓库根目录作为静态站点根目录；页面资源均在本目录中。

数据维护统一入口：`node plan.mjs help`。以下命令都在本仓库根目录运行；维护工具会同步根目录的 `x86-verification-plan.polished.md`。

## 维护手册

### PR 变了（最常见）：合入、关闭、head 更新、出现新 PR

```sh
node plan.mjs sync     # 刷新快照（需要 gh）→ 重新生成文档 → 校验 → 列出待办
```

页面上的 PR 状态、芯片颜色随快照自动变化，**不需要改任何数据**。`sync` 末尾的待办告诉你哪些需要人来判断：

| 待办 | 怎么处理 |
|---|---|
| PR 已合入、等待你确认验收 | 核对交付后：`plan.mjs accept ID --evidence "核对了什么 …@<固定提交>"`。合入**不会**自动让后继解锁，只有验收记录才算 |
| PR 的 head 已变化，覆盖说明待复核 | 按新 head 核对 `scope` / `note` 是否仍成立，改完：`plan.mjs pr review N [--note "…"]` |
| 尚未关联的新开放 PR | 属于计划：`plan.mjs pr add N --scope "…" --implements ID`；无关：记入 `plan-data.js` 的 `reviewedCandidates` |
| 实施 PR 都已关闭但没有合入 | 重新关联新 PR（`pr link`）或调整计划 |
| 文字里写了会变化的 PR 状态 | 把“开放 / 草稿 / 需修改 / CI”这类描述删掉，只写编号；状态看快照 |
| 文档手写部分提到的 head 与快照不符 | 改文档里手写的那句（编号和判断可以长期有效，head 会过期） |

没有待办时输出“没有需要处理的事项”。**写作约定**：节点和文档的文字里只写 PR 编号和不会过期的事实（“已合入 main `41ccd7463`”可以），不要写“开放”“草稿”“CI 失败”这种会变的状态。

### 验收一项工作

```sh
node plan.mjs impact ID   # 先看：若验收，哪些工作的状态会变
node plan.mjs accept ID --evidence "对照 #855 合入后的 main，消费者 X 已建立前置 …@97963e831；剩余可信边界 …"
```

`--evidence` 必须含固定提交（`@<sha>`）。命令会提示还没验收的前置和仍开放的 PR。撤销：`plan.mjs unaccept ID`。

### 调整依赖，包括整条链路

先开一个版本，之后的每条修改都会自动写进它的变更记录（要求 `--why`），并打印“哪些工作的状态因此变化”；产生环的修改会被拒绝且不写入。

```sh
node plan.mjs rev "把 PIC 的前置改为 IO_ALLOC，并补上 X"
node plan.mjs show PIC                                   # 看它现在的前置、后继、PR
node plan.mjs edge swap IO_PIO IO_ALLOC --for PIC --why "PIC 只消费 MMIO 登记合同"
node plan.mjs edge add A B --gate accept --need "要用到的接口" --ev "文件::符号 @提交" --why "…"
node plan.mjs edge add A B --tag 待确认 --missing "缺什么证据" --why "…"
node plan.mjs edge set A B --gate start --why "…"        # 改类型 / 依据 / 升级降级
node plan.mjs edge rm  A B --why "…"
node plan.mjs check
```

- `edge swap OLD NEW` 把所有（或 `--for` 指定的）以 OLD 为前置的依赖改成 NEW，沿用原来的 `need` / `ev`，用于拆分和替换；之后核对这些理由是否仍然成立。
- 同一版本内先加后删（或先删后加）会在历史里自动抵消，历史始终和最终的图一致。
- 想直接改文件也可以：`plan-edges.js` 一行一条，改完 `plan.mjs docs && plan.mjs check`。变更记录要自己补；检查会比对“最近一次决定”与图是否一致。
- 最近一个版本不是今天时，修改会被拒绝，提示先 `rev`（或加 `--into-latest` 明确写入旧版本）。所有修改命令都支持 `--dry-run` 只预览。

### 新增、拆分、移出工作项

节点内容在 `plan-data.js` 的 `nodes` 里手改，复制一个相近的节点：

```js
{ id: "NEW_ID", lane: "x86", face: "arch/x86/xxx", title: "一句话说明交付什么",
  mods: ["arch/x86/xxx"],
  todo: ["要做什么：真实执行入口、现状、缺口……"],
  accept: "交付什么；消费者如何使用；完成条件；剩余可信边界。",
  src: "§5" },
```

然后把前置和后继接上、记录并校验：

```sh
node plan.mjs rev "拆分 OLD 为 OLD + NEW_ID"
node plan.mjs edge add OLD NEW_ID --gate accept --need "…" --ev "…@提交" --why "…"
node plan.mjs log split OLD OLD,NEW_ID --why "两件事的接口不同，后继只需要其中之一"
node plan.mjs pr link 123 NEW_ID          # 若有 PR 实施它
node plan.mjs check
```

保留稳定 ID：拆分时原 ID 保留一部分工作；替换或移出范围要用 `log replaced` / `log removed`（后者要求 ID 留在 `outOfScope`）。`TODO` 占位符不能通过检查。

### 其他

- **源码基线前进**（main 有新提交）：改 `plan-data.js` 的 `doc.sha` / `doc.date`。依赖依据（`@<sha>`）是当时核对的固定提交，不必跟着变；只有接口合同变了才用 `edge set … --ev` 更新。
- **查看某项**：`plan.mjs show ID`（前置、后继、PR、验收）；`plan.mjs impact ID`（验收后的状态变化与全部间接后继）。
- **页面预览**：在仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/`。独立部署时把本目录作为站点根目录；页面不依赖仓库主站的路径或发布流程。

## 口径

**依赖**。后继 B 依赖前置 A，当且仅当 B 的证明或验收确实用到 A 建立的某个具体接口合同、资源或状态，且能指出是哪一个、在哪个固定提交核对过。共用模块、存在调用关系、运行时初始化顺序都不算。

- 确认的关系：`gate: "accept"` 只限制最终验收，后继可先把前提写成 `requires` 开展局部证明；`gate: "start"` 仅用于“没有它连局部证明都无法开始”。`need` 写用到什么，`ev` 写文件::符号 @固定提交。
- 推断 / 待确认：写 `tag` 和 `missing`（缺什么证据）。显示为虚线，**不使工作受阻**，也不得在文字里表述成确定的开工门槛。
- `rollup: true` 标记最终汇总验收（目前只有 `ACC_SCOPE`）：它的前置是逐项交付清单，不是它消费的接口。这些边参与它自己的状态和详情，但主图不画线、不生成桩，卡片显示“已验收 n/总数”，也不计入其他工作的“完成后解锁”。汇总节点不能作为别的工作的前置；至少要有一个汇总节点覆盖全部工作项。

**状态**（只由数据推出，页面和检查用同一份模型）：显式验收（`plan-accept.js`）→ 已完成；有开放的实施 PR → PR 进行中；有未验收的开工前置 → 开工受阻；只有未验收的验收前置 → 前置待交付（可先做条件证明）；其余 → 前置就绪。推断关系只显示不阻塞。PR 合并、CI 通过、仪表盘变绿都不会自动完成或放行任何工作；审阅要求修改、CI 失败、合并冲突分别显示。

**PR 芯片**。工作项的实施 PR 来自 `pr-catalog.js` 的 `implements`，`reuses` 只是复用 / 协调（页面显示为“参考”，不计入进展）。卡片的“前置 PR”行和桩的底部列出它所等待的前置背后的 PR：实心点是开放的实施 PR，灰色是已合入但未验收，虚线是参考，红边表示属于其他路线。

**验收内容**由每项的 `todo`、`accept` 与公共的 `acceptanceRule` 共同定义：交付什么、消费者如何使用、完成条件、剩余可信边界。

## 校验与发布

```sh
node plan.mjs check     # = node check-data.mjs
```

检查两部分：**数据**（ID、依赖依据、悬空 / 重复 / 成环、PR 快照、变更记录与图一致、汇总验收覆盖全部工作项、文档生成块与数据一致、三条路线可以布局）和**模型行为**（`model-test.mjs`，使用自带的小型示例计划，不读取真实数据，所以调整工作项或依赖不会让它失败；改动 `plan-model.js` / `plan-assemble.js` / `plan-layout.js` 才会）。

`update-pr-snapshot.mjs OUTPUT` 查询目录里的 PR 和计划关联的 PR（含已关闭、已合并），并发现尚未关联的开放 PR；全部成功才原子替换快照，失败保留旧文件。页面显示快照时间，超过 48 小时提示刷新。

## GitHub Pages

网站地址：https://lifetruthuu.github.io/verification-plan/ 。Pages 通过本仓库的 GitHub Actions 工作流发布。更新文件并推送到 `main` 后会自动重新发布静态页面。

PR 快照由独立仓库的 `Refresh roadmap and deploy Pages` 工作流每 6 小时刷新一次（北京时间约 02:17、08:17、14:17、20:17，GitHub 可能延迟执行），成功后提交快照并发布页面。也可在 Actions 中手动运行该工作流。推送到 `main` 也会先刷新 PR 快照，再发布页面。自动更新只修改 PR 事实快照，计划依赖、覆盖判断和验收记录由维护者管理。刷新失败会使任务失败，线上保留上次成功发布的版本。公开仓库的定时工作流可能在连续 60 天无活动后被 GitHub 停用，可在 Actions 中重新启用。

已完成卡片显示“已验收 · #PR”，详情顶部列出全部关联实施 PR 的链接，并显示验收日期和依据。编号自动取自 `pr-catalog.js` 的 `implements`，无需在验收记录中重复填写；`reuses` 不计入这些链接。用 `node plan.mjs pr link 编号 工作项ID` 维护关联。没有关联时显示“未关联 PR”；多个编号放不下时卡片省略，悬停可查看全部，点击卡片可打开详情。关联实施 PR 不等于该 PR 单独完成了全部验收要求，验收范围以证据记录为准。
