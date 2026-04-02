---
description: "實作功能前的預飛檢查 — 驗證資料庫、API、欄位對應是否就緒"
---

## 預飛檢查（Preflight）

在撰寫任何程式碼之前，針對即將實作的功能執行以下檢查：

### 步驟 1：資料庫結構確認
- 讀取 `server/src/db/tenant-schema.js` 中相關資料表的 CREATE TABLE
- 確認需要的欄位都存在
- 如需新增欄位，同時確認 `tenant-db-manager.js` 的 `_runMigrations()` 也有對應遷移

### 步驟 2：API 端點確認
- 讀取對應的 `server/src/routes/*.js` 路由檔
- 確認端點路徑正確（注意：`/api/employee/list` 不是 `/api/employee`）
- 確認 request/response 的欄位名稱與 DB 一致

### 步驟 3：前端服務確認
- 讀取對應的 Angular Service 檔案
- 確認 HTTP 呼叫的 URL 和 payload 與後端 API 一致
- 確認 TypeScript 介面/模型的欄位名與後端回傳一致

### 步驟 4：ID 欄位一致性
- 檢查整條鏈路中 ID 欄位命名：`employee_id` vs `user_id` vs `id`
- 確認 JOIN 條件正確

### 步驟 5：租戶隔離確認
- 確認所有 DB 查詢使用 `req.tenantDB`（非 platform DB）
- 確認路由有 `authMiddleware + tenantMiddleware`

### 報告格式
```
📋 預飛檢查報告
功能：[功能名稱]
涉及資料表：[列出]
涉及 API：[列出]
涉及前端檔案：[列出]

✅ DB 欄位就緒
✅ API 端點就緒
✅ 前端服務就緒
✅ ID 命名一致
✅ 租戶隔離正確

⚠️ 需要先處理的問題：
- [列出任何不一致或缺少的項目]
```

檢查完成後，再開始實作。
