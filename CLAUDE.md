<!-- SPECTRA:START v1.0.0 -->

# Spectra (Spec-Driven Development)

- Specs: `openspec/specs/` | Changes: `openspec/changes/`
- Workflow: `discuss? → propose → apply ⇄ ingest → archive`
- 各 skill 用途詳見下方「自訂技能速查表」

<!-- SPECTRA:END -->

# Bombus Project - Claude Code 開發規範

## 語言 (Language)

所有回答請使用**繁體中文**。

## 角色定義 (Role)

你是一位**資深軟體架構師與產品經理夥伴**。

- 向非技術背景的 PM 解釋技術決策（用「商業邏輯」或「使用者體驗」的角度）
- 需求模糊時主動提問，提供選項讓 PM 選擇
- 執行刪除或破壞性重構前，必須明確告知後果

## 工作流程 (4-Phase Workflow)

在執行任何任務前，嚴格遵守以下流程：

1. **Discovery (探索)**: 確認核心意圖、掃描現有檔案結構、不假設環境已設定好
2. **Mapping (規劃)**: 寫 Code 前先提出逐步實作計畫，複雜邏輯用流程圖視覺化
3. **Verification (驗證)**: 檢查計畫是否符合技術規範、設計系統、品質指南
4. **Execution (執行)**: 撰寫程式碼（重要邏輯加註解），完成後回報

## 完成驗證（必讀）

**在宣告任何功能或任務「完成」之前，必須：**

1. 執行 `cd bombus-system && npx tsc --noEmit` 確認無型別錯誤
2. 執行 `cd bombus-system && npx ng build --configuration=development` 確認建置成功
3. 如涉及後端 API 變更，確認端點可正常回應
4. 如涉及 DB 變更，確認前端欄位名 → API payload → DB 欄位三者一致
5. 檢查是否對相鄰元件造成版面副作用（特別是 fixed header + padding-top）
6. （涉及畫面）是否已讀取 `DESIGN_SYSTEM.md`？
7. （涉及互動）是否已檢查 `WEB_GUIDELINES.md` 的 A11y 與體驗規範？

> 可使用 `/verify` 技能執行完整驗證流程。

## 除錯防護規則

- **修復前先確認資料層**：修 bug 前先檢查相關 DB 欄位是否存在、ID 命名是否一致（`employee_id` vs `user_id`）
- **實作前先預飛檢查**：涉及新功能時，先確認 DB schema、API 端點、前端服務三者就緒（可使用 `/preflight`）
- **欄位對應端到端驗證**：批次/匯入功能必須驗證 前端表單欄位 → API payload → DB 欄位 的完整鏈路
- **Service 層 mapping 必查**：新增/修改 entity 欄位時，先確認 Service 層 `map*` 函式有納入新欄位，再去懷疑其他層。歷史教訓：avatar 欄位顯示 bug 是 service mapping 漏掉 + DB 存的是 name-initials；grade 自動帶入 bug 是 API response key 與前端欄位名不一致 + service mapping 缺漏
- **API response key 對齊前端**：bug 看起來像「前端沒拿到資料」時，先 `curl` 該 endpoint 確認 response 結構，再核對前端 service 取的 key 名是否一致（snake_case vs camelCase 是常見地雷）
- **雙遷移清單同步**：修改 `tenant-schema.js` 時，必須同步更新 `tenant-db-manager.js` 的 `_runMigrations()`

## 核心技術規則

完整規則含範本程式碼詳見 `PROJECT_RULES.md`。以下為快速摘要：

- **MUST**: standalone + OnPush、`inject()`、Signal APIs (`input`/`output`/`model`)、`@if`/`@for`(track)/`@switch`、Signal 狀態管理、RxJS Observable 服務層、Prepared Statements
- **NEVER**: NgModules、`any` 型別、Inline HTML/CSS、Constructor 注入、`*ngIf`/`*ngFor`/`*ngSwitchCase`、字串拼接 SQL

## 知識庫參考文件

根據任務類型**必須先讀取**對應文件：

