# Win7 桌面候选实测

2026-11-25 在 Docker 的 Windows 7 Ultimate SP1 x64 客体上，直接运行社区移植版 Electron 44.2.0。该构建使用 Chromium 152.0.7977.76 和 Node 24.20.0，分别验证了原版探针和打包后的 GenOffice 0.13.0。启动保留默认沙箱设置，未经过 VxKex 启动器。原版 Electron 43.8.10 的失败结果见此前记录。[候选下载与源码](https://github.com/e3kskoy7wqk/Electron-for-windows-7/releases/tag/v44.2.0) · [原版异常记录](native-and-sandbox-validation.md) · [本轮证据](evidence/win7-desktop-candidate.json)

| 验收项                   | Win7 客体实测                                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RT01–RT04、RT06 探针子项 | 版本匹配，SQLite 读写成功，五个 WebContentsView 加载成功。Renderer 报告沙箱和上下文隔离启用，页面无法直接获取 Node 的 `require`、`process`，受控 IPC 返回 `pong`。隐藏窗口打印生成有效 PDF。                                                       |
| T02、T03–T07 文件子项    | 在同一主窗口打开 DOCX、XLSX、PPTX、Markdown、HTML 和 PDF。DOCX 追加文字，XLSX 修改 A1，PPTX 插入第 6 张幻灯片。三个保存文件均通过 ZIP CRC 校验，预期修改均出现在相应 OOXML 部件。关闭应用后重新启动，重新打开三份保存文件，DOCX 界面显示新增文字。 |
| T08 渲染子项             | 用同一桌面包的 CLI 渲染三个保存文件。DOCX 和 XLSX 各生成 1 张 PNG，PPTX 生成 6 张 PNG。CLI 均返回 0，测试临时目录内的中间 PDF 已清理。                                                                                                             |

包内 CLI 通过 stdio 管道初始化 MCP，列出 32 个工具，调用 `info` 读取保存后的 XLSX 并返回 Sheet1。客户端关闭输入流后，服务端以 0 退出。该记录覆盖 T11 的 stdio 子项。

候选包包含六个编辑器，按 Win7 实验配置省略 Windows OCR 助手。虚拟显卡上观察到 EGL、SwiftShader 和媒体解码初始化错误，基本窗口及渲染仍工作。发布验收还需覆盖 OS 级 Renderer 令牌与 IPC 拒绝、物理显卡、中文输入和剪贴板、内网模型与 MCP 后续场景、复杂文档，以及安装升级回滚。社区运行时及其补丁仍需单独审核。[验收矩阵](acceptance.md)

## 重建与复测

在装有项目锁定依赖和 Win7 Rust 工具链的现代 Windows 构建机，从仓库根目录执行以下命令。构建脚本验证运行时压缩包和 EXE 的 SHA-256，重建 Win7 原生组件，并使用常规 Shell 的模块布局生成解包目录。

```powershell
npm run build:all
pwsh -NoProfile -File .\compat\win7-lab\build-desktop.ps1
```

将 `working_dir/win7-docker/shared/desktop44/candidate-build/win-unpacked` 复制到客体本地盘，再运行其中的 `GenOffice.exe`。通过窗口打开合成样本，在文档中追加文字、在工作簿中修改 A1、在演示文稿中添加一页。分别保存并重新打开，也可使用包内 CLI 对保存的文件执行 `render <file> --out <dir> --json`。[实验环境](docker-lab.md) · [构建脚本](../../compat/win7-lab/build-desktop.ps1)

## Win7 x64 安装候选

用 `pwsh -NoProfile -File .\compat\win7-lab\build-desktop.ps1 -Installer` 生成 `GenOffice-Win7-x64-Lab-0.13.0-Setup.exe`。这是保留六个编辑器的无签名测试安装包，沿用当前 GenOffice 应用标识和 NSIS 安装逻辑，验证在 Win7 专用虚拟机进行。[electron-builder NSIS 配置](https://www.electron.build/v26/docs/nsis/) · [安装实测数据](evidence/win7-installer-candidate.json)

阻断客体的外网路由后，T17 的静默首次安装、同版本覆盖以及静默卸载通过。已安装的应用能显示主窗口，安装目录中的 `genoffice.cmd info` 能读取 DOCX。用户 PATH 中的 CLI 路径随安装添加，随卸载移除。卸载后，位于安装目录外的样本文档与测试配置文件的哈希一致。[安装实测数据](evidence/win7-installer-candidate.json)

### 正式发布的剩余工作

1. 实现统一的 Win7 产品能力配置。依 F10–F11 裁剪 PDF 编辑器、文件关联和对外 PDF 操作，对 GUI、CLI、MCP、Agent 和 IPC 执行拒绝测试，并保留内部 Office 转 PNG。覆盖 T08、T13–T15。
2. 审核并固定社区 Electron 的源码、补丁、许可和后续更新来源。测试 Renderer 的 Windows 令牌、越权 IPC、白名单和内网 TLS。覆盖 RT02、RT04 和 T19。
3. 完成正式包签名并在 Win7 上验证签名信任链。实测交互式安装、标准用户首次启动、跨版本升级与回滚、原有文档关联和并存应用。覆盖 T16–T17。
4. 在代表性 Win7 终端完成 A/B/C 对照。优先验证显卡或软件渲染回退、中文 IME、EMF、复杂文档保真、内网模型及 MCP、持续负载和崩溃恢复。详细门槛见验收矩阵。[验收矩阵](acceptance.md)
