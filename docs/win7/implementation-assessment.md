# Win7 实施评估

## 首轮实证

在 Windows x64 10.0.26300 上，使用锁定的 Electron 43.8.10 和上游构建产物，运行 Electron 内置 Node 中的 CLI。DOCX 和 XLSX 各得到一页，PPTX 的 `render` 和 `slides render` 各得到五页。脚本解码 PNG、核对页序和尺寸、检查联系表及纯色图像，并在独立临时目录验证成功和越界页码失败后的 PDF 清理。样本和输出哈希见 [实验记录](evidence/render-baseline-windows-x64.json)。

这是验收环境 A 的 T08 子用例。完整视觉对照、元素裁图、发布包和 Win7 环境仍待执行。

在现代 Windows 的仓库根目录可复现：

```powershell
npm ci
npm run build:all
npm run fixtures -w @genoffice/sheets
node compat/scripts/render-baseline.mjs
```

脚本输出临时结果目录，其中包含 PNG、各命令日志和 `report.json`。运行时版本和上游应用源码在执行前检查。采集新的 A 组证据时先重新构建，再用样本和运行时哈希比较复跑结果。

## W01 运行时验证

原版 Electron 43.8.10 已在 Docker 的 Win7 SP1 x64 上完成启动对照。RT01 在进程创建及导入解析阶段失败。后续使用独立客体副本，依次对照目标系统补丁和兼容层候选。[实测证据](evidence/docker-win7-stock.json) · [后续开发计划](development-roadmap.md)

## W02 PDF profile 的实施切片

1. **建立内部 PNG 请求。** 上游 `renderToPngs` 调用 `exportViaApp` 启动隐藏 Shell，再用 PDFium 生成 PNG。先让非 PDF 渲染使用专用的内部 PNG 操作。Shell 只接受允许的文档类型、页范围、缩放和输出目录，既有路径限制继续生效。优先验证在同一请求内完成打印、栅格化和清理的方式。评估是否可共用现有 PDFium WASM 与 PNG 编码，并明确子进程超时和崩溃后的清理归属。[CLI 渲染](../../packages/cli/src/formats/render.ts) · [子进程协议](../../packages/cli/src/formats/app-export.ts) · [Shell 导出入口](../../apps/shell/src/main/headless-export.ts)
2. **建立编译期能力和执行边界。** 用同一 profile 描述支撑 Shell、CLI、MCP、Skill 和打包。先检查公共 `--headless-export --to pdf`、PDF 签名输入和通用转换调用，再接附件、菜单、文件关联及工具声明。B 组应分别验证受支持的 PNG 路径成功、所有对外 PDF 操作被拒绝。保留上游默认构建供 A 组对照。[文件解析](../../packages/file-parse/src/parse.ts) · [CLI 转换](../../packages/cli/src/commands/convert.ts) · [MCP 工具](../../packages/cli/src/mcp/tools.ts)
3. **核验安装包内容。** 构建前记录 PDFium、HarfBuzz 与 OCR helper 的依赖者。移动或重新引用其他编辑器仍用到的资源，再移出 PDF 模块与 OCR helper。用打包目录运行同一组渲染和拒绝检查，并核对第三方许可。[打包资源](../../apps/shell/electron-builder.cjs)

第一组实现提交以 A/B 可比且 T08 渲染子用例、T13 公共导出和 PDF 输入拒绝子用例通过为目标。随后补齐裁图、异常恢复、各入口和 C 组对照。

## W03–W06 的前置证据

- W03 可独立验证锁定 Rust nightly、自建标准库和两种原生二进制的 PE 导入。目标机再跑 Sidecar 协议与 Excel EMF 往返。
- W04 先冻结 CLI 子命令、退出码和 MCP 工具清单，再在现代 Windows 复核已知的路径、符号链接和 MCP 差异。
- W05 记录 Win7 同环境下的启动、实际隔离和渲染结果，再确定运行时路线。W06 使用该路线的候选构建执行完整 A/B/C 对照。
