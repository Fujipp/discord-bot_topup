#!/bin/bash
# Azure deployment script - Run locally before deploying

set -e

echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi
echo "✅ npm $(npm --version)"

# Check Azure CLI (optional)
if command -v az &> /dev/null; then
  echo "✅ Azure CLI $(az --version | head -1)"
else
  echo "⚠️  Azure CLI not found (optional, install from https://aka.ms/cli)"
fi

# Check git
if ! command -v git &> /dev/null; then
  echo "❌ Git not found"
  exit 1
fi
echo "✅ Git $(git --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check .env file
echo ""
echo "🔐 Checking environment configuration..."
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating template..."
  cat > .env.example << EOF
DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-guild-id-here
PORT=8080
EOF
  echo "📝 Created .env.example - Copy and fill values"
else
  echo "✅ .env file found"
fi

# Test bot locally
echo ""
echo "🧪 Testing bot startup..."
timeout 10 npm start || true

echo ""
echo "✅ Pre-deployment checks complete!"
echo ""
echo "📚 Next steps:"
echo "1. Read AZURE_QUICKSTART.md for deployment instructions"
echo "2. Create Web App named 'kanom-roblox' in Azure Portal"
echo "3. Set environment variables in Web App Configuration"
echo "4. Deploy using GitHub Actions or Azure CLI"
echo ""
echo "🚀 Deploy commands:"
echo "   GitHub Actions: git push to main branch"
echo "   Azure CLI: az webapp up --name kanom-roblox --resource-group kanom-rg"
