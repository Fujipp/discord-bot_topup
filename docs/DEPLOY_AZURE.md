# 🚀 การ Deploy Discord Bot ขึ้น Azure Web App

## ข้อมูล Web App
- **ชื่อ Web App**: `kanom-roblox`
- **URL**: https://kanom-roblox.azurewebsites.net
- **Runtime**: Node.js 18 LTS

---

## วิธีที่ 1: Deploy ด้วย Azure CLI (แนะนำ)

### 1️⃣ ติดตั้ง Azure CLI
```bash
# macOS (ใช้ Homebrew)
brew update && brew install azure-cli

# หรือใช้ curl
curl -L https://aka.ms/InstallAzureCli | bash
```

### 2️⃣ Login เข้า Azure
```bash
az login
```

### 3️⃣ ตั้งค่า Subscription (ถ้ามีหลาย subscription)
```bash
# ดู subscription ทั้งหมด
az account list --output table

# เลือก subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 4️⃣ สร้าง Resource Group (ถ้ายังไม่มี)
```bash
az group create \
  --name kanom-roblox-rg \
  --location southeastasia
```

### 5️⃣ สร้าง App Service Plan (ถ้ายังไม่มี)
```bash
az appservice plan create \
  --name kanom-plan \
  --resource-group kanom-roblox-rg \
  --sku B1 \
  --is-linux
```

### 6️⃣ สร้าง Web App
```bash
az webapp create \
  --resource-group kanom-roblox-rg \
  --plan kanom-plan \
  --name kanom-roblox \
  --runtime "NODE:18-lts"
```

### 7️⃣ ตั้งค่า Environment Variables
```bash
# ตั้งค่า config จาก .env ไฟล์
az webapp config appsettings set \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --settings \
    DISCORD_TOKEN="YOUR_DISCORD_TOKEN" \
    CLIENT_ID="YOUR_CLIENT_ID" \
    GUILD_ID="YOUR_GUILD_ID" \
    API_SLIPOK_KEY="YOUR_SLIPOK_KEY" \
    SLIPOK_BRANCH_ID="YOUR_BRANCH_ID" \
    API_TRUEMONEY_KEY_ID="YOUR_TRUEMONEY_KEY" \
    TRUEMONEY_BASE="YOUR_TRUEMONEY_URL" \
    PORT="8080"
```

### 8️⃣ เปิดใช้งาน WebSocket และ HTTP 2.0
```bash
az webapp config set \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --web-sockets-enabled true \
  --http20-enabled true \
  --always-on true
```

### 9️⃣ Deploy โค้ด
```bash
# วิธีที่ 1: Deploy จาก local (zip)
cd /Users/fujipp/Documents/Github/Fujipp/discord-bot_topup
zip -r deploy.zip . -x "*.git*" "node_modules/*" ".env"

az webapp deployment source config-zip \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --src deploy.zip

# วิธีที่ 2: Deploy จาก GitHub
az webapp deployment source config \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --repo-url https://github.com/YOUR_USERNAME/discord-bot_topup \
  --branch main \
  --manual-integration
```

### 🔟 ตรวจสอบ Logs
```bash
# ดู logs แบบ real-time
az webapp log tail \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox

# เปิด log streaming
az webapp log config \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --application-logging filesystem \
  --level information
```

---

## วิธีที่ 2: Deploy ด้วย VS Code Extension

### 1️⃣ ติดตั้ง Extension
- ติดตั้ง **Azure App Service** extension ใน VS Code

### 2️⃣ Login Azure
- กด `Command + Shift + P` → `Azure: Sign In`

### 3️⃣ Deploy
- Right-click บน project folder → **Deploy to Web App**
- เลือก subscription และ Web App ชื่อ `kanom-roblox`

---

## วิธีที่ 3: Deploy ด้วย GitHub Actions (CI/CD)

### 1️⃣ Get Publish Profile
```bash
az webapp deployment list-publishing-profiles \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --xml > publish-profile.xml
```

### 2️⃣ เพิ่ม Secret ใน GitHub
1. ไปที่ GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. เพิ่ม secret ชื่อ `AZURE_WEBAPP_PUBLISH_PROFILE` 
3. Copy เนื้อหาจาก `publish-profile.xml` ใส่เข้าไป

### 3️⃣ สร้าง GitHub Actions Workflow
ไฟล์ `.github/workflows/azure-deploy.yml` ถูกสร้างไว้แล้ว

### 4️⃣ Push โค้ดขึ้น GitHub
```bash
git add .
git commit -m "Setup Azure deployment"
git push origin main
```

GitHub Actions จะ deploy อัตโนมัติทุกครั้งที่ push ขึ้น `main` branch

---

## 🔧 การตั้งค่าเพิ่มเติม

### ตั้งค่า Custom Domain (ถ้าต้องการ)
```bash
az webapp config hostname add \
  --resource-group kanom-roblox-rg \
  --webapp-name kanom-roblox \
  --hostname yourdomain.com
```

### เปิดใช้ SSL Certificate
```bash
az webapp config ssl bind \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --certificate-thumbprint YOUR_THUMBPRINT \
  --ssl-type SNI
```

### Scale Up/Down
```bash
# Scale ขึ้น
az appservice plan update \
  --name kanom-plan \
  --resource-group kanom-roblox-rg \
  --sku S1

# Scale ลง
az appservice plan update \
  --name kanom-plan \
  --resource-group kanom-roblox-rg \
  --sku B1
```

---

## 🐛 Troubleshooting

### ดู Application Logs
```bash
az webapp log download \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --log-file logs.zip
```

### Restart Web App
```bash
az webapp restart \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox
```

### SSH เข้า Container
```bash
az webapp ssh \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox
```

---

## 📊 ตรวจสอบสถานะ

### เช็ค Web App Status
```bash
az webapp show \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox \
  --query state
```

### เปิด Web App ใน Browser
```bash
az webapp browse \
  --resource-group kanom-roblox-rg \
  --name kanom-roblox
```

---

## 💰 ค่าใช้จ่าย

- **B1 Basic**: ~$13/เดือน (1 Core, 1.75GB RAM)
- **S1 Standard**: ~$70/เดือน (1 Core, 1.75GB RAM + Auto-scale)
- **P1V2 Premium**: ~$146/เดือน (1 Core, 3.5GB RAM)

---

## 🔗 ลิงก์ที่เป็นประโยชน์

- [Azure Portal](https://portal.azure.com)
- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [Web App ของคุณ](https://portal.azure.com/#resource/subscriptions/YOUR_SUBSCRIPTION/resourceGroups/kanom-roblox-rg/providers/Microsoft.Web/sites/kanom-roblox)
