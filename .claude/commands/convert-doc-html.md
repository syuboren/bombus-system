# 功能說明書產生器

從 codebase 分析功能模組，撰寫 Markdown 功能說明書，並轉換為設計系統風格的 HTML 文件。

## 輸入參數

$ARGUMENTS 應包含以下格式之一：

- **功能名稱**：如 `員工檔案管理`、`教育訓練` → 從零撰寫 MD + 轉換 HTML
- **既有 MD 檔名**：如 `功能說明書_招募管理與AI智能面試.md` → 僅更新 HTML
- **「全部」**：轉換 docs/ 下所有 `功能說明書_*.md` 檔案為 HTML

## 模組色彩對照

| 代碼 | 色彩名稱 | 主色 | 暗色 | 適用模組 |
|------|----------|------|------|----------|
| L1 | sage (鼠尾草) | #8DA399 | #6B8577 | 員工管理 |
| L2 | terracotta (赤陶) | #D6A28C | #B8876E | 職能管理 |
| L3 | petrol (石油藍) | #7F9CA0 | #5F7C80 | 教育訓練 |
| L4 | mauve (藕紫) | #9A8C98 | #7A6C78 | 專案管理 |
| L5 | brick (磚紅) | #B87D7B | #9A5F5D | 績效管理 |
| L6 | rose (玫瑰) | #C4A4A1 | #A6867E | 文化管理 |

---

## Phase A：撰寫功能說明書（Markdown）

> 若 `$ARGUMENTS` 是既有 `.md` 檔名，跳至 Phase B。

### A1. Codebase 探索

**前端**：
- 找出目標功能的頁面元件（`src/app/features/[module]/`）
- 讀取 HTML 模板取得中文欄位名稱（UI Labels）
- 找出對應的 Angular Service 及 API 呼叫
- 梳理 routing 結構（側邊欄導覽路徑）

**後端**：
- 找出 API Route Handler（`server/src/routes/`）
- 追蹤 SQL 查詢邏輯，理解資料流

**資料庫**：
- 找出相關 Tables 的 Schema（`server/src/db/tenant-schema.js`）
- 查詢 seed 資料範例（`server/data/seeds/`）

### A2. 撰寫 Markdown 說明書

在 `bombus-system/docs/` 下建立 `功能說明書_<功能簡稱>.md`，遵循以下結構：

```markdown
# Bombus 人力資源管理系統
# 功能說明書：<功能完整名稱>

---

## 文件資訊

| 項目 | 內容 |
|------|------|
| 文件名稱 | <完整說明書名稱> |
| 適用模組 | <模組名稱（Lx）> <子模組列表> |
| 適用對象 | <目標使用者角色> |
| 文件版本 | v1.0 |

---

## 目錄

1. [文件目的與適用範圍](#一文件目的與適用範圍)
2. [系統導覽與入口說明](#二系統導覽與入口說明)
3. ...（依功能拆分部分）
N-1. [AI 服務功能缺口分析](#第N部分ai-服務功能缺口分析)
N. [附錄](#附錄)

---

## 一、文件目的與適用範圍
### 1.1 文件目的
### 1.2 適用範圍

## 二、系統導覽與入口說明
### 2.1 主要功能入口（表格：功能模組 / 導覽路徑 / 路由 / 說明）
### 2.2 頁面功能架構（樹狀結構 tree block）

## 三、<前置說明或角色權責>（視功能而定）
### 角色權責表格 或 模組關聯說明

## 第一部分：<核心功能 A>
### 功能總覽
### 欄位規格（表格：欄位 / 類型 / 必填 / 說明 / 範例）
### 操作流程（Mermaid flowchart）
### 畫面操作說明
### 注意事項（blockquote → 說明方塊）

## 第二部分：<核心功能 B>
（同上結構）

## 第 N-1 部分：AI 服務功能缺口分析
### 已實現功能（表格：功能 / 狀態 / 說明）
### 待開發功能（表格：功能 / 優先級 / 預期效益）

## 附錄
### 附錄 A：狀態碼/Enum 對照表
### 附錄 B：API 端點一覽（表格：Method / Endpoint / 說明）
### 附錄 C：資料庫結構（表格：欄位 / 類型 / 說明）
```

### A3. 撰寫準則

- **目標讀者是 PM / HR**：用業務語言，避免純技術用語
- **每個功能的操作步驟**：以 Mermaid flowchart 視覺化
- **欄位規格表**：必須從實際 DB schema 與 UI 交叉比對，不得猜測
- **AI 功能缺口分析**：誠實標註「已實現」vs「目前模擬」vs「待開發」
- **善用 blockquote**：重要提示、業務邏輯白話解說用 `>` blockquote
- **頁面功能架構**：使用 `├──` / `└──` 樹狀結構呈現
- **流程圖語法**：使用 mermaid（`graph TD` 或 `flowchart TD`），轉 HTML 後會渲染為程式碼方塊

