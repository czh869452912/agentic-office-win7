# Docker 管理的 Win7 开发验证环境

使用 Docker Desktop 的 Linux 引擎运行 `dockurr/windows`，容器内的 QEMU/KVM 启动完整 Windows 7 SP1 x64 客体。现代 Windows 继续负责编译，Win7 客体负责执行探针与候选产物。[Dockur 项目和主机要求](https://github.com/dockur/windows#requirements-) · [Compose 配置](../../compat/win7-lab/compose.yml)

## 当前主机验证

2026-11-24 在 Docker Desktop Linux x86-64 引擎 29.7.2、WSL2 内核 6.6.87.2 上，加载 Intel 的 `kvm_intel` 后，容器成功访问 `/dev/kvm` 和 `/dev/net/tun`。固定镜像内的 QEMU 通过 QMP 报告 `present: true` 和 `enabled: true`。Compose 的只读 ISO 挂载和共享目录已通过预检。直接把系统盘放在 Windows 目录挂载上时，安装停在文件复制 0%。改用 Docker 命名卷后，安装完成。客体启动至 Windows 7 Ultimate SP1 x64 桌面，PowerShell 2.0 成功回传探针的启动错误和运行时哈希。

本机 Docker Desktop 的普通 bridge 网络已验证可以发布回环端口。使用 `internal: true` 网络时，主机未连通发布端口。因此 Compose 使用普通 bridge，控制台只绑定回环地址，默认端口为 `18016`。本机已运行的命名卷实例使用 `http://127.0.0.1:18018/`。正式断网验收另在目标网络条件下执行。

## 首轮客体结果

内置 `cmd.exe` 启动并返回 0。客体记录的原版 Electron SHA-256 与宿主相同，`CreateProcess` 返回 193（`ERROR_BAD_EXE_FORMAT`），探针没有运行。原版 PE 的 OS 和子系统版本均为 10.0。把两项版本字段改为 6.1 的诊断副本可以创建进程，随后以 `0xC0000139` 退出。客体的 `kernel32.dll` 未导出多项 Electron 导入的函数，包括 `GetSystemTimePreciseAsFileTime` 和 `SetProcessMitigationPolicy`。本轮定位到 PE 加载与导入解析阶段，RT02–RT09 仍受阻。[客体证据](evidence/docker-win7-stock.json) · [PE 字段](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) · [Win32 错误码](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-)

## 从仓库根目录准备并启动

在 Docker Desktop 启动后，如果 WSL 后端没有 `/dev/kvm`，在这台 Intel 主机执行 `wsl -d docker-desktop --exec modprobe kvm_intel`。WSL 后端完全重启后重新检查设备。Linux Docker 宿主机可以直接检查 `/dev/kvm`。

首轮运行需要 Windows 7 SP1 x64 ISO。把下列路径换成实际文件。安装介质、测试账号与原始结果留在本机。ISO 和共享目录放在本地工作区，客体磁盘使用 Docker 命名卷。镜像摘要由 Compose 固定。

```powershell
$env:GENOFFICE_WIN7_ISO = (Resolve-Path -LiteralPath 'D:\media\win7-sp1-x64.iso').Path
$env:GENOFFICE_WIN7_LAB = Join-Path (Get-Location).Path 'working_dir\win7-docker'
$env:GENOFFICE_WIN7_PASSWORD = [guid]::NewGuid().ToString('N')
$share = Join-Path $env:GENOFFICE_WIN7_LAB 'shared'
$bundle = Join-Path $share 'runtime-input'
$electronDir = Join-Path $bundle 'electron'

New-Item -ItemType Directory -Force -Path (Join-Path $env:GENOFFICE_WIN7_LAB 'storage'), (Join-Path $bundle 'compat\manifest'), $electronDir | Out-Null
Copy-Item -Path .\node_modules\electron\dist\* -Destination $electronDir -Recurse -Force
Copy-Item -LiteralPath .\compat\manifest\baseline.json -Destination (Join-Path $bundle 'compat\manifest')
Copy-Item -LiteralPath .\compat\runtime-probe -Destination (Join-Path $bundle 'compat') -Recurse -Force
Copy-Item -LiteralPath .\compat\win7-lab\run-runtime-probe.ps1 -Destination $share -Force

Get-FileHash -LiteralPath $env:GENOFFICE_WIN7_ISO -Algorithm SHA256
docker compose -f .\compat\win7-lab\compose.yml config --quiet
docker compose -f .\compat\win7-lab\compose.yml up -d
docker compose -f .\compat\win7-lab\compose.yml logs --tail 60 win7
```

若 `node_modules\electron\dist` 缺失，先在主机运行 `npm ci`。在浏览器打开 `http://127.0.0.1:18016`，等安装完成并进入桌面。首次登录使用 `GenOfficeLab` 和本机设置的密码。原有系统盘会保留安装时的密码。Linux 宿主机可使用外层 SSH 回环转发访问同一端口。[Dockur 自定义 ISO 与共享目录](https://github.com/dockur/windows#how-do-i-install-a-custom-image)

## 开发和验证顺序

| 阶段         | 客体运行                                                                          | 取证                                                                                                  |
| ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 首次对照     | 核实 Win7 6.1.7601、SP1、x64 及已装补丁。在无兼容层的客体先跑官方 Electron 探针。 | 记录 ISO 与 Electron SHA-256、容器镜像摘要、退出码、探针 JSON。若无 JSON，查看 Windows 应用程序日志。 |
| 原生组件     | 运行 Win7 编译的 XLSX Sidecar 和剪贴板辅助程序。                                  | 核对进程加载、样本读写、计算协议和 EMF 往返结果。                                                     |
| 候选构建     | 宿主构建后把产物放到 `shared`，复制到客体本地盘，从同一份客体状态反复运行。       | 按 RT 和 T 用例记录 Shell、CLI、DOCX/XLSX/PPTX PNG、PDF 拒绝与错误清理。                              |
| 兼容条件对照 | 从停止后的基线存储副本启动，只引入一组补丁或兼容条件后复跑。                      | 用同一版本、样本和命令识别行为变化，记录补丁、设置与首个失败点。                                      |

首次在客体中运行以下命令。Dockur 的 `Shared` 默认映射为 `Z:`，实际盘符不同时传入 `-Share`。[Dockur 文件共享](https://github.com/dockur/windows#how-do-i-share-files-with-the-host)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File Z:\run-runtime-probe.ps1 -Scenario stock
```

采集脚本把探针和 Electron 复制到客体本地盘，再把 JSON、OS 信息、补丁列表、运行时哈希和退出结果写入 `shared/evidence/`。若脚本获得退出码但没有 JSON，查看事件查看器中的 Windows 应用程序日志，关联当次启动时间和错误码。可以用 `patched` 或 `compat` 记录对应客体配置。[探针覆盖范围](runtime-test.md)

使用 `docker compose stop` 让客体关机并等待容器停止。关机后备份命名卷中的完整 `storage` 目录，作为可恢复基线。使用不同的 Compose 项目名创建独立系统盘。并行运行时，用 `GENOFFICE_WIN7_PORT` 为各项目分配独立的回环端口。以 VM 结果作为开发门禁和部分 C 组证据，显示驱动、输入法、物理剪贴板、性能和断网交付须在代表性目标机器上验收。[验收矩阵](acceptance.md)
