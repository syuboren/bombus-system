# 🚀 快速部署指南

## 三步驟完成部署

### 步驟 1：準備 GitHub 倉庫

```bash
# 如果還沒有推送到 GitHub
git add .
git commit -m "準備部署"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 步驟 2：修改倉庫名稱

編輯 `package.json`，將第 8 行的 `/Bombus/` 改為您的實際倉庫名稱：

```json
"build:gh-pages": "ng build --configuration production --base-href=/YOUR_REPO_NAME/"
```

**範例**：
- 如果倉庫名稱是 `bombus-system`，則改為：`--base-href=/bombus-system/`
- 如果倉庫名稱是 `my-app`，則改為：`--base-href=/my-app/`

### 步驟 3：執行部署

```bash
npm run deploy
```

### 步驟 4：啟用 GitHub Pages

1. 前往 GitHub 倉庫的 **Settings** > **Pages**
2. 選擇 **Source**: `gh-pages` 分支
3. 點擊 **Save**

完成！您的應用將在 `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` 運行。

---

## ❓ 常見問題

**Q: 我不知道我的倉庫名稱是什麼？**
A: 查看 GitHub 倉庫的 URL，例如 `https://github.com/username/repo-name`，`repo-name` 就是您的倉庫名稱。

**Q: 部署後出現 404 錯誤？**
A: 檢查 `base-href` 是否與倉庫名稱完全匹配（包括大小寫）。

**Q: 如何更新部署？**
A: 修改代碼後，再次執行 `npm run deploy` 即可。

更多詳細資訊請參考 `DEPLOY.md`

