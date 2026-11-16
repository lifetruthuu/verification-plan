# VOSTD 验证路线图

查看 x86、bzImage 和 OSTD 公共模块的工作项、依赖及关联 PR。

网站：https://lifetruthuu.github.io/verification-plan/

## 项目结构

```text
public/            静态网站，也是部署目录
  index.html       页面入口
  assets/          页面脚本、样式、状态模型与布局
  data/            工作项、依赖、验收记录和 PR 数据
scripts/           数据维护、刷新与文档生成工具
docs/              验证计划和历史复核记录
.github/workflows/ 自动刷新和发布
```

## 本地使用

需要 Node.js 22 和 npm，无需安装依赖。预览使用 Python 3；刷新 PR 需要安装并登录 GitHub CLI（`gh`）。在项目根目录运行：

```sh
npm run preview          # 预览：http://localhost:8000/
npm run sync             # 刷新 PR、同步文档并列出待办
npm run plan -- show ID  # 查看工作项，用实际 ID 替换 ID
npm run plan -- help     # 查看全部维护命令
```

修改计划前，用 `npm run plan -- rev "修改原因"` 开启一个版本。日常修改集中在 `public/data/`：工作项在 `plan-data.js`，PR 关联在 `pr-catalog.js`，依赖在 `plan-edges.js`，验收记录在 `plan-accept.js`。

优先使用维护命令；手动编辑数据后，运行 `npm run docs` 和 `npm run check` 同步文档、检查数据一致性。`pr-snapshot.js` 自动刷新，文档中 `GENERATED` 块自动生成。

## 发布和自动更新

推送到 `main` 会刷新 PR 并发布 `public/`。此外每 6 小时自动更新一次；需要立即更新时，在 [Actions](https://github.com/lifetruthuu/verification-plan/actions/workflows/pages.yml) 点击 **Run workflow**。GitHub 可能延迟执行，失败时网站保留上次发布的版本。

工作项完成需人工验收。已完成卡片的 PR 编号自动取自 `pr-catalog.js` 的 `implements`，无需重复维护；PR 合并不会自动标记工作完成。

完整说明见 [验证计划](docs/x86-verification-plan.polished.md) 和 [复核记录](docs/review-r3.md)。

AI 维护流程见 [AGENTS.md](AGENTS.md)，包括 PR 复核、节点调整、关联与前置依赖。
