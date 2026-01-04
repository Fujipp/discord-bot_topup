# Azure Deployment Guide for kanom-roblox

## Prerequisites

- Azure CLI installed (`az` command)
- Azure subscription
- GitHub repository with this code
- Node.js 20.x environment

## Quick Start - Option 1: Automated Script

```bash
# Make scripts executable
chmod +x scripts/deploy-azure.sh
chmod +x scripts/get-publish-profile.sh

# Deploy to Azure
./scripts/deploy-azure.sh kanom-roblox-rg "Southeast Asia"

# Get publish profile for GitHub Actions
./scripts/get-publish-profile.sh
```

## Quick Start - Option 2: Manual Steps with Azure CLI

### Step 1: Create Resource Group
```bash
az group create \
  --name kanom-roblox-rg \
  --location "Southeast Asia"
```

### Step 2: Deploy using ARM Template
```bash
az deployment group create \
  --resource-group kanom-roblox-rg \
  --template-file azure/template.json \
  --parameters azure/parameters.json
```

### Step 3: Get Publish Profile for CI/CD
```bash
az webapp deployment list-publishing-profiles \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --xml > publish-profile.xml
```

### Step 4: Add GitHub Secret
1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Copy the entire XML content from `publish-profile.xml`

### Step 5: Configure Environment Variables
Azure App Service → Settings → Configuration → Application settings

Add these environment variables:
- `NODE_ENV`: `production`
- `PORT`: `8080`
- `DISCORD_TOKEN`: Your Discord bot token
- `CLIENT_ID`: Your Discord app client ID
- `GUILD_ID`: Your Discord server ID (optional)
- Any other environment variables from your `.env` file

## Deployment Workflow

The GitHub Actions workflow automatically deploys on:
1. Push to `main` branch
2. Manual trigger via `workflow_dispatch`

Check the Actions tab in your GitHub repository to monitor deployments.

## Web App URL

After deployment, your bot API will be available at:
```
https://kanom-roblox.azurewebsites.net
```

Health check endpoints:
- `https://kanom-roblox.azurewebsites.net/` - Simple OK check
- `https://kanom-roblox.azurewebsites.net/healthz` - JSON health status
- `https://kanom-roblox.azurewebsites.net/readyz` - Readiness probe

## Monitoring & Logs

### View Logs
```bash
# Stream logs in real-time
az webapp log tail \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox
```

### Scale Up (if needed)
```bash
az appservice plan update \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox-plan \
  --sku S1  # B1, B2, B3, S1, S2, S3, P1V2, P2V2, P3V2
```

### Restart App
```bash
az webapp restart \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox
```

## Troubleshooting

### App won't start
1. Check logs: `az webapp log tail --resource-group kanom-roblox-rg --name kanom-roblox`
2. Verify environment variables are set correctly
3. Ensure Node.js 20.x is configured

### Health check failing
1. Verify the app is listening on port 8080
2. Check that the `/healthz` endpoint is responding
3. Review application logs for errors

### Connection issues
1. Ensure firewall rules allow your IP
2. Check HTTPS is enabled (it should be by default)
3. Verify DNS propagation: `nslookup kanom-roblox.azurewebsites.net`

## Cost Optimization

Current SKU: **B1** (Basic)
- ~฿100-200/month
- Good for small bots with low traffic

Available SKUs by price/performance:
- **B1**: Basic tier - suitable for testing
- **S1**: Standard tier - production workloads
- **P1V2**: Premium - high performance

## Clean Up

To delete all resources and stop incurring costs:
```bash
az group delete --name kanom-roblox-rg --yes --no-wait
```

## Support

For issues:
1. Check Azure Portal console
2. Review application logs
3. Verify GitHub Actions workflow logs
4. Check Discord.js and Node.js documentation
