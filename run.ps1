$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$localNodeDirectory = Join-Path $projectDirectory '.tools\node-v22.23.4-win-x64'

if (Test-Path -LiteralPath (Join-Path $localNodeDirectory 'node.exe')) {
    $env:Path = "$localNodeDirectory;$env:Path"
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing. Install Node.js 22.12 or newer, then run this helper again.'
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm is missing. Install Node.js with npm, then run this helper again.'
}

Push-Location -LiteralPath $projectDirectory
try {
    if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules'))) {
        Write-Host 'Installing FacultyConnect dependencies...'
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) {
            throw 'Dependency installation failed. Resolve the reported error and run this helper again.'
        }
    }

    Write-Host 'Starting FacultyConnect at http://127.0.0.1:5173. Press Ctrl+C to stop.'
    & npm.cmd run dev
    if ($LASTEXITCODE -ne 0) {
        throw 'The development server stopped with an error. See the output above.'
    }
}
finally {
    Pop-Location
}
