$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$target = 'x86_64-win7-windows-msvc'
$targetDir = Join-Path $repoRoot 'working_dir/win7-docker/native-build'
$originalFlags = $env:CARGO_TARGET_X86_64_WIN7_WINDOWS_MSVC_RUSTFLAGS
$env:CARGO_TARGET_X86_64_WIN7_WINDOWS_MSVC_RUSTFLAGS = '-C target-feature=+crt-static'

try {
    foreach ($component in 'win-clipboard-helper', 'xlsx-engine') {
        $manifest = Join-Path $repoRoot "apps/sheets/native/$component/Cargo.toml"
        cargo +nightly-2026-03-26 build --locked --release -Z build-std=std,panic_abort --target $target --target-dir $targetDir --manifest-path $manifest
        if ($LASTEXITCODE -ne 0) {
            throw "Win7 build failed for $component (exit $LASTEXITCODE)"
        }
    }
} finally {
    $env:CARGO_TARGET_X86_64_WIN7_WINDOWS_MSVC_RUSTFLAGS = $originalFlags
}

Join-Path $targetDir "$target/release"
