param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('stock', 'patched', 'compat')]
    [string]$Scenario,
    [string]$Share = 'Z:\'
)

$ErrorActionPreference = 'Stop'
$bundle = Join-Path $Share 'runtime-input'
$electronInput = Join-Path $bundle 'electron\electron.exe'
$probe = Join-Path $bundle 'compat\runtime-probe'
if (-not (Test-Path -LiteralPath $electronInput -PathType Leaf)) { throw 'Missing runtime-input\electron\electron.exe' }
if (-not (Test-Path -LiteralPath (Join-Path $probe 'package.json') -PathType Leaf)) { throw 'Missing runtime probe' }

$runName = $Scenario + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$work = Join-Path $env:TEMP ('genoffice-' + $runName)
$evidence = Join-Path (Join-Path $Share 'evidence') $runName
New-Item -ItemType Directory -Path $work, $evidence -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $bundle 'electron'), (Join-Path $bundle 'compat') -Destination $work -Recurse

$electron = Join-Path $work 'electron\electron.exe'
$localProbe = Join-Path $work 'compat\runtime-probe'
$resultPath = Join-Path $work 'runtime-result.json'
$os = Get-WmiObject Win32_OperatingSystem
@(
    "scenario=$Scenario"
    "os=$($os.Caption)"
    "version=$($os.Version)"
    "sp=$($os.ServicePackMajorVersion)"
    "architecture=$($os.OSArchitecture)"
    "powershell=$($PSVersionTable.PSVersion)"
) | Out-File -FilePath (Join-Path $evidence 'environment.txt') -Encoding UTF8
Get-WmiObject Win32_QuickFixEngineering | Select-Object HotFixID, InstalledOn |
    Export-Csv -Path (Join-Path $evidence 'hotfixes.csv') -NoTypeInformation
& certutil.exe -hashfile $electron SHA256 | Out-File -FilePath (Join-Path $evidence 'electron-sha256.txt') -Encoding UTF8

$env:GENOFFICE_RUNTIME_PROBE_RESULT = $resultPath
try {
    $process = Start-Process -FilePath $electron -ArgumentList ('"' + $localProbe + '"') -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(75000)) {
        "timeout pid=$($process.Id)" | Out-File -FilePath (Join-Path $evidence 'launch.txt') -Encoding UTF8
        throw "Probe timed out. Record the process tree before stopping PID $($process.Id)."
    }
    "exitCode=$($process.ExitCode)" | Out-File -FilePath (Join-Path $evidence 'launch.txt') -Encoding UTF8
    if (Test-Path -LiteralPath $resultPath -PathType Leaf) {
        Copy-Item -LiteralPath $resultPath -Destination $evidence
        exit $process.ExitCode
    }
    throw 'The probe exited without JSON. Check the Windows Application event log.'
} catch {
    $_ | Out-String | Out-File -FilePath (Join-Path $evidence 'error.txt') -Encoding UTF8
    throw
} finally {
    Remove-Item Env:GENOFFICE_RUNTIME_PROBE_RESULT -ErrorAction SilentlyContinue
}
