# 環境偵測與檢查

執行環境偵測，確保開發環境設定正確。

## 流程

### 1. 系統環境

執行以下偵測指令：

```bash
uname -a
echo "Shell: $SHELL"
which node npm npx
node --version
npm --version
echo "PATH (前 10 項):"
echo $PATH | tr ':' '\n' | head -10
```

### 2. 專案環境

```bash
cd bombus-system && cat package.json | node -e "const p=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(p);console.log('Angular:', j.dependencies['@angular/core'])"
cd bombus-system/server && cat package.json | node -e "const p=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(p);console.log('Express:', j.dependencies['express'])"
```

### 3. 後端環境變數

檢查 `bombus-system/server/.env` 是否存在且包含必要變數：
- `JWT_SECRET`
- `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_EXPIRES`
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`
- `AUTH_RATE_LIMIT`

**注意**：只檢查變數是否存在，不要輸出敏感值。

### 4. 資料庫狀態

```bash
ls -la bombus-system/server/data/*.db 2>/dev/null || echo "沒有找到資料庫檔案"
```

### 5. 回報摘要

以表格格式回報：

| 項目 | 狀態 | 備註 |
|------|------|------|
| Node.js | ✓/✗ | 版本 |
| Angular | ✓/✗ | 版本 |
| .env | ✓/✗ | 缺少的變數 |
| 資料庫 | ✓/✗ | 檔案列表 |
| PATH | ✓/✗ | 異常項目 |

如有問題，提供修復建議。
