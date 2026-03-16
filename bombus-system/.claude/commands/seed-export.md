# 匯出 Demo 種子資料

將 `tenant_demo.db` 的業務資料匯出為 JSON 種子檔（git 可追蹤）。

## 使用時機

- 架構調整、schema 變更後
- 新增或修改 demo 資料後
- 任何可能影響資料庫結構的操作完成後

## 流程

### 1. 匯出種子檔

```bash
cd bombus-system/server && npm run seed:export
```

### 2. 驗證匯出結果

確認輸出的表數量和筆數合理。檢查 `server/data/seeds/_manifest.json` 的 `totalTables` 和 `totalRows`。

### 3. 回報摘要

以表格格式回報匯出結果：

| 項目 | 數值 |
|------|------|
| 匯出表數 | N |
| 總資料筆數 | N |
| 種子檔目錄 | server/data/seeds/ |

### 4. 提示 git 提交

提醒使用者需要 git commit 種子檔才能生效：

```
記得提交種子檔：
git add bombus-system/server/data/seeds/
git commit -m "chore: update demo seed data"
```

詢問使用者是否要立即提交。
