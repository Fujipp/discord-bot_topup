#!/bin/bash

# Get Azure Web App Publish Profile
# Usage: ./get-publish-profile.sh

RESOURCE_GROUP="kanom-roblox-rg"
APP_SERVICE_NAME="kanom-roblox"

echo "🔐 Retrieving publish profile for $APP_SERVICE_NAME..."

az webapp deployment list-publishing-profiles \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --xml

echo ""
echo "✅ Copy the above XML output"
echo "📝 Paste it as a GitHub Secret: AZURE_WEBAPP_PUBLISH_PROFILE"
