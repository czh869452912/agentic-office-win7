# Win7 桌面异常与原生组件复测

## Electron 桌面

在补丁和 VxKex 1.2.2.2316 客体中，用 Win32 调试事件跟踪此前的 PE 诊断副本。默认沙箱设置下，两次捕获到 Crashpad 退出前的 `0xC0000005`。异常类型为执行访问冲突，地址为 `0xFFFFFFFFFFFFFFFF`。上游 Electron 43.8.10 的符号包与 EXE 的 PDB GUID 和 Age 一致。[Electron 发布及符号](https://github.com/electron/electron/releases/tag/v43.8.10) · [实验数据](evidence/win7-native-and-sandbox.json)

符号栈经过 `PolicyBase::SetupAllInterceptions`、`InterceptionManager::PatchNtdll` 和 `PatchClientFunctions`。源映射定位到 `interception.cc:414`，位于拦截 thunk 设置失败后的 NTSTATUS 转换路径。异常时记录的参数为 `0xC0000035`。同版本的 x64 resolver 在无法识别服务例程时返回该状态，具体失败的 NT 例程及受兼容层影响的指令仍待确认。通过启动器为原版 EXE 调试时只捕获了启动器本身，带符号的调用栈证据来自诊断副本。桌面 RT01 仍失败，Renderer 的实际隔离及 Office 转 PNG 仍受阻。[Chromium 拦截初始化](https://github.com/chromium/chromium/blob/150.0.7871.250/sandbox/win/src/interception.cc#L394-L428) · [x64 服务解析器](https://github.com/chromium/chromium/blob/150.0.7871.250/sandbox/win/src/service_resolver_64.cc#L176-L230)

## XLSX 与 EMF

用固定的 Rust nightly、仓库锁文件和 `x86_64-win7-windows-msvc` 构建两个程序。PE 检查确认均为 AMD64，子系统版本均为 6.0，静态导入表没有 VC Runtime DLL。仅装系统补丁的 Win7 客体中，Sidecar 直接启动并成功响应协议 v1 的 `open`。EMF 助手收到单格测试输入后返回成功，Windows 剪贴板由无 EMF 变为含 EMF，先前写入的文本仍可读取。应用内的真实复制和粘贴仍待验证。[实验数据](evidence/win7-native-and-sandbox.json)

在 VxKex 的 RunAsNode 模式中，以 `XLSX_SIDECAR_PATH` 指向新 Sidecar。原样本成功读元数据并完成数值写入及重新打开。公式对照先向样本副本的 `xl/styles.xml` 加入 Normal `cellStyle`，再执行 `info`、`sheet apply` 和 `sheet read`。写入 `B2=4321` 与 `C2==B2*2` 后，重新打开文件得到 4321 和 8642，并读回公式文本。输入摘要一致，输出归档通过 CRC 检查，无条目增删，内容有变的条目为工作簿和目标工作表 XML。[实验数据](evidence/win7-native-and-sandbox.json)

修复前，缺少 `cellStyles` 的原样本写入公式后无法重算。相同输出在现代 Windows 上由原版 Sidecar 复现，IronCalc 0.9.1 导入器在 `styles.rs:309` 抛出索引越界。带完整样式元数据的对照用例通过。[IronCalc 导入器](https://docs.rs/crate/ironcalc/0.9.1/source/src/import/styles.rs)

### 2026-11-25 原样本公式回归（W03、F03、T04、T07）

Sidecar 现在复用 IronCalc 的导入前兼容处理，在内存副本中为缺少 `cellStyles` 的样式表补入空节点。用固定的 Win7 Rust 工具链重建后，在同一个补丁与 VxKex 客体上，用 Electron RunAsNode 和 CLI 的 `runCli` 对原始 `compatibility-basic.xlsx` 执行 `info`、`sheet apply` 和 `sheet read`。写入 `B2=4321` 和 `C2` 的公式 `=B2*2`，再从输出文件读回 `4321`、`8642` 及原公式。三个命令均返回 0，`sheet apply` 报告 `cached_values: true`。[SpreadsheetML 样式表](https://learn.microsoft.com/dotnet/api/documentformat.openxml.spreadsheet.stylesheet) · [本轮证据](evidence/win7-xlsx-formula-regression.json)

输入文件的 SHA-256 一致，输入和输出各有 14 个 ZIP 条目，均通过 CRC 校验。内容变化仅出现在 `xl/workbook.xml` 与 `xl/worksheets/sheet1.xml`。`xl/styles.xml` 保持字节一致，工作表 XML 含 `<f>B2*2</f><v>8642</v>`。该记录覆盖 T04 的公式缓存和 T07 的单样本 OOXML 保留子项。[回归用例](../../packages/cli/tests/xlsx-recalc-dependents.test.ts)

## MCP HTTP

以打包目录结构启动 CLI 并只绑定客体回环地址。Win7 的 .NET 客户端验证了无令牌请求返回 `401`、会话初始化和工具列表正常，以及上传 XLSX 后调用 `info` 可返回 Sheet1。相同客体中，用 Electron 内置 Node 的 `fetch` 连接另一次已经监听的回环实例时返回 `connect UNKNOWN`。因此 HTTP 服务端子用例通过，Node 客户端故障和 MCP stdio 仍待验证。[实验数据](evidence/win7-native-and-sandbox.json)

## 重建原生候选

从仓库根目录运行以下命令。构建机使用已安装的 MSVC 工具链和 SDK，输出位于 `working_dir/win7-docker/native-build/x86_64-win7-windows-msvc/release`。

```powershell
rustup toolchain install nightly-2026-03-26 --profile minimal --component rust-src
pwsh -File .\compat\win7-lab\build-native.ps1
```

两个目标均使用 `build-std=std,panic_abort`、静态 CRT 和 `--locked`。[Rust Win7 目标说明](https://doc.rust-lang.org/rustc/platform-support/win7-windows-msvc.html)
