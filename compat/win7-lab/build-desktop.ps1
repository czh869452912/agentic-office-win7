param([switch]$Installer)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$lab = Join-Path $repoRoot 'working_dir/win7-docker/shared/desktop44'
$archive = Join-Path $lab 'runtime.zip'
$runtime = Join-Path $lab 'runtime'
$runtimeUrl = 'https://github.com/e3kskoy7wqk/Electron-for-windows-7/releases/download/v44.2.0/dist.zip'
$archiveHash = 'C50BA2C10C87331AB961F60569E4D906C8514921AC17E138FD0DA21EE4DDB2B1'
$exeHash = '33A06AC72CFB9D923F6C968028036CBE7FA0DE435AB3040669D4C07D317D1365'

New-Item -ItemType Directory -Path $lab -Force | Out-Null
if (!(Test-Path -LiteralPath $archive -PathType Leaf)) {
    curl.exe --fail --location --silent --show-error --retry 2 --output "$archive.partial" $runtimeUrl
    if ($LASTEXITCODE -ne 0) { throw "Win7 Electron download failed (exit $LASTEXITCODE)" }
    if ((Get-FileHash -LiteralPath "$archive.partial").Hash -ne $archiveHash) {
        throw "Unexpected SHA-256 for $archive.partial"
    }
    Move-Item -LiteralPath "$archive.partial" -Destination $archive
}
if ((Get-FileHash -LiteralPath $archive).Hash -ne $archiveHash) {
    throw "Unexpected SHA-256 for $archive"
}
$runtimeExe = Join-Path $runtime 'electron.exe'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
tar.exe -xf $archive -C $runtime
if ($LASTEXITCODE -ne 0) { throw "Win7 Electron extraction failed (exit $LASTEXITCODE)" }
if ((Get-FileHash -LiteralPath $runtimeExe).Hash -ne $exeHash) {
    throw "Unexpected SHA-256 for $runtimeExe"
}

& (Join-Path $PSScriptRoot 'build-native.ps1')
$target = if ($Installer) { 'nsis' } else { 'dir' }
Push-Location (Join-Path $repoRoot 'apps/shell')
try {
    npm run notices
    if ($LASTEXITCODE -ne 0) { throw "Third-party notice generation failed (exit $LASTEXITCODE)" }
    node ../../node_modules/electron-builder/out/cli/cli.js --win $target --x64 --publish never --config ../../compat/win7-lab/desktop-builder.cjs
    if ($LASTEXITCODE -ne 0) { throw "Win7 desktop packaging failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}
if ($Installer) {
    $shellPackage = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'apps/shell/package.json') | ConvertFrom-Json
    $artifact = Join-Path $lab "candidate-build/GenOffice-Win7-x64-Lab-$($shellPackage.version)-Setup.exe"
    Get-Item -LiteralPath $artifact
} else {
    Join-Path $lab 'candidate-build/win-unpacked/GenOffice.exe'
}
