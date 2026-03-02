# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## 核心技術規則

完整規則含範本程式碼詳見 `PROJECT_RULES.md`。以下為快速摘要：

- **MUST**: standalone + OnPush、`inject()`、Signal APIs (`input`/`output`/`model`)、`@if`/`@for`(track)/`@switch`、Signal 狀態管理、RxJS Observable 服務層、Prepared Statements
- **NEVER**: NgModules、`any` 型別、Inline HTML/CSS、Constructor 注入、`*ngIf`/`*ngFor`/`*ngSwitchCase`、字串拼接 SQL

## 知識庫參考文件

根據任務類型**必須先讀取**對應文件：

| 時機 | 檔案 | 涵蓋內容 |
|------|------|----------|
| 所有開發任務 | `PROJECT_RULES.md` | 元件結構順序、標準元件範本、API 範本、檔案結構、UI/UX 檢核 |
| 涉及畫面設計 | `DESIGN_SYSTEM.md` | 色彩變數（莫蘭迪色系）、模組識別色、排版、Soft UI 風格、SCSS Mixin 標準 |
| UI 審查 / A11y / 優化 | `WEB_GUIDELINES.md` | Focus states、表單 A11y、動畫性能、響應式、反模式清單 |
| Angular 子專案細節 | `bombus-system/CLAUDE.md` | 模組色 SCSS 變數、Mixin 用法、視覺風格速查、佈局建議 |

## 技術棧
- **Frontend**: Angular 18.2 (Standalone) / TypeScript / SCSS（`bombus-system/`）
- **Backend**: Express 4.18 / sql.js (SQLite)（`bombus-system/server/`）
- **部署**: GitHub Pages（gh-pages branch）

## 開發指令

### 前端（bombus-system/）
```bash
cd bombus-system && npm start              # 啟動開發伺服器 (port 4200)
cd bombus-system && npm test               # Karma + Jasmine 單元測試
cd bombus-system && npm run build          # 生產建置
cd bombus-system && npm run build:gh-pages # GitHub Pages 部署建置
```

### 後端（bombus-system/server/）
```bash
cd bombus-system/server && npm run dev     # 開發模式 nodemon (port 3001)
cd bombus-system/server && npm start       # 生產模式
cd bombus-system/server && npm run init-db # 初始化 SQLite 資料庫
```

### 開發環境
- 前端開發時透過 `proxy.conf.json` 將 `/api/*` 和 `/uploads/*` 代理到 `http://localhost:3001`
- Demo 帳號：`admin/admin123`（管理員）、`user/user123`（一般使用者）

## 專案架構

### 前端模組結構（src/app/）
```
core/services/      → 全域單例服務（AuthService, SidebarService, NotificationService 等）
shared/components/  → 通用 UI 元件（Header, Sidebar, Pagination, StatusBadge, SignaturePad 等）
features/           → 功能模組（延遲載入）
```

### 功能模組與路由對應
| 路由前綴 | 模組 | 說明 |
|----------|------|------|
| `/employee` | L1 員工管理 | 招募、員工檔案、入職、會議、人才庫 |
| `/competency` | L2 職能管理 | 職等職級、職務說明書、職能框架、評估 |
| `/training` | L3 教育訓練 | 課程、學習地圖、九宮格、人才儀表板 |
| `/project` | L4 專案管理 | 專案列表、損益、報表 |
| `/performance` | L5 績效管理 | 毛利、獎金、目標、評核 |
| `/culture` | L6 文化管理 | 手冊、EAP、獎項、文件 |
| `/public` | 公開路由 | 候選人回覆面試（無需登入） |

### 後端 API 結構（server/src/routes/）
所有 API 以 `/api` 為前綴，主要路由：`/api/grade-matrix`, `/api/job-descriptions`, `/api/competency-mgmt`, `/api/recruitment`, `/api/talent-pool`, `/api/jobs`, `/api/meetings`, `/api/onboarding`, `/api/monthly-checks`, `/api/quarterly-reviews`, `/api/export`, `/api/upload`

### SCSS 樣式系統（src/assets/styles/）
- `_variables.scss` — 色彩、間距、圓角、陰影、斷點
- `_mixins.scss` — 常用 mixin（詳見 `bombus-system/CLAUDE.md` 及 `DESIGN_SYSTEM.md`）
- 每個功能模組 SCSS 頂部定義 `$module-color: $color-lX-xxx;`

## 程式碼風格
- 單引號 `'`、2 空格縮排
- `const` 優先於 `let`
- 禁止未使用的變數
- 檔案命名使用 kebab-case

## 檔案管理
- **禁止汙染根目錄**：程式碼放在 `src/app/`（`features/`, `core/`, `shared/`）
- **單一真理來源**：不建 `_v2` 檔案，直接修改現有檔案
- **防止重複**：建新檔前先檢查是否已有類似功能

## 任務前自我檢核
1. 是否確認過檔案路徑正確？
2. （涉及畫面）是否已讀取 `DESIGN_SYSTEM.md`？
3. （涉及互動）是否已檢查 `WEB_GUIDELINES.md` 的 A11y 與體驗規範？
4. 是否遵循 `PROJECT_RULES.md` 的元件結構順序與命名規範？
