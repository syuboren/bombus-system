# 還原 Demo 種子資料

從 git 追蹤的 JSON 種子檔還原 `tenant_demo.db` 中遺失的業務資料。

## 使用時機

- `seed:verify` 偵測到資料遺失
- 重建資料庫後需要補回 demo 資料
- 架構調整導致部分表被清空

## 流程

### 1. 先驗證現況

```bash
cd bombus-system/server && npm run seed:verify
```

### 2. 執行還原

```bash
cd bombus-system/server && npm run seed:import
```

只會填補空表，不覆蓋既有資料。

### 3. 再次驗證

```bash
cd bombus-system/server && npm run seed:verify
```

### 4. 重啟後端

如果後端正在運行，需要重啟以清除 TenantDBManager 快取：

```bash
# 找到並重啟後端
lsof -ti :3001 | xargs kill 2>/dev/null
cd bombus-system/server && npm run dev &
```

### 5. 回報摘要

| 項目 | 結果 |
|------|------|
| 還原前狀態 | N 張表有資料遺失 |
| 還原表數 | N |
| 還原筆數 | N |
| 驗證結果 | ✅ 全部通過 / ⚠️ 仍有問題 |
| 後端狀態 | 已重啟 / 需手動重啟 |
