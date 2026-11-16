# VOSTD 验证路线图

一个静态网站，展示 [VOSTD](https://github.com/asterinas/vostd) 中 x86、bzImage 和 OSTD 公共模块的验证工作项、依赖关系、关联 PR 与验收状态。

网站：https://lifetruthuu.github.io/verification-plan/

## 目录结构

```text
public/            静态网站，也是部署目录
  index.html       页面入口
  assets/          页面脚本、样式、状态模型与布局
  data/            工作项、依赖、验收记录和 PR 数据
scripts/           数据维护、刷新与文档生成工具
docs/              验证计划与历史复核记录
.github/workflows/ 自动刷新和发布
```

页面只负责显示和状态计算，计划内容都在 `public/data/`：

| 文件 | 内容 | 维护方式 |
| --- | --- | --- |
| `plan-data.js` | 工作项、路线、范围 | 命令或手动 |
| `pr-catalog.js` | PR 覆盖判断与关联 | 命令或手动 |
| `plan-edges.js` | 节点依赖 | 命令或手动 |
| `plan-accept.js` | 验收日期与证据 | 命令或手动 |
| `plan-history.js` | 计划版本与变更原因 | 命令或手动 |
| `pr-snapshot.js` | GitHub PR 状态快照 | 自动刷新，勿手改 |

## 本地使用

需要 Node.js 22 和 npm（无需安装依赖）、Python 3（预览）；刷新 PR 还需登录 GitHub CLI（`gh`）。在项目根目录运行：

```sh
npm run preview          # 预览：http://localhost:8000/
npm run sync             # 刷新 PR 快照、同步文档并列出待办
npm run plan -- help     # 查看全部维护命令
npm run plan -- show ID  # 查看某个工作项（ID 换成实际 ID）
```

修改计划的流程：

1. 用 `npm run plan -- rev "修改原因"` 开启新版本。
2. 优先用 `npm run plan` 命令修改数据；手动编辑也可以。
3. 运行 `npm run docs` 同步文档，再运行 `npm run check` 检查数据一致性。

`check` 只检查数据与文档是否一致，不是 Verus 证明验证。文档中的 `GENERATED` 块由数据生成，不要直接编辑。

## 自动更新与发布

推送到 `main` 会刷新 PR 并发布 `public/`；此外每 6 小时自动执行一次。需要立即更新时，到 [Actions](https://github.com/lifetruthuu/verification-plan/actions/workflows/pages.yml) 点击 **Run workflow**。GitHub 可能延迟执行；失败时网站保留上次发布的版本。

自动更新只刷新 PR 状态，不会修改覆盖范围、依赖或验收。工作项是否完成需人工验收，PR 合并不会自动标记完成。

## 延伸阅读

- [验证计划](docs/x86-verification-plan.polished.md)
- [复核记录](docs/review-r3.md)
- [AGENTS.md](AGENTS.md)：AI 维护流程，包括 PR 复核、节点调整与依赖
