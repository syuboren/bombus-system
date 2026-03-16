# 驗證 Demo 資料完整性

比對 `tenant_demo.db` 實際資料與 JSON 種子檔 manifest 的預期筆數。

## 使用時機

- 懷疑 demo 資料遺失時
- 架構調整、遷移操作後
- 部署前的健康檢查

## 流程

### 1. 執行驗證

```bash
cd bombus-system/server && npm run seed:verify
```

### 2. 分析結果

- 如果全部 ✅ → 回報「所有 demo 資料完整」
- 如果有 ⚠️ → 列出受影響的表和缺少筆數

### 3. 資料遺失時的處理

如果偵測到資料遺失，詢問使用者是否要執行還原：

```bash
cd bombus-system/server && npm run seed:import
```

還原後自動再跑一次驗證確認修復成功。

### 4. 回報摘要

| 項目 | 狀態 |
|------|------|
| 表完整性 | N/N OK |
| 資料筆數 | actual/expected |
| 整體狀態 | ✅ 完整 / ⚠️ 需要還原 |
