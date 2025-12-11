# Azure Web App Deployment Guide

## Prerequisites
- Azure subscription
- GitHub account (for CI/CD)
- Azure CLI installed (optional but recommended)

## Option 1: Deploy via Azure Portal (Quickest)

### Step 1: Create Web App
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource**
3. Search for **App Service** and click **Create**
4. Fill in the form:
   - **Resource Group**: Create new (e.g., `kanom-rg`)
   - **Name**: `kanom-roblox`
   - **Publish**: Code
   - **Runtime stack**: Node 20 (LTS)
   - **Operating System**: Linux
   - **App Service Plan**: Create new (Standard or Free tier for testing)
5. Click **Review + create** then **Create**

### Step 2: Configure Environment Variables
1. In the Web App (kanom-roblox), go to **Configuration** → **Application settings**
2. Add these environment variables:
   ```
   DISCORD_TOKEN=<your-token>
   DISCORD_CLIENT_ID=<your-client-id>
   DISCORD_GUILD_ID=<your-guild-id>
   PORT=8080
   ```
3. Click **Save**

### Step 3: Deploy Code
#### Option A: GitHub Actions (Recommended)
1. In Web App, go to **Deployment Center**
2. Select **GitHub** as source
3. Authorize and select your repository
4. Branch: `main`
5. Click **Save**
6. Azure will generate a publish profile automatically
7. Push to `main` branch to trigger deployment

#### Option B: Direct ZIP Deploy
1. In your local machine:
   ```bash
   zip -r kanom-roblox.zip . -x "node_modules/*" ".git/*" "*.env"
   ```
2. In Web App, go to **Deployment Center** → **Manual deployment**
3. Upload the ZIP file
4. Azure App Service will run `npm install` automatically

## Option 2: Deploy via Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name kanom-rg --location Southeast Asia

# Create App Service Plan
az appservice plan create \
  --name kanom-plan \
  --resource-group kanom-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group kanom-rg \
  --plan kanom-plan \
  --name kanom-roblox \
  --runtime "NODE|20-lts"

# Set environment variables
az webapp config appsettings set \
  --resource-group kanom-rg \
  --name kanom-roblox \
  --settings \
    DISCORD_TOKEN="your-token" \
    DISCORD_CLIENT_ID="your-client-id" \
    DISCORD_GUILD_ID="your-guild-id" \
    PORT=8080

# Deploy from GitHub
az webapp deployment github-actions add \
  --repo-url https://github.com/Fujipp/discord-bot_topup \
  --resource-group kanom-rg \
  --name kanom-roblox \
  --branch main \
  --token <your-github-token>
```

## Step 4: Monitor Deployment

### Check Deployment Status
1. Go to Web App → **Deployment** → **Deployment Center**
2. View deployment history and logs

### View Real-time Logs
```bash
az webapp log tail --resource-group kanom-rg --name kanom-roblox
```

### Test Health Endpoint
```bash
curl https://kanom-roblox.azurewebsites.net/healthz
```

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application ID |
| `DISCORD_GUILD_ID` | Server ID where commands are registered |
| `PORT` | Should be `8080` (Azure default) |

You can also set these in the `web.config` file or `.env` file committed to the repo (with sensitive values in secrets).

## Troubleshooting

### Bot Not Starting
1. Check **Log stream** in Web App
2. Verify all required environment variables are set
3. Check Discord bot token is valid and has necessary permissions

### Deployment Failed
1. Look at deployment logs in **Deployment Center**
2. Ensure `package.json` and `server.js` are in root directory
3. Run `npm install` locally to verify dependencies

### Connection Issues
1. Ensure bot has correct intents and permissions
2. Check that port binding matches (should be `0.0.0.0:8080`)
3. Verify firewall rules if applicable

## Useful Commands

```bash
# View logs
az webapp log tail --resource-group kanom-rg --name kanom-roblox

# Restart app
az webapp restart --resource-group kanom-rg --name kanom-roblox

# Check app settings
az webapp config appsettings list --resource-group kanom-rg --name kanom-roblox

# View app service plan
az appservice plan show --resource-group kanom-rg --name kanom-plan
```

## Cost Optimization

- **Free tier**: Limited to 1 GB memory, no SLA
- **B1 (Basic)**: ~$12/month, recommended for bots
- **B2/B3**: For higher traffic

For a Discord bot, **B1 tier** is usually sufficient.

## Auto-scaling (Optional)

To enable auto-scaling for higher traffic:

```bash
az monitor metrics alert create \
  --name kanom-roblox-cpu-alert \
  --resource-group kanom-rg \
  --scopes /subscriptions/{subscription-id}/resourceGroups/kanom-rg/providers/Microsoft.Web/serverfarms/kanom-plan \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Node.js on Azure](https://docs.microsoft.com/azure/developer/nodejs/)
- [Discord.js Guide](https://discordjs.guide/)
