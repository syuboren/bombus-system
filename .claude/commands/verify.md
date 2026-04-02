---
description: "驗證當前工作是否真正可運作 — 在宣告任務完成前必須執行此技能"
---

## 驗證當前工作

你**不得**在未通過以下所有步驟前宣告任何任務為「完成」。

### 步驟 1：型別檢查
```bash
cd bombus-system && npx tsc --noEmit 2>&1 | head -30
```
- 如有錯誤，先修復再繼續

### 步驟 2：建置檢查
```bash
cd bombus-system && npx ng build --configuration=development 2>&1 | tail -20
```
- 確認建置成功，無 ERROR（WARNING 可接受）

### 步驟 3：後端 API 驗證（如涉及後端變更）
- 確認 `server/` 可正常啟動
- 確認修改的 API 端點回傳正確資料結構
- 特別檢查：tenant 隔離、`employee_id` vs `user_id` 一致性

### 步驟 4：資料庫欄位交叉驗證（如涉及資料變更）
- 確認前端欄位名 → API payload 欄位名 → DB 欄位名三者一致
- 確認 `tenant-schema.js` 和 `tenant-db-manager.js` 的遷移清單同步

### 步驟 5：副作用檢查
- 列出此變更可能影響的**相鄰元件或頁面**
- 確認 CSS 變更未遮住內容（特別是 fixed header + padding-top）
- 確認未引入新的 NG8107 或 NG0600 警告

### 報告格式
```
✅ 型別檢查：通過
✅ 建置檢查：通過
✅ API 驗證：[通過/不適用]
✅ 欄位一致性：[通過/不適用]
✅ 副作用檢查：通過
結論：此任務可標記為完成
```

如任何步驟失敗，修復後重新執行整個驗證流程。
