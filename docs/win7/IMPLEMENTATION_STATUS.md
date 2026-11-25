# GenOffice Win7 实施台账

适配分支为 `win7/main`，本轮上游基线为 `99865c27f685f1e7f40d6df273545db8ea86aa17`。版本与锁文件哈希见 [基线清单](../../compat/manifest/baseline.json)，需求及门禁见 [项目索引](README.md)。

| 工作项                  | 阶段   | 状态                                 | 依赖与下一项可验证交付                                                                                                                            |
| ----------------------- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| W00 基线冻结            | P0     | 源码已锁定，A 组对照进行中           | 原版构建通过，T08 渲染子用例已留证。继续核对参数级能力和原版 Windows CLI 差异。                                                                   |
| W01 Electron 探针       | P1     | 44.2.0 社区候选启动通过              | Win7 探针通过 SQLite、五个 View、Renderer 基本隔离与隐藏窗口打印。继续验证 RT02–RT09 余项。[桌面实测](desktop-candidate.md) |
| W02 PDF profile         | P2     | A 组和 Win7 候选的 PNG 子项通过       | DOCX、XLSX、PPTX 已在 Win7 候选包验证内部 PNG 渲染。继续实现产品裁剪及 T13–T15。[桌面实测](desktop-candidate.md) |
| W03 Win7 原生组件       | P3     | Sidecar 和 EMF 基础用例通过          | 两个 Win7 目标构建通过。原始 XLSX 样本的公式缓存回归通过，后续覆盖复杂工作簿及应用内 EMF。[复测记录](native-and-sandbox-validation.md) |
| W04 CLI、MCP 与内网模型 | P3、P5 | MCP HTTP 与 stdio 子项通过           | 此前 Win7 .NET 客户端通过 HTTP 基本用例。桌面候选包通过 stdio 初始化、发现、XLSX 调用及退出。继续验证内网模型和传输异常。[桌面实测](desktop-candidate.md) |
| W05 运行时路线决策      | P1、P4 | 社区移植版进入桌面测试               | 固定社区 Electron 44.2.0 与 Win7 原生组件，六个编辑器加载成功，三种 OOXML 格式完成编辑保存。继续核验补丁和正式发行条件。[桌面实测](desktop-candidate.md) |
| W06 离线交付与验收      | P5、P6 | Win7 测试包离线安装和卸载通过       | 已生成 NSIS x64 候选并通过部分 T17。剩余产品能力裁剪、签名、跨版本升级回滚、物理终端对照及 T01–T19 验收。[安装实测](desktop-candidate.md#win7-x64-安装候选) |

## 已有证据

- 在现代 Windows x64 `10.0.26300` 运行 `npm ci --no-audit --no-fund`（Node `22.21.0`、npm `10.9.4`）及 `npm run build:all` 成功。构建覆盖两个主机 Rust 组件，CLI 可输出版本和帮助。
- 上游 CLI 全套测试首次得到 536 通过、30 失败、25 跳过，另有命名管道占用异常。可见的失败包括路径断言、符号链接权限、MCP 超时和缺少生成的 XLSX 测试样本。生成 Sheets 样本后，重跑 `tests/cli.test.ts` 和 `tests/errors.test.ts`，18 项全部通过。其余失败待复核。[上游 CI 配置](../../.github/workflows/ci.yml)
- 官方 Electron `43.8.10` 在现代 Windows 的探针运行返回 0，五项均通过。`electron.exe` SHA-256 为 `0fafe52005be7e9fa67b5e068d57b38abd63ce24abdaa897113a0c3764f8a363`。[探针覆盖范围](runtime-test.md)
- 原版 Office 渲染的五个子用例通过，包含 DOCX、XLSX 和 PPTX 渲染、`slides render`、越界页码错误及中间 PDF 清理。[实验记录](evidence/render-baseline-windows-x64.json)
