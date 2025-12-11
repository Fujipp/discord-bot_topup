# Quick Start for Azure Deployment

## 🚀 Fastest Way (2 minutes)

### 1. Go to Azure Portal
https://portal.azure.com

### 2. Create App Service
- Click **Create a resource**
- Search **App Service** → Click **Create**
- Fill form:
  - **Name**: `kanom-roblox`
  - **Runtime**: Node 20 LTS
  - **Region**: Southeast Asia (or your region)
  - **Plan**: B1 Basic ($12/month) or Free
- Click **Create**

### 3. Set Environment Variables
- Go to Web App → **Configuration**
- Click **+ New application setting** for each:
  ```
  DISCORD_TOKEN = <your-bot-token>
  DISCORD_CLIENT_ID = <your-client-id>
  DISCORD_GUILD_ID = <your-guild-id>
  ```
- Click **Save**

### 4. Deploy Code
**Option A: GitHub Actions (Auto-deploy on push)**
- Go to Web App → **Deployment Center**
- Choose **GitHub**
- Select `discord-bot_topup` repo and `main` branch
- Click **Save**
- Done! Every `git push` will auto-deploy

**Option B: Quick ZIP Upload**
```bash
zip -r kanom-roblox.zip . -x "node_modules/*" ".git/*"
# Then upload via Deployment Center → Manual deployment
```

### 5. Verify It's Running
```bash
curl https://kanom-roblox.azurewebsites.net/healthz
# Should return: {"status":"ready",...}
```

## 📋 Using Azure CLI (If Installed)

```bash
# Login
az login

# Create everything at once
az webapp up --name kanom-roblox \
  --resource-group kanom-rg \
  --location southeastasia \
  --sku B1 \
  --runtime "NODE|20-lts"

# Set environment variables
az webapp config appsettings set -g kanom-rg -n kanom-roblox \
  --settings DISCORD_TOKEN="<token>" \
    DISCORD_CLIENT_ID="<id>" \
    DISCORD_GUILD_ID="<guild-id>"

# Deploy
az webapp up --name kanom-roblox --resource-group kanom-rg
```

## 🔗 After Deployment

Your bot will be available at:
- **Web URL**: https://kanom-roblox.azurewebsites.net
- **Health Check**: https://kanom-roblox.azurewebsites.net/healthz
- **Discord**: Use `/setup`, `/payment`, `/user` commands

## ⚠️ Important Notes

1. **First deployment takes 5-10 minutes** (npm install, build, etc.)
2. **Cold start**: First request may take 10-20s if app was stopped
3. **Logs**: Check **Log stream** if bot doesn't start
4. **GitHub Actions**: Create secret `AZURE_WEBAPP_PUBLISH_PROFILE` if using CI/CD

## 💡 Pro Tips

- Enable **Always On** for Web App to prevent cold starts
- Use **B1** tier minimum for production (Free tier stops every 20 min)
- Set up **Application Insights** for monitoring
- Regular backups recommended if using database

## 🆘 If Something Breaks

1. Check **Log stream** in Web App
2. Verify bot token in Configuration
3. Restart app: `az webapp restart -g kanom-rg -n kanom-roblox`
4. Read full guide: `AZURE_DEPLOYMENT.md`