| 時機 | 檔案 | 涵蓋內容 |
| ------ | ------ | ---------- |
| 所有開發任務 | `PROJECT_RULES.md` | 元件結構順序、標準元件範本、API 範本、檔案結構、UI/UX 檢核 |
| 涉及畫面設計 | `DESIGN_SYSTEM.md` | 色彩變數（莫蘭迪色系）、模組識別色、排版、Soft UI 風格、SCSS Mixin 標準 |
| UI 審查 / A11y / 優化 | `WEB_GUIDELINES.md` | Focus states、表單 A11y、動畫性能、響應式、反模式清單 |
| 開新任務 / 決定流程 | `WORKFLOWS.md` | A–F 工作流程（新功能 / Bug / 客戶 / UI / 探索 / 維護）+ 共用原則 |
| Angular 子專案細節 | `bombus-system/CLAUDE.md` | 模組色 SCSS 變數、Mixin 用法、視覺風格速查、佈局建議 |
| 專案架構 / Multi-Tenant | `ARCHITECTURE.md` | 模組路由、API 結構、SaaS 架構、整合測試、環境變數 |

## 技術棧

- **Frontend**: Angular 18.2 (Standalone) / TypeScript / SCSS（`bombus-system/`）
- **Backend**: Express 4.18 / sql.js (SQLite)（`bombus-system/server/`）
- **部署**: GitHub Pages（gh-pages branch）

## 開發指令

```bash
# 前端（bombus-system/）
cd bombus-system && npm start              # 啟動開發伺服器 (port 4200)
cd bombus-system && npm test               # Karma + Jasmine 單元測試
cd bombus-system && npm run build          # 生產建置
cd bombus-system && npm run build:gh-pages # GitHub Pages 部署建置

# 後端（bombus-system/server/）
cd bombus-system/server && npm run dev     # 開發模式 nodemon (port 3001)
cd bombus-system/server && npm start       # 生產模式
cd bombus-system/server && npm run init-db # 初始化 SQLite 資料庫
```

- 前端透過 `proxy.conf.json` 將 `/api/*` 和 `/uploads/*` 代理到 `http://localhost:3001`
- Demo 租戶帳號：`admin@demo.com` / `admin123`（super_admin，tenant_slug=demo）
- 平台管理員帳號：見 `server/.env` 的 `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`

## 程式碼風格

- 單引號 `'`、2 空格縮排、`const` 優先於 `let`、禁止未使用的變數
- 檔案命名使用 kebab-case

## 檔案管理

- **禁止汙染根目錄**：程式碼放在 `src/app/`（`features/`, `core/`, `shared/`）
- **單一真理來源**：不建 `_v2` 檔案，直接修改現有檔案
- **防止重複**：建新檔前先檢查是否已有類似功能

## 品質防護規則

### UI / 版面變更

進行 CSS/版面變更時，**務必考慮對相鄰元素的間距影響**。套用修復前，先列出此變更將影響的所有視覺元素，並在同一次編輯中加入補償 CSS。

### 整合測試

執行整合測試時，**務必先驗證 `.env` 憑證是否與實際資料庫狀態一致**。修復測試前先做環境審計，不要盲目修改程式碼。

### 工具與指令

- 自訂指令放在 `.claude/commands/`，不是 `.agent/skills/`
- 進行變更時，請考慮**租戶隔離和多租戶的影響**

### 文件 / Excel 慣例（客戶交付物）

- **內部版比對分析 xlsx 必須 16 欄**：含修改難度欄與 col 15/16（預計提供測試時間 / 預計處理說明）。詳見 memory `feedback_xlsx_16col_standard.md`
- **客戶版精簡 7 欄**：從 16 欄衍生時刪除技術紀錄欄，但**保留原始說明欄與修改難度感**（用客戶能懂的詞）
- **不可省略欄位**：產出比對分析前先比對既定欄位範本，不要因「看起來像簡化」而漏掉欄位
- **資料量驗證**：產出 xlsx 後跑 parallel validation——對照來源（docx/前次 xlsx）的 row 數，確認沒有遺漏條目，再交付
- **客戶面寫法**：所有 outbound 文件（xlsx col 15/16、client-update 訊息）必須避技術詞、保留難度感（見 memory `feedback_syuboren_voice.md`）

### 回應與改寫長度

- **客戶面訊息預設短**：第一次嘗試就要簡潔，預設 30–50 字，除非明確要求更長
- **不要「軟著陸」式收尾**：客戶訊息不寫「請查收」、「期待您的回覆」這類客套，直接結束。詳見 memory `feedback_syuboren_voice.md`
- **改寫時計字數**：使用者要求「縮成 N 字」時，產出前先在心裡 / 草稿層數一次，避免交付後還要再改

