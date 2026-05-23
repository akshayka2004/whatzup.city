# ==============================================================================
# Enterprise SaaS Platform - Docker Build, Tag, and Push Script (PowerShell)
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [string]$Registry = "yourdockerhub"
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "SaaS Monorepo: Building and Pushing Production Images to Docker Hub" -ForegroundColor Cyan
Write-Host "Target Registry/Username: $Registry" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# Set environment variable so docker-compose.prod.yml picks it up
$env:DOCKER_REGISTRY = $Registry

Write-Host "Building production-grade images using Docker Compose..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml build

Write-Host "Pushing images to Docker Hub..." -ForegroundColor Gray
docker compose -f docker-compose.prod.yml push

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "Enterprise SaaS Platform images successfully built and pushed!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
