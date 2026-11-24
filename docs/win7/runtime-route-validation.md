# Win7 运行时路线验证

2026-11-24 · Win7 Ultimate SP1 x64，系统版本 6.1.7601。原始客体、补丁客体和兼容层客体使用独立 Docker 命名卷。系统盘在关机后复制。Electron 仍为上游 43.8.10，SHA-256 与原始客体对照一致。[原始客体结果](evidence/docker-win7-stock.json) · [本轮证据](evidence/docker-win7-runtime-route.json)

| 场景                    | 实际观察                                                                                                                                                                                     | 验收结果                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 目标补丁对照            | 安装 KB4490628、KB4474419 v3、KB2670838。重启后确认三项均已安装。直接启动原版 Electron 仍报无效的 Win32 应用，未生成 JSON。                                                                  | RT01 失败。                                           |
| 补丁与 VxKex 应用级配置 | i486/VxKex 1.2.2.2316 CI Release 安装成功。配置仅匹配客体测试目录的 Electron，允许子进程继承，使用 Windows 10 版本报告，关闭应用特定修补。直接创建原版 Electron 进程仍返回 193。             | RT01 失败。                                           |
| 补丁与 VxKex 加载器     | 通过 VxKexLdr 创建了原版 Electron 进程。桌面进程在产生探针 JSON 前退出。首轮追踪得到 `0xFFFF7003`，独立日志记录 Crashpad `not connected`。重启后另一次运行退出 `0x00000001`，依然缺少 JSON。 | 桌面 RT01 失败。RT03–RT09 仍受阻。                    |
| 同一加载器的 RunAsNode  | 两次运行均得到 Electron 43.8.10、Node 24.22.1、SQLite 3.53.4 和 `SELECT 1`。重启复跑通过。                                                                                                   | RT02 的 Node/SQLite 子项通过。                        |
| 上游 CLI `info`         | 在 RunAsNode 中调用构建产物的 `runCli`。DOCX 返回 4 个块，PPTX 返回 5 张幻灯片，两项退出码均为 0。XLSX 返回 3，提示缺少 `xlsx-sidecar`。                                                     | 两个元数据子用例通过。XLSX 依赖 W03 的 Win7 Sidecar。 |

在兼容层客体中尝试补装 KB2533623 时，WUSA 返回 `0x80240017`。客体实测已具备 `AddDllDirectory` 和 `SetDefaultDllDirectories`。进程退出码和日志也证明，兼容层让诊断用 PE 副本以及原版加载器路径越过了早期进程创建问题。Crashpad 消息是当前能观察到的退出症状，触发它的更早异常仍待定位。[适用更新说明](https://support.microsoft.com/en-au/servicing/os/windows/2020/09/2019-sha-2-code-signing-support-requirement-for-windows-and-wsus) · [VxKex 固定版本](https://github.com/i486/VxKex/releases/tag/Version1.2.2.2316)

## 路线判断

这套 Win7 补丁与 VxKex 候选未达到桌面 RT01。桌面路线后续需定位进程初始化异常，取得可用的启动报告后再执行 Renderer 沙箱、IPC 和 Office→PNG 测试。本轮使用默认 Electron 沙箱设置。

CLI 已有可继续验证的运行方式。保留外部加载器和显式 RunAsNode 的组合，用 Win7 目标构建的 XLSX Sidecar 补齐工作簿读取，再验证实际 launcher、文件往返与 MCP。当前通过证据只覆盖 SQLite 与 DOCX/PPTX 元数据。依赖隐藏 Shell 的 PNG 渲染仍随桌面路线验证。[后续开发计划](development-roadmap.md) · [验收矩阵](acceptance.md)
