$ErrorActionPreference = "Stop"

$sourceDir = Get-Location
$zipName = "shopper_backup.zip"
$exclude = @("node_modules", "dist", ".git", ".gemini", $zipName)

Write-Host "Packaging Shopper to $zipName..."

# Create a temporary directory for staging
$tempDir = Join-Path $env:TEMP "shopper_package_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    # Copy files to temp dir, excluding unwanted items
    Get-ChildItem -Path $sourceDir -Exclude $exclude | ForEach-Object {
        $destination = Join-Path $tempDir $_.Name
        if ($_.PSIsContainer) {
            Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
        }
        else {
            Copy-Item -Path $_.FullName -Destination $destination -Force
        }
    }

    # Remove node_modules and dist from the temp copy if they snuck in (e.g. nested)
    Get-ChildItem -Path $tempDir -Recurse -Include "node_modules", "dist" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    # Create the zip file
    $zipPath = Join-Path $sourceDir $zipName
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath

    Write-Host "Successfully created $zipName"
    Write-Host "You can copy this file to another computer."
}
catch {
    Write-Error "Failed to package application: $_"
}
finally {
    # Cleanup temp dir
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}
