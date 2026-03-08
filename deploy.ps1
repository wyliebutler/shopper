$User = "ubuntu"
$Server = "51.79.55.125"
$RemotePath = "/home/ubuntu/docker/shopper/"

Write-Host "Starting Deployment to $Server..." -ForegroundColor Cyan

# 1. Copy Files
Write-Host "Copying files (client, server, Dockerfile, docker-compose.yml)..." -ForegroundColor Yellow
scp -r client server Dockerfile docker-compose.yml ${User}@${Server}:${RemotePath}

if ($LASTEXITCODE -ne 0) {
    Write-Host "File copy failed!" -ForegroundColor Red
    exit 1
}

# 2. Rebuild on Server
Write-Host "Rebuilding containers on server..." -ForegroundColor Yellow
# We use a single string for the command to avoid parsing issues
$RemoteCommand = "cd ${RemotePath} && docker compose down && docker compose up -d --build"
ssh ${User}@${Server} $RemoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Remote build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Deployment Complete! App is running." -ForegroundColor Green
Write-Host "Check it out at http://shopper.apptests.work" -ForegroundColor Cyan
