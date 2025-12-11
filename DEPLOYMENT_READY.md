# 🚀 Kanom Roblox Bot - Azure Deployment Ready

Your Discord bot is **fully configured and ready to deploy to Azure**!

## 📦 What Was Set Up

### Deployment Files Created
✅ **`.github/workflows/azure-deploy.yml`** - GitHub Actions CI/CD pipeline
✅ **`web.config`** - IIS configuration for Azure App Service  
✅ **`.deployment`** - Azure Kudu deployment settings
✅ **`AZURE_QUICKSTART.md`** - Quick start guide (2 minutes)
✅ **`AZURE_DEPLOYMENT.md`** - Comprehensive deployment guide
✅ **`azure-deploy.sh`** - Pre-deployment validation script

### Pre-requisites
- ✅ `server.js` - Express app listening on `0.0.0.0:8080` (Azure compatible)
- ✅ `package.json` - All dependencies listed
- ✅ `.env.example` - Template for environment variables
- ✅ Health endpoints - `/`, `/healthz`, `/readyz`

## 🚀 Fastest Deployment (Choose One)

### Option 1: Azure Portal (Easiest - No CLI Required)
**Time: ~5 minutes**

1. **Create Web App** in Azure Portal
   - Go to https://portal.azure.com
   - Click "Create a resource" → Search "App Service"
   - **Name**: `kanom-roblox`
   - **Runtime**: Node 20 LTS
   - **Region**: Southeast Asia
   - **Plan**: B1 Basic (recommended) or Free tier

2. **Set Environment Variables**
   - Go to Web App → Configuration → Application settings
   - Add:
     ```
     DISCORD_TOKEN = <your-token>
     DISCORD_CLIENT_ID = <your-client-id>
     DISCORD_GUILD_ID = <your-guild-id>
     ```

3. **Deploy Using GitHub Actions**
   - Go to Web App → Deployment Center
   - Select GitHub
   - Choose repository & main branch
   - Azure auto-generates secrets
   - Done! Every `git push` auto-deploys

### Option 2: Azure CLI (Command Line)
**Time: ~3 minutes**

```bash
# 1. Login
az login

# 2. Create resource group
az group create --name kanom-rg --location southeastasia

# 3. Create App Service Plan
az appservice plan create --name kanom-plan \
  --resource-group kanom-rg --sku B1 --is-linux

# 4. Create Web App
az webapp create --resource-group kanom-rg \
  --plan kanom-plan --name kanom-roblox \
  --runtime "NODE|20-lts"

# 5. Set environment variables
az webapp config appsettings set -g kanom-rg -n kanom-roblox --settings \
  DISCORD_TOKEN="<your-token>" \
  DISCORD_CLIENT_ID="<your-client-id>" \
  DISCORD_GUILD_ID="<your-guild-id>"

# 6. Deploy (creates GitHub Actions workflow automatically)
az webapp deployment github-actions add \
  --repo-url https://github.com/Fujipp/discord-bot_topup \
  --resource-group kanom-rg --name kanom-roblox \
  --branch main --token <your-github-token>
```

### Option 3: ZIP Deploy (Fastest for Testing)
**Time: ~2 minutes**

```bash
# 1. Create ZIP (skip node_modules)
zip -r kanom-roblox.zip . \
  -x "node_modules/*" ".git/*" "*.env" ".env*"

# 2. Deploy via Portal
# - Web App → Deployment Center → Manual deployment
# - Upload the ZIP file
# - Azure auto-runs "npm install"
```

## 📊 Estimated Costs

| Tier | Cost/Month | Recommended For |
|------|-----------|-----------------|
| Free | $0 | Testing only (stops after 20 min idle) |
| B1 | ~$12 | Production bot |
| B2 | ~$29 | High traffic |

**For a Discord bot: Use B1 Basic**

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] **Discord Token**: Get from Discord Developer Portal
- [ ] **Client ID**: From Discord app settings
- [ ] **Guild ID**: Right-click server → Copy Server ID
- [ ] **GitHub Secrets**: If using CI/CD, `AZURE_WEBAPP_PUBLISH_PROFILE` is auto-generated
- [ ] **Internet**: Bot needs outbound access (Discord API, Roblox API)
- [ ] **GitHub**: Repository pushed with deployment files included

## 📈 After Deployment

### Monitor Bot Health
```bash
# Check health endpoint
curl https://kanom-roblox.azurewebsites.net/healthz

# View real-time logs
az webapp log tail -g kanom-rg -n kanom-roblox

# Restart if needed
az webapp restart -g kanom-rg -n kanom-roblox
```

### Common Issues & Fixes

**Issue**: Bot doesn't respond after deploy
- **Fix**: Check Application logs in Web App → Log stream
- Verify `DISCORD_TOKEN` is set correctly
- Restart the app

**Issue**: "App is still starting"
- **Fix**: Normal on first deploy (takes 5-10 min for npm install)
- Wait and refresh

**Issue**: Commands not working
- **Fix**: Ensure `DISCORD_GUILD_ID` matches your test server
- Commands are guild-scoped (not global)

## 🔗 Useful Links

- **Web App**: https://kanom-roblox.azurewebsites.net
- **Health Check**: https://kanom-roblox.azurewebsites.net/healthz
- **Azure Portal**: https://portal.azure.com
- **Discord Dashboard**: https://discord.com/developers/applications
- **Deployment Docs**: See `AZURE_DEPLOYMENT.md`
- **Quick Start**: See `AZURE_QUICKSTART.md`

## 📝 File Reference

| File | Purpose |
|------|---------|
| `.github/workflows/azure-deploy.yml` | Auto-deploy on git push |
| `web.config` | IIS routing configuration |
| `.deployment` | Kudu deployment settings |
| `server.js` | Express HTTP server (required) |
| `index.js` | Discord bot main file |
| `AZURE_QUICKSTART.md` | 2-minute deployment guide |
| `AZURE_DEPLOYMENT.md` | Complete deployment guide |
| `azure-deploy.sh` | Pre-deploy validation script |

## 🆘 Need Help?

1. **Read**: `AZURE_QUICKSTART.md` for quick start
2. **Read**: `AZURE_DEPLOYMENT.md` for full guide
3. **Check**: Web App → Log stream for errors
4. **Restart**: `az webapp restart -g kanom-rg -n kanom-roblox`

## ✨ Next Steps

1. Get your Discord bot credentials
2. Choose deployment method (Portal, CLI, or ZIP)
3. Follow the 2-5 minute setup
4. Test with health endpoint
5. Invite bot to your server and run `/payment`, `/setup`, `/user`

---

**Status**: ✅ Ready to deploy!  
**Last Updated**: December 11, 2025  
**Bot Name**: Kanom Roblox  
**Target Service**: Azure App Service  
**Deployment Methods**: GitHub Actions, Azure CLI, Portal