### A4. 進入驗證

撰寫完成後，告知使用者 Markdown 檔案路徑，然後**自動進入 Phase V 進行平行驗證**。

---

## Phase V：平行專家驗證

> Phase V 在 MD 撰寫完成後自動執行。若 `$ARGUMENTS` 是既有 `.md` 檔名（僅轉換 HTML），跳過本階段。

### V1. 啟動 4 位專家 Agent（平行執行）

使用 Task 工具**同時**（在同一則訊息中）啟動以下 4 位驗證專家，每位使用 `subagent_type: "Explore"`。

**重要**：4 個 Task 呼叫必須放在同一則訊息中，確保平行執行。每位專家需讀取剛產生的 MD 檔案，再與 codebase 交叉比對。

---

#### 專家 1：API 端點驗證專家

```
prompt 模板：

你是 API 端點驗證專家。請執行以下步驟：

1. 讀取 `bombus-system/docs/功能說明書_<名稱>.md`
2. 從「附錄 B：API 端點一覽」中提取所有 API 端點（Method + Path）
3. 在 `bombus-system/server/src/routes/` 目錄中搜尋每個端點：
   - 確認路由是否存在（搜尋 router.get/post/patch/put/delete + 對應路徑）
   - 確認 HTTP Method 是否正確
   - 確認路由描述是否與實際 handler 邏輯一致
4. 同時檢查正文中提到的所有 `/api/...` 路徑是否與附錄一致

輸出格式（嚴格遵守）：

## API 端點驗證報告

### 通過 ✅
- `GET /api/xxx` — 存在於 competency.js:L行號

### 差異 ⚠️
- `GET /api/xxx` — MD 寫 `描述A`，實際為 `描述B`
  - 建議修正：將「描述A」改為「描述B」

### 不存在 ❌
- `DELETE /api/xxx` — 在 routes/ 中找不到此端點
  - 建議：從附錄中移除

### 遺漏 📝
- `GET /api/yyy` — 存在於程式碼但 MD 未記載
  - 建議：補充至附錄 B
```

---

#### 專家 2：DB Schema 驗證專家

```
prompt 模板：

你是 DB Schema 驗證專家。請執行以下步驟：

1. 讀取 `bombus-system/docs/功能說明書_<名稱>.md`
2. 從「附錄 C：資料庫結構」中提取所有表名與欄位定義
3. 讀取 `bombus-system/server/src/db/tenant-schema.js`，找到對應的 CREATE TABLE 語句
4. 逐一比對：
   - 表名是否存在
   - 每個欄位名稱、資料類型、約束（PK, NOT NULL, FK, UNIQUE, DEFAULT）是否正確
   - 是否有遺漏的欄位（schema 有但 MD 沒寫）
   - 是否有多餘的欄位（MD 有但 schema 沒有）
5. 同時檢查正文中提到的欄位名稱是否與 schema 一致

輸出格式（嚴格遵守）：

## DB Schema 驗證報告

### 通過 ✅
- 表 `xxx`：全部 N 個欄位正確

### 差異 ⚠️
- 表 `xxx`.`欄位` — MD 寫類型 `TEXT`，schema 實際為 `INTEGER`
  - 建議修正：...

### 遺漏 📝
- 表 `xxx`.`欄位` — schema 中存在但 MD 未記載
  - 建議：補充至附錄 C

### 多餘 ❌
- 表 `xxx`.`欄位` — MD 有記載但 schema 中不存在
  - 建議：從附錄中移除
```

---

#### 專家 3：前端 UI 驗證專家

```
prompt 模板：

你是前端 UI 驗證專家。請執行以下步驟：

1. 讀取 `bombus-system/docs/功能說明書_<名稱>.md`
2. 提取所有提到的：
   - 路由路徑（如 `/competency/assessment`）
   - 頁面功能架構（樹狀結構）
   - 頁籤名稱、按鈕文字、篩選條件標籤
   - 表格欄位的中文標籤
3. 在前端 codebase 中驗證：
   - 路由：檢查 `*.routes.ts` 中的 path 定義
   - UI 標籤：搜尋 `*.component.html` 模板中的中文文字
   - 按鈕與操作：確認按鈕文字存在於模板中
   - 篩選條件：確認 select/dropdown 選項存在
4. 驗證頁面功能架構的層級結構是否與路由和元件結構一致

輸出格式（嚴格遵守）：

## 前端 UI 驗證報告

### 通過 ✅
- 路由 `/xxx` — 存在於 xxx.routes.ts
- 標籤「月度檢核」— 存在於 xxx.component.html

### 差異 ⚠️
- 標籤「xxx」— MD 寫法為「A」，模板實際為「B」
  - 建議修正：...

### 找不到 ❓
- 標籤「xxx」— 未在任何 .html 模板中找到（可能為動態產生）
```