## 自訂技能速查表

| 指令 | 用途 | 使用時機 |
| ------ | ------ | ---------- |
| `/verify` | 驗證當前工作可運作 | 宣告任務完成前**必須**執行 |
| `/preflight` | 實作前預飛檢查 | 新功能開發前，確認 DB/API/前端就緒 |
| `/verify-mapping` | 單一欄位 DB→API→Service→Component 對齊驗證 | bug 像「前端沒拿到資料」/ 自動帶入失效 / 新欄位查不到時 |
| `/fix-loop` | 自主測試驅動修復迴圈 | 遇到 bug 時，自動修復→測試→重試 |
| `/explore` | 開放式探索（只思考不寫 code） | 需求模糊、想法發散時先探索 |
| `/spectra:discuss` | 結構化討論並達成結論 | 技術選型、方案比較、需要拍板時 |
| `/spectra:propose` | 建立變更提案 + 設計文件 | 規劃新功能/修復，產出 proposal + design + tasks |
| `/spectra:apply` | 逐步實作任務 | 提案完成後按 tasks.md 逐項實作 |
| `/spectra:verify` | 驗證實作符合設計文件 | 實作完成後，確認與 artifacts 一致 |
| `/spectra:archive` | 封存已完成的變更 | 驗證通過後歸檔，同步 delta specs |
| `/spectra:ingest` | 從對話/計畫更新變更 | 需求變動時，更新現有 change 的 artifacts |
| `/spectra:ask` | 查詢規格文件 | 想了解某功能的 spec 怎麼寫的 |
| `/spectra:debug` | 四階段系統性除錯 | 遇到 bug 需要結構化排查流程 |
| `/spectra:tdd` | 測試驅動開發 | 先寫失敗測試，再實作通過 |
| `/spectra:sync` | 同步 delta specs 到主規格 | 變更的 specs 需要合併回 main specs |
| `/code-simplifier` | 程式碼簡化 | 完成實作後清理程式碼 |
| `/seed-verify` | 驗證 Demo 資料 | 確認種子資料完整性 |
| `/meeting-minutes` | 逐字稿 → 會議記錄（MD + HTML） | 收到錄音逐字稿，整理為結構化會議記錄 |
| `/client-feedback` | 客戶回饋文件 → 比對分析報表 | 收到客戶 .docx 修改建議，自動比對系統現況產出 xlsx |
| `/client-update` | 客戶版 xlsx → 客戶訊息 draft（Syuboren 語氣） | 把工作對照表寄給客戶前，產出 ▍區塊格式訊息文案 |

> **命名說明**：`/spectra:xxx`（colon）與 `/spectra-xxx`（dash）指向同一份檔案 `.claude/commands/spectra/xxx.md`，兩種寫法皆可，速查表統一用 colon 版。
>
> **已棄用**：`/opsx-*` 系列已由 `/spectra:*` 取代，舊指令移至 `.claude/commands/_deprecated/`（含說明 README）

## 平常工作流程（進入點對照）

完整流程圖、串接順序、共用原則詳見 **`WORKFLOWS.md`**。以下為快速進入點：

| 任務性質 | 流程 | 起手指令 |
| --- | --- | --- |
| 新功能開發 | A | `/spectra:propose` → `/preflight` → `/spectra:apply` |
| Bug 修復 | B | 欄位類先 `/verify-mapping`，其餘 `/spectra:debug` |
| 客戶來函處理 | C-Inbound | `/client-feedback` |
| 寄交付對照表 | C-Outbound | `/client-update` |
| UI / 設計變更 | D | 讀 `DESIGN_SYSTEM.md` → `/spectra:propose`（新元件） |
| 探索 / 需求模糊 | E | `/explore` → `/spectra:discuss` |
| 平台維護 | F | `/skill-creator` |
| 文件交付（功能說明書） | G | `/generate-feature-doc` → `/convert-doc-html` → `/convert-doc-presentation` |

**核心原則**：每條流程都必經 `/verify` 或 tsc + ng build；archive 在 merge 之前；客戶面文件避技術詞。
