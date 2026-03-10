# 執行整合測試群組

依照以下流程執行指定的整合測試群組：$ARGUMENTS

## 流程

### 1. 環境審計（修測試前必做）

先驗證環境一致性，不要直接改程式碼：

- 讀取 `server/.env`，確認 `JWT_SECRET`、`PLATFORM_ADMIN_EMAIL`、`PLATFORM_ADMIN_PASSWORD`、`AUTH_RATE_LIMIT` 等變數
- 檢查測試檔案中是否有硬編碼的憑證、API 端點或 tenant slug
- 比對 `.env` 值與測試檔案中使用的值是否一致
- 如有不一致，先回報再修正

### 2. 執行測試

```bash
cd bombus-system/server && node src/tests/$ARGUMENTS
```

### 3. 分析結果

- 如果全部通過，回報通過數量
- 如果有失敗，分析根本原因（優先檢查：憑證不一致 > API 端點錯誤 > 硬編碼值 > 邏輯錯誤）
- 修復後重新執行，反覆迭代直到全部通過

### 4. 回報摘要

以表格格式回報：測試群組名稱、通過/失敗數量、修復的問題

## 可用測試群組

| 指令 | 群組 |
|------|------|
| `test-e2e-flow.js` | 11.1 端對端流程 (41 項) |
| `test-tenant-isolation.js` | 11.2 租戶隔離 (22 項) |
| `test-demo-tenant.js` | 11.3 Demo 租戶 (32 項) |
| `test-permission-inheritance.js` | 11.4 權限繼承 (24 項) |
| `test-audit-logs.js` | 11.5 審計日誌 (34 項) |

## 範例

```
/test-group test-e2e-flow.js
/test-group test-demo-tenant.js
```
