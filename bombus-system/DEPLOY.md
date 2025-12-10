# GitHub Pages 部署指南

## 📋 前置準備

### 1. 確保專案已推送到 GitHub

如果還沒有建立 GitHub 倉庫，請先執行：

```bash
# 初始化 Git（如果還沒有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 在 GitHub 上建立新倉庫後，添加遠端倉庫
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 GitHub
git push -u origin main
```

### 2. 確認 GitHub 倉庫名稱

**重要**：部署前必須知道您的 GitHub 倉庫名稱，因為需要設定正確的 `base-href`。

例如：
- 倉庫名稱：`Bombus` → base-href: `/Bombus/`
- 倉庫名稱：`bombus-system` → base-href: `/bombus-system/`
- 倉庫名稱：`my-angular-app` → base-href: `/my-angular-app/`

## 🚀 部署步驟

### 方法一：使用 npm 腳本（推薦）

#### 步驟 1：修改 base-href

編輯 `package.json`，找到 `build:gh-pages` 腳本，將 `/Bombus/` 改為您的倉庫名稱：

```json
"build:gh-pages": "ng build --configuration production --base-href=/YOUR_REPO_NAME/"
```

例如，如果您的倉庫名稱是 `bombus-system`：

```json
"build:gh-pages": "ng build --configuration production --base-href=/bombus-system/"
```

#### 步驟 2：執行部署

```bash
npm run deploy
```

這個命令會：
1. 建置專案（production 模式）
2. 自動部署到 `gh-pages` 分支

#### 步驟 3：在 GitHub 上啟用 Pages

1. 前往您的 GitHub 倉庫
2. 點擊 **Settings** > **Pages**
3. 在 **Source** 下拉選單中選擇 `gh-pages` 分支
4. 點擊 **Save**

等待幾分鐘後，您的應用將在以下網址運行：
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

### 方法二：使用部署腳本

如果您想使用更靈活的方式，可以使用 `deploy.sh` 腳本：

```bash
# 使用預設倉庫名稱 (Bombus)
./deploy.sh

# 或指定自定義倉庫名稱
./deploy.sh your-repo-name
```

### 方法三：手動部署

```bash
# 1. 建置專案（記得修改 base-href）
ng build --configuration production --base-href=/YOUR_REPO_NAME/

# 2. 部署到 gh-pages 分支
npx angular-cli-ghpages --dir=dist/bombus-system/browser
```

## ⚙️ 配置說明

### base-href 的重要性

`base-href` 必須與您的 GitHub 倉庫名稱匹配，否則資源（CSS、JS、圖片等）將無法正確載入。

**規則**：
- 如果倉庫名稱是 `Bombus`，則 `base-href=/Bombus/`
- 如果倉庫名稱是 `bombus-system`，則 `base-href=/bombus-system/`
- 如果使用自定義域名，則 `base-href=/`

### 修改 base-href 的位置

1. **package.json**（用於部署腳本）
   ```json
   "build:gh-pages": "ng build --configuration production --base-href=/YOUR_REPO_NAME/"
   ```

2. **src/index.html**（用於開發環境）
   ```html
   <base href="/">
   ```
   開發時保持為 `/`，部署時會由建置命令覆蓋。

## 🔧 故障排除

### 問題 1：404 錯誤或空白頁面

**原因**：`base-href` 設定不正確

**解決方法**：
1. 檢查 GitHub 倉庫名稱
2. 確認 `package.json` 中的 `base-href` 與倉庫名稱匹配
3. 重新執行部署

### 問題 2：資源（CSS、JS、圖片）載入失敗

**原因**：路徑不正確

**解決方法**：
1. 確認 `base-href` 設定正確
2. 檢查 `angular.json` 中的 `assets` 配置
3. 確保所有資源使用相對路徑

### 問題 3：路由無法正常工作

**原因**：GitHub Pages 不支援 HTML5 History API

**解決方法**：

選項 A：使用 HashLocationStrategy（推薦）

在 `app.config.ts` 或 `main.ts` 中：

```typescript
import { provideLocationStrategy, HashLocationStrategy } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... 其他 providers
    provideLocationStrategy(HashLocationStrategy)
  ]
};
```

選項 B：配置 404.html 重定向（需要手動建立）

### 問題 4：部署後看不到更新

**原因**：瀏覽器快取

**解決方法**：
1. 清除瀏覽器快取
2. 使用無痕模式訪問
3. 等待幾分鐘（GitHub Pages 需要時間更新）

## 📝 更新部署

每次更新代碼後，只需重新執行：

```bash
npm run deploy
```

或

```bash
./deploy.sh YOUR_REPO_NAME
```

## 🔐 使用 GitHub Actions 自動部署（進階）

如果您想每次推送代碼時自動部署，可以建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:gh-pages
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/bombus-system/browser
```

## 📞 需要幫助？

如果遇到問題，請檢查：
1. GitHub 倉庫名稱是否正確
2. `base-href` 是否與倉庫名稱匹配
3. GitHub Pages 是否已啟用
4. `gh-pages` 分支是否存在