---

#### 專家 4：流程邏輯驗證專家

```
prompt 模板：

你是流程邏輯驗證專家。請執行以下步驟：

1. 讀取 `bombus-system/docs/功能說明書_<名稱>.md`
2. 提取所有：
   - 狀態流程（狀態碼、轉換條件、轉換方向）
   - 計算公式（加權、總分、百分比等）
   - 業務規則（唯一約束、簽名要求、退回清除邏輯等）
3. 在後端路由（`server/src/routes/`）中驗證：
   - 狀態轉換：搜尋 status 相關的 UPDATE/IF 邏輯，確認轉換方向與條件
   - 計算公式：找到計算 total_score/weighted_score 的程式碼，驗證公式正確性
   - 業務規則：確認簽名必填、退回清除、唯一約束等邏輯存在
4. 比較 Mermaid 流程圖描述的狀態機與程式碼實際邏輯

輸出格式（嚴格遵守）：

## 流程邏輯驗證報告

### 通過 ✅
- 狀態 `self_assessment → manager_review`：邏輯正確（competency.js:L行號）
- 計算公式 `Σ(score × points/total) × 20`：與程式碼一致

### 差異 ⚠️
- 狀態 `xxx → yyy` — MD 描述的條件與程式碼不符
  - MD：「需要簽名才能提交」
  - 程式碼：無簽名驗證
  - 建議修正：...

### 無法驗證 ❓
- 規則「逾期判定為每月5號」— 程式碼中未找到硬編碼截止日
```

---

### V2. 彙整驗證結果

收到 4 位專家報告後，彙整為驗證摘要表：

```markdown
## 驗證摘要

| 專家 | ✅ 通過 | ⚠️ 差異 | ❌ 不存在/多餘 | ❓ 待確認 |
|------|---------|---------|----------------|----------|
| API 端點 | X | X | X | X |
| DB Schema | X | X | X | X |
| 前端 UI | X | X | X | X |
| 流程邏輯 | X | X | X | X |
| **合計** | **X** | **X** | **X** | **X** |
```

### V3. 自動修正差異項目

- 若有 ⚠️ 差異或 ❌ 不存在/多餘項目，**自動修正 MD 檔案**
- 修正完成後列出所有變更清單

### V4. 向使用者回報

將以下內容呈現給使用者：
1. 驗證摘要表
2. 已自動修正的項目清單（若有）
3. ❓ 待確認項目（需使用者判斷）
4. 詢問是否確認後進入 Phase B 轉換 HTML

---

## Phase B：轉換為 HTML

### B1. 確認 marked 套件已安裝

```bash
cd bombus-system && node -e "require('marked')" 2>/dev/null && echo 'OK' || npm install --no-save marked
```

### B2. 執行轉換

```bash
cd bombus-system && node docs/_convert-md-to-html.js "<md-filename>" [L1|L2|L3|L4|L5|L6]
```

模組代碼可省略，腳本會自動從內容偵測。

### B3. 驗證結果

確認輸出的統計數據：
- 行數 / 檔案大小
- 表格、章節、說明、流程圖、樹狀結構數量
- 殘留 `**bold**` markdown 語法數（應為 0）

### B4. 回報摘要

以表格格式回報：

| 檔案 | 模組 | 大小 | 表格 | 章節 | 說明 | 流程圖 |
|------|------|------|------|------|------|--------|
| 功能說明書_xxx.html | Lx | xx KB | N | N | N | N |

---

## 重要規則

- **不要猜測**：欄位名稱、API 路徑必須從實際 codebase 查證
- **Markdown 格式嚴格遵守**：前兩行 `# 標題`、文件資訊表格、目錄、`## 一、` 開頭的正文 — 轉換腳本依此結構解析
- 腳本自動處理：表格包裝 `.table-wrapper`、Mermaid → `.flowchart`、樹狀 → `.tree`、blockquote → `.note`
- `marked` 套件使用 `--no-save` 安裝，不寫入 package.json
- 若轉換有問題（殘留 markdown、表格異常），檢查 `docs/_convert-md-to-html.js` 並修復
