# GenOffice Win7 实施台账

适配分支为 `win7/main`，本轮上游基线为 `99865c27f685f1e7f40d6df273545db8ea86aa17`。版本与锁文件哈希见 [基线清单](../../compat/manifest/baseline.json)，需求及门禁见 [项目索引](README.md)。

| 工作项                  | 阶段   | 状态                                 | 依赖与下一项可验证交付                                                                                                                            |
| ----------------------- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| W00 基线冻结            | P0     | 源码已锁定，A 组对照进行中           | 原版构建通过，T08 渲染子用例已留证。继续核对参数级能力和原版 Windows CLI 差异。                                                                   |
| W01 Electron 探针       | P1     | 桌面 RT01 失败，Node/SQLite 子项通过 | 完成原始、补丁及 VxKex 客体对照。桌面初始化仍受阻。[验证报告](runtime-route-validation.md)                                                        |
| W02 PDF profile         | P2     | 实施评估中                           | A 组 T08 渲染子用例已通过。先验证内部 PNG 请求，再实现面向 T08、T13–T15 的 B 组切片。[实施评估](implementation-assessment.md)                     |
| W03 Win7 原生组件       | P3     | Sidecar 和 EMF 基础用例通过          | 两个 Win7 目标构建通过，验证了 XLSX 数值和公式对照往返及 EMF 剪贴板。缺少 cellStyles 的公式用例失败。[复测记录](native-and-sandbox-validation.md) |
| W04 CLI、MCP 与内网模型 | P3、P5 | CLI 基础往返与 MCP HTTP 子项通过     | Win7 .NET 客户端已完成令牌、会话、工具发现和 XLSX 读取。Node 回环连接与 stdio 待验证。[复测记录](native-and-sandbox-validation.md)                |
| W05 运行时路线决策      | P1、P4 | 桌面异常定位到沙箱初始化             | 已取得匹配符号的首个异常栈，桌面 RT01 仍失败。CLI 已用 Win7 Sidecar 通过工作簿基础往返。[复测记录](native-and-sandbox-validation.md)              |
| W06 离线交付与验收      | P5、P6 | 待集成                               | 依赖 W01–W05 的候选结果。验证 B/C 安装包及支持矩阵，执行 T01–T19 并发出验收报告。                                                                 |

## 已有证据

- 在现代 Windows x64 `10.0.26300` 运行 `npm ci --no-audit --no-fund`（Node `22.21.0`、npm `10.9.4`）及 `npm run build:all` 成功。构建覆盖两个主机 Rust 组件，CLI 可输出版本和帮助。
- 上游 CLI 全套测试首次得到 536 通过、30 失败、25 跳过，另有命名管道占用异常。可见的失败包括路径断言、符号链接权限、MCP 超时和缺少生成的 XLSX 测试样本。生成 Sheets 样本后，重跑 `tests/cli.test.ts` 和 `tests/errors.test.ts`，18 项全部通过。其余失败待复核。[上游 CI 配置](../../.github/workflows/ci.yml)
- 官方 Electron `43.8.10` 在现代 Windows 的探针运行返回 0，五项均通过。`electron.exe` SHA-256 为 `0fafe52005be7e9fa67b5e068d57b38abd63ce24abdaa897113a0c3764f8a363`。[探针覆盖范围](runtime-test.md)
- 原版 Office 渲染的五个子用例通过，包含 DOCX、XLSX 和 PPTX 渲染、`slides render`、越界页码错误及中间 PDF 清理。[实验记录](evidence/render-baseline-windows-x64.json)
