#!/bin/bash

# GitHub Pages 部署腳本
# 使用方法: ./deploy.sh [倉庫名稱]

REPO_NAME=${1:-bombus-system}

echo "🚀 開始部署到 GitHub Pages..."
echo "📦 倉庫名稱: $REPO_NAME"

# 建置專案
echo "📦 正在建置專案..."
ng build --configuration production --base-href=/$REPO_NAME/

# 檢查建置是否成功
if [ $? -ne 0 ]; then
  echo "❌ 建置失敗！"
  exit 1
fi

# 部署到 GitHub Pages
echo "🚀 正在部署到 GitHub Pages..."
npx angular-cli-ghpages --dir=dist/bombus-system/browser

if [ $? -eq 0 ]; then
  echo "✅ 部署成功！"
  echo "🌐 您的應用將在以下網址運行："
  echo "   https://syuboren.github.io/$REPO_NAME/"
  echo ""
  echo "⚠️  請記得："
  echo "   1. 在 GitHub 倉庫的 Settings > Pages 中啟用 Pages"
  echo "   2. 選擇 gh-pages 分支作為來源"
else
  echo "❌ 部署失敗！"
  exit 1
fi

