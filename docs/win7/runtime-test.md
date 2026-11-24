# Electron 43.8.10 首轮探针

在现代 Windows x64 的仓库根目录运行 `npm ci`。将 `compat/runtime-probe` 和 `compat/manifest/baseline.json` 按相同相对路径带到目标机，再复制官方 Electron 43.8.10 Windows x64 的完整解包目录。每次记录运行时文件的 SHA-256、Windows 补丁和兼容层配置。[Electron 官方下载](https://github.com/electron/electron/releases/tag/v43.8.10)

在 PowerShell 中把 `C:\runtime\electron.exe` 换成实际路径，当前目录设为含 `compat` 的目录。

```powershell
$probe = (Resolve-Path .\compat\runtime-probe).Path
$env:GENOFFICE_RUNTIME_PROBE_RESULT = Join-Path $env:TEMP ("genoffice-runtime-" + [guid]::NewGuid() + ".json")
$process = Start-Process -FilePath 'C:\runtime\electron.exe' -ArgumentList ('"' + $probe + '"') -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(75000)) {
  throw "探针进程 $($process.Id) 在 75 秒内未退出，请记录进程树后结束该探针进程"
}
$process.ExitCode
if (Test-Path -LiteralPath $env:GENOFFICE_RUNTIME_PROBE_RESULT) {
  Get-Content -LiteralPath $env:GENOFFICE_RUNTIME_PROBE_RESULT
}
```

应用写入 JSON，退出码为 0 表示探针内的检查通过。进程退出时如无 JSON，记录退出码和 Windows 事件日志。每次运行会创建单独的临时 Chromium 配置目录。待进程退出并收集证据后，可以删除 JSON 中 `profileDir` 指向的目录。

| 方案检查 | 当前探针覆盖                                                                |
| -------- | --------------------------------------------------------------------------- |
| RT01     | Electron、Chromium 和 Node 版本。PE 导入与加载器诊断待补。                  |
| RT02     | SQLite 文件创建、写入和查询，以及 SHA-256。TLS、SSE、流和子进程待补。       |
| RT03     | 五个 View 的创建、加载及销毁。切换、重建和弹出窗口待补。                    |
| RT04     | Renderer 可见的隔离标记、Node 全局变量和允许的 IPC。OS 权限及负面用例待补。 |
| RT06     | 隐藏窗口打印到内存并校验 PDF 文件头。PDFium 栅格化和真实 Office 渲染待补。  |

RT05、RT07、RT08 和 RT09 待补。探针需要分别在现代 Windows 对照机、未经兼容配置的 Win7、以及采用候选兼容配置的 Win7 记录一次结果。
