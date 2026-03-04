# 功能技術文件產生器

分析指定功能的前端、後端、資料庫三層架構，產生結構化技術文件。

## 輸入參數
$ARGUMENTS 應包含：功能名稱（例如：「員工檔案」、「職務說明書」、「職等職級」）

## 執行流程

### Phase 1: 探索 (Codebase Analysis)

**前端**:
- 找出主要頁面/元件（`src/app/features/[feature]/`）
- 檢查 HTML 模板取得中文欄位名稱（UI Labels）
- 找出對應的 Angular Service 及其 API 呼叫

**後端**:
- 找出 API Route Handler（`server/routes/`）
- 追蹤程式邏輯，找到 SQL 查詢或資料庫操作

**資料庫**:
- 找出相關 Tables
- 取得 Schema（欄位名、型別、約束）
- 查詢實際資料範例（使用 sqlite3 或 seed files）

### Phase 2: 欄位對照映射

建立完整的欄位映射表：

| 欄位名稱 (English) | 欄位名稱 (Chinese) | 型別 | 說明 | 範例資料 |
|---|---|---|---|---|
| 從 DB Column 或 Code 變數 | 從 UI Label 或註解 | Data Type | 簡述 | 真實 DB 資料 |

### Phase 3: 文件產出

在 `bombus-system/docs/` 下產生 Markdown 文件，結構如下：

```markdown
# [功能名稱] 系統實作文件

## 1. 程式碼位置
- **前端**: [元件路徑], [Service 路徑]
- **後端**: [Route 路徑], [DB 路徑]

## 2. 資料庫結構與欄位對照
### [Table Name]
| 欄位名稱 (English) | 欄位名稱 (Chinese) | 類型 | 說明 | 範例資料 |
|---|---|---|---|---|

## 3. API Endpoints
| Method | Endpoint | Description |
|---|---|---|

## 4. 實作備註
（特殊邏輯、enum 值、資料關聯等）
```

## 重要規則
- **不要猜測**：欄位名稱必須查看實際 DB schema
- **真實範例**：文件必須包含從資料庫查詢的實際資料範例
- **雙語標註**：一律提供英文（程式碼名）+ 中文（業務名）
