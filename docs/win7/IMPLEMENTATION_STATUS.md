# GenOffice Win7 实施状态

基线为 `99865c27f685f1e7f40d6df273545db8ea86aa17`，适配分支为 `win7/main`。对应的 Git 标签和锁文件校验值见 [基线清单](../../compat/manifest/baseline.json)。

| 任务                    | 状态                                       | 证据或前置依赖                                                                                                                                                           |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W00 基线冻结            | 已锁定源码和三个锁文件。                   | 对齐上游 `main`，在 Windows x64 `10.0.26300` 上用 Node `22.21.0` 和 npm `10.9.4` 执行 `npm ci --no-audit --no-fund` 成功。源码入口见 [首轮方案评审](upstream-audit.md)。 |
| W01 Electron 探针       | 现代 Windows 初版探针通过，Win7 尚未执行。 | 官方 Electron `43.8.10` 返回退出码 0，JSON 中 5 项均为 `pass`。检查范围和运行方法见 [探针说明](runtime-test.md)。需要 Win7 SP1 x64 VM 或实机完成对照。                   |
| W02 PDF profile         | 尚未实施。                                 | 待验证真实 Office 文档到 PNG 的路径、共享资源和公开调用边界。                                                                                                            |
| W03 Win7 原生组件       | 尚未实施。                                 | 待验证固定 Rust 工具链、Win7 target 构建、PE 导入和实机行为。                                                                                                            |
| W04 CLI、MCP 与内网模型 | 尚未实施。                                 | 待完成命令、工具及参数级基线清单与契约测试。                                                                                                                             |
| W05 运行时路线决策      | 尚未形成。                                 | 需要 Win7 探针和运行时完整门禁的结果。                                                                                                                                   |
| W06 离线交付与验收      | 尚未实施。                                 | 依赖运行时、profile、原生组件和集成结果。                                                                                                                                |

## 现代 Windows 基线验证

- `npm run build:all` 成功，包含 XLSX Sidecar 和 EMF Helper 的主机构建。CLI 构建产物能输出版本和帮助。未生成安装包。
- 上游 CLI 全套测试首次运行得到 536 通过、30 失败、25 跳过，另有一条命名管道占用异常。可见的失败包括路径断言、符号链接权限、MCP 超时和缺少生成的 XLSX 测试样本。
- 执行 `npm run fixtures -w @genoffice/sheets` 后，重跑 `tests/cli.test.ts` 和 `tests/errors.test.ts`，18 项全部通过。其余失败仍需复核。上游 CI 当前运行于 Ubuntu，Windows 回归需单独记录。[上游 CI 配置](../../.github/workflows/ci.yml)
- 探针使用的 `electron.exe` SHA-256 为 `0fafe52005be7e9fa67b5e068d57b38abd63ce24abdaa897113a0c3764f8a363`。
