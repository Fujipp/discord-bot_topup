#!/bin/bash

# Azure Web App Deployment Script for kanom-roblox
# Usage: ./deploy.sh [resource-group] [location]

set -e

RESOURCE_GROUP="${1:-kanom-roblox-rg}"
LOCATION="${2:-Southeast Asia}"
TEMPLATE_FILE="./azure/template.json"
PARAMETERS_FILE="./azure/parameters.json"

echo "🚀 Deploying kanom-roblox to Azure..."
echo "📍 Resource Group: $RESOURCE_GROUP"
echo "📍 Location: $LOCATION"

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" || true

# Deploy ARM template
echo "🔨 Deploying resources using ARM template..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$TEMPLATE_FILE" \
  --parameters "$PARAMETERS_FILE" \
  --parameters location="$LOCATION"

# Get the app service name
APP_SERVICE_NAME="kanom-roblox"

# Configure deployment from GitHub
echo "🔗 Configuring GitHub Actions deployment..."
# Note: You need to get the publish profile manually from Azure Portal
# Settings > Deployment Center > GitHub Actions

echo "✅ Deployment complete!"
echo "📱 Web App URL: https://$APP_SERVICE_NAME.azurewebsites.net"
echo ""
echo "Next steps:"
echo "1. Get the publish profile from Azure Portal:"
echo "   - Go to $APP_SERVICE_NAME > Settings > Deployment Center"
echo "   - Select 'GitHub Actions' and get the publish profile"
echo "2. Add it as a secret in GitHub:"
echo "   - GitHub > Settings > Secrets and variables > Actions"
echo "   - Create secret: AZURE_WEBAPP_PUBLISH_PROFILE"
echo "3. Push to main branch to trigger automatic deployment"
