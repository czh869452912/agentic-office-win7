# GenOffice Win7 首轮方案评审

## 仓库与基线

在当前仓库保留上游 Git 历史。使用 `upstream/main` 跟踪同步快照，使用 `win7/upstream-baseline-2026-11-24` 固定本轮基线，使用 `win7/main` 集成适配。版本和三个锁文件的 SHA-256 见 [baseline.json](../../compat/manifest/baseline.json)。上游贡献说明确认公开仓库定期同步私有开发树，补丁更新应以基线之间的差异为单位。[上游贡献说明](../../CONTRIBUTING.md)

需要公开协作或向上游提 PR 时，使用 GitHub fork。需要限制访问时，使用独立私有仓库或内网 Git 托管，并保留 `upstream` 作为更新来源。公开仓库在 GitHub 上的 fork 公开。当前基线的 `ee/` 只有说明和单独许可，未来同步和发行时需检查该目录。发行版同时检查 `NOTICE` 和品牌使用。[GitHub fork 可见性](https://docs.github.com/en/pull-requests/reference/forks) · [企业许可](../../ee/LICENSE) · [NOTICE](../../NOTICE)

## 实施顺序

1. **先验证桌面运行时。** Electron 从 23 开始结束 Win7 官方支持。用锁定的 43.8.10 先在现代 Windows 跑对照，再携带同一份解包运行时和探针进 Win7 SP1 x64。按方案先记录直接启动结果，再评估 VxKex。首轮应优先确认实际 Renderer 进程隔离、子进程和隐藏窗口渲染，结果决定是否安排更重的适配。VxKex 兼容清单按具体应用记录，Electron 43.8.10 的结论需要实测。[Electron 官方公告](https://www.electronjs.org/blog/windows-7-to-8-1-deprecation-notice) · [VxKex 兼容清单](https://github.com/CopperFr/VxKex/wiki/Application-Compatibility-List)
2. **可以并行试编译原生组件。** 先为 XLSX Sidecar 和 EMF Helper 获取 Win7 目标的最小构建证据。记录工具链、标准库构建方式和最终 PE 的导入，并在目标机核对原生协议和 Excel 剪贴板往返。上游 Windows 的两个 Rust 构建使用当前主机工具链，Win7 目标为 Tier 3，需要自行构建标准库。[上游构建脚本](../../apps/sheets/package.json) · [Rust Win7 目标](https://doc.rust-lang.org/rustc/platform-support/win7-windows-msvc.html)
3. **先验证视觉链路，再裁剪 PDF 入口。** 先跑真实 DOCX、XLSX、PPTX 的 PNG 输出和失败清理。profile 接入顺序建议先做共用后端和打包的边界测试，再接 GUI、CLI、MCP 和 Skill 声明。保留方案中的现代 Windows 原版、现代 Windows profile、Win7 profile 三组对照。
4. **按实测结果重估工期。** Runtime PoC 用于决定是否继续投入完整移植。进入 Electron 源码维护路线时，单独估算构建资源、补丁更新能力和每次升级的验证成本。

## 源码核对

| 范围                  | 基线入口和后续验证                                                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 桌面与非 PDF 编辑器   | `apps/{shell,docs,sheets,slides,markdown,html}`。按打开、编辑、保存、恢复与格式转换建立对照。原生组件在 `apps/sheets/native/`。                                                           |
| AI、CLI、MCP 与 Skill | `packages/{agent-core,ai-provider,ai-search,cli}` 与 `skills/`。CLI 入口在 `packages/cli/src/cli.ts`，MCP 定义在 `packages/cli/src/mcp/tools.ts`。需核对内网端点和工具行为。              |
| PDF 对外入口          | 首批检查 Shell 的文件打开、菜单及 `--headless-export`，`apps/pdf`、`packages/pdf2docx`、`packages/file-parse`，以及 CLI 的 PDF 命令、通用操作和 MCP 工具。                                |
| Office 页面渲染       | `packages/cli/src/formats/render.ts` 的 `renderToPngs` 调用 `exportViaApp` 和 `rasterizePdf`。`slides render` 与其他 CLI 操作复用它。应先把内部 PNG 路径与公开 PDF 输出的契约明确下来。   |
| 打包与运行时          | `apps/shell/electron-builder.cjs` 引用 PDF workspace 下的 HarfBuzz WASM。开始移出 PDF 模块前，先盘点共享资源消费者和实际包内容。官方 CLI 在 Windows 通过 Electron 的 RunAsNode 模式启动。 |

这轮源码核对覆盖了主要入口。参数级 CLI/MCP 清单、应用内 IPC 和附件的完整调用图、实际离线安装与外连行为仍待逐项验证。
