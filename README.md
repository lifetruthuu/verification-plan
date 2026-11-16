# VOSTD 验证路线图

查看 x86、bzImage 和 OSTD 公共模块的工作项、依赖关系及关联 PR。

网站：https://lifetruthuu.github.io/verification-plan/

## 更新网站

PR 状态每 6 小时自动刷新。推送到 `main` 也会刷新数据并发布页面；需要立即刷新时，在 [Actions](https://github.com/lifetruthuu/verification-plan/actions/workflows/pages.yml) 点击 **Run workflow**。GitHub 可能延迟执行，失败时网站保留上次发布的版本。

工作项完成需人工验收。已完成卡片自动显示关联 PR，编号来自 `pr-catalog.js` 的 `implements`，无需重复填写。PR 合并不会自动标记工作完成。

## 日常维护

在仓库根目录运行，需 Node.js 22；本地刷新 PR 还需安装并登录 GitHub CLI（`gh`）。

```sh
node plan.mjs sync       # 刷新 PR 数据、同步文档并列出待办
node plan.mjs show ID    # 查看工作项，用实际 ID 替换 ID
node plan.mjs help       # 查看关联 PR、验收和修改依赖等命令
```

修改计划前，用 `node plan.mjs rev "修改原因"` 开启一个版本。工作项内容在 `plan-data.js`，PR 关联在 `pr-catalog.js`，依赖在 `plan-edges.js`，验收记录在 `plan-accept.js`。优先使用维护命令，它们会同步文档并记录变更。

手动编辑数据文件后运行：

```sh
node plan.mjs docs
node plan.mjs check
```

提交并推送修改后，网站自动发布。`pr-snapshot.js` 由程序刷新，计划文档中标有 `GENERATED` 的内容由数据生成。

## 本地预览

```sh
python3 -m http.server 8000
```

打开 http://localhost:8000/ 。页面是纯静态文件，无需安装前端依赖。

完整计划见 [验证计划](x86-verification-plan.polished.md)，历史复核依据见 [复核记录](review-r3.md)。
