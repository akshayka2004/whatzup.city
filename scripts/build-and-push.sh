#!/usr/bin/env bash
# ==============================================================================
# Enterprise SaaS Platform — Docker Build, Tag, and Push Script (Bash/Unix)
# ==============================================================================
set -euo pipefail

# Configuration
DEFAULT_REGISTRY="yourdockerhub"
REGISTRY="${1:-$DEFAULT_REGISTRY}"

echo "=============================================================================="
echo "🚀 SaaS Monorepo: Building & Pushing Production Images to Docker Hub"
echo "   Target Registry/Username: $REGISTRY"
echo "=============================================================================="

# Export DOCKER_REGISTRY so docker-compose.prod.yml picks it up
export DOCKER_REGISTRY="$REGISTRY"

echo "🛠️  Building production-grade images using Docker Compose..."
docker compose -f docker-compose.prod.yml build

echo "📤 Pushing images to Docker Hub..."
docker compose -f docker-compose.prod.yml push

echo "=============================================================================="
echo "🎉 Enterprise SaaS Platform images successfully built and pushed!"
echo "=============================================================================="
