# 功能說明書 → 簡報 HTML 產生器

將功能說明書（Markdown）轉換為投影片風格的 HTML 簡報，使用 Bombus 系統莫蘭迪色系配色。

## 輸入參數

`$ARGUMENTS` 應包含以下資訊（以空行分隔）：

1. **來源文件路徑**：功能說明書 `.md` 檔案路徑（相對於 `bombus-system/docs/` 或絕對路徑）
2. **簡報大綱**（選填）：使用者提供的自訂大綱。若未提供，則從 MD 文件自動分析產生大綱

範例：
```
bombus-system/docs/功能說明書/功能說明書_招募管理與AI智能面試.md

簡報主題：Bombus 招募與 AI 智能面試
目標聽眾：HR 團隊、部門主管
一、開場：系統導入背景
二、七大階段總覽
...
```

---

## 設計規範

### 配色系統（Bombus 莫蘭迪色系）

所有色彩使用 CSS 變數，**禁止硬編碼 hex 值**於 HTML 內容中：

```css
:root {
  /* Neutrals */
  --bg-base: #F5F5F7;
  --bg-card: #FCFCFD;
  --text-primary: #464E56;
  --text-secondary: #6B7280;
  --text-dark: #1F2937;
  --border: #E2E4E8;
  --soft-gray: #E8E8EA;

  /* Brand */
  --brand-main: #64748B;
  --brand-light: #94A3B8;
  --brand-dark: #475569;

  /* Module Colors */
  --l1-sage: #8DA399;       --l1-sage-dark: #6B8577;
  --l2-terracotta: #D6A28C; --l2-terracotta-dark: #B8876E;
  --l3-petrol: #7F9CA0;     --l3-petrol-dark: #5F7C80;
  --l4-mauve: #9A8C98;      --l4-mauve-dark: #7A6C78;
  --l5-brick: #B87D7B;      --l5-brick-dark: #9A5F5D;
  --l6-rose: #C4A4A1;       --l6-rose-dark: #A6867E;

  /* Status */
  --success: #7FB095;
  --warning: #E3C088;
  --danger: #C77F7F;
  --info: #8DA8BE;

  /* Visual */
  --radius: 12px;
  --shadow: 0 4px 20px rgba(0,0,0,0.05);
}
```

### 模組色彩對照（簡報中需對應使用）

| 模組 | 主色變數 | 適用情境 |
|------|----------|----------|
| L1 員工管理 | `--l1-sage` | 招募、員工、入職 |
| L2 職能管理 | `--l2-terracotta` | 職等、JD、評估 |
| L3 教育訓練 | `--l3-petrol` | 課程、學習、九宮格 |
| L4 專案管理 | `--l4-mauve` | 專案、損益 |
| L5 績效管理 | `--l5-brick` | 毛利、獎金、評核 |
| L6 文化管理 | `--l6-rose` | 手冊、EAP、獎項 |

---

## 視覺風格規則

### 必須遵守

- **Soft UI 風格**：圓角 12px、柔和陰影、充分留白（24px padding）
- **一般資訊科技風格**，減少 AI 感設計（禁止漸層發光、粒子動畫、科技感裝飾）
- **卡片不使用左側色條**（`border-left`）：改用淺底色 tint 區分
  - `.card-tint-sage { background: rgba(141,163,153,0.07); }`
  - `.card-tint-info { background: rgba(141,168,190,0.07); }`
  - `.card-tint-brand { background: rgba(100,116,139,0.06); }`
  - 依此類推各色
- **Badge 標籤**：圓角 16px、15% 透明度底色、深色文字
- **表格**：thead 使用 brand-main 底線（2px）、tbody 使用 soft-gray 分隔線
- **進度條**（meter）：7px 高度、圓角 4px
- **SVG 圖示**：stroke-width 1.8、outline 風格、使用對應模組色

### 禁止

- 漸層背景、發光效果、3D 陰影
- Emoji（除非使用者明確要求）
- 過度裝飾的圖標或插圖
- border-left 色條裝飾

---

## HTML 結構規範

### 整體架構

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{簡報標題}</title>
  <style>
    /* CSS 變數 + 完整樣式 — 全部內嵌，零外部依賴 */
  </style>
</head>
<body>
  <div class="deck" id="deck">
    <section class="slide cover active" data-slide="0">...</section>
    <section class="slide" data-slide="1">...</section>
    <!-- ... -->
  </div>
  <div class="nav-bar"><!-- 導覽列 --></div>
  <script>/* 切換邏輯 */</script>
</body>
</html>
```

### 每頁投影片結構

```html
<section class="slide" data-slide="{N}">
  <span class="section-label">{階段標籤}</span>
  <h2>{頁面標題}</h2>
  <p class="subtitle" style="...">{副標（選填）}</p>

  <div class="grid-2 gap-24">
    <!-- 左欄 -->
    <div class="flex-col gap-16">
      <div class="card">...</div>
      <div class="card card-tint-sage">...</div>
    </div>
    <!-- 右欄 -->
    <div class="flex-col gap-16">
      <div class="card">...</div>
    </div>
  </div>
</section>
```

### 封面頁結構

```html
<section class="slide cover active" data-slide="0">
  <div class="cover-logo">BOMBUS HRM</div>
  <h1>{主標題}</h1>
  <p class="subtitle">{副標題}</p>
  <div class="cover-meta">
    <span>適用對象：{角色}</span>
    <span>模組：{模組名稱}</span>
  </div>
  <div class="cover-accent">
    <!-- 3 個 SVG icon 裝飾 -->
  </div>
</section>
```

### 導覽列 + JavaScript

必須包含：
- 底部導覽列（上一頁 / 頁碼指示 / 下一頁）
- 鍵盤控制（← → 切頁、Home/End 跳頭尾）
- 觸控滑動支援
- 列印支援（`@media print`）

---

## 可用的 CSS 元件清單

### 佈局
| Class | 用途 |
|-------|------|
| `.grid-2` / `.grid-3` / `.grid-4` | 等寬欄位佈局 |
| `.flex-col` | 垂直排列 |
| `.gap-8` ~ `.gap-24` | 間距 |

### 卡片
| Class | 用途 |
|-------|------|
| `.card` | 標準白色卡片（shadow + radius） |
| `.card-sm` | 小型卡片（較少 padding） |
| `.card-tint-{color}` | 淺底色卡片（sage/info/brand/warning/danger/success/terra/petrol） |
| `.highlight-box` | 強調框（淺底 + 邊框） |

### 文字
| Class | 用途 |
|-------|------|
| `.section-label` | 頁面左上角階段標籤（小型邊框標籤） |
| `.subtitle` | 副標題（灰色） |
| `ul.clean` | 無圓點列表（左側小方塊） |

### 標籤 (Badges)
| Class | 用途 |
|-------|------|
| `.badge-sage` / `.badge-info` / `.badge-brand` | 模組色標籤 |
| `.badge-success` / `.badge-warning` / `.badge-danger` | 狀態色標籤 |
| `.badge-terra` / `.badge-petrol` / `.badge-mauve` | 其他模組標籤 |
| `.badge-neutral` | 中性灰標籤 |

### 資料呈現
| Class | 用途 |
|-------|------|
| `.tbl` | 簡潔表格（配合 thead/tbody） |
| `.meter` + `.meter-fill` | 進度條 |
| `.num-circle` | 數字圓圈（步驟編號） |
| `.state-flow` + `.state-arrow` | 水平狀態流（badge → badge） |
| `.flow-h` + `.flow-step` | 橫向流程圖（多步驟） |

---

## 執行流程

### Step 1：讀取來源文件

1. 讀取使用者指定的 `.md` 功能說明書**完整內容**
2. 讀取 `DESIGN_SYSTEM.md` 確認配色（快速掃描，不需全讀）
3. 判斷文件所屬模組（L1~L6），決定主色調

### Step 2：分析大綱

**若使用者提供了簡報大綱**：
- 依使用者大綱結構化投影片
- 從 MD 文件中擷取對應內容填入

**若未提供大綱**：
- 從 MD 文件結構自動分析，產生建議大綱
- 向使用者確認大綱後再開始製作

### Step 3：規劃投影片

目標頁數：**12~18 頁**（含封面與 Q&A），每頁資訊量適中。

標準結構：
1. 封面（Cover）
2. 背景/挑戰/願景（1~2 頁）
3. 全貌總覽/流程圖（1 頁）
4. 各階段/功能詳細說明（6~10 頁）
5. 狀態流轉/轉換細節（1~2 頁）
6. 尚待開發項目（若文件中有 AI 功能缺口分析）（0~1 頁）
7. 總結效益 + Q&A（1 頁）

### Step 4：產生 HTML

- 輸出路徑：與來源 MD 同目錄，檔名為 `簡報_{功能簡稱}.html`
- **單一 HTML 檔案，零外部依賴**（CSS/JS 全部內嵌）
- 所有投影片的 `data-slide` 編號必須連續（0, 1, 2, ...）
- 第一頁（封面）加上 `active` class

### Step 5：回報結果

以表格格式回報：

| 項目 | 內容 |
|------|------|
| 檔案路徑 | `bombus-system/docs/功能說明書/簡報_xxx.html` |
| 總頁數 | N 頁（含封面） |
| 來源文件 | 功能說明書_xxx.md |
| 主色調 | L? - {色名} |
| 操作方式 | ← → 鍵、底部按鈕、觸控滑動 |

並列出每頁的標題摘要表。

---

## 內容撰寫準則

- **目標讀者是 PM / HR / 主管**：用業務語言，避免純技術程式碼
- **每頁聚焦一個主題**：不要把太多不同概念塞在同一頁
- **善用表格**：欄位定義、狀態對照、評分標準等用 `.tbl` 表格呈現
- **狀態流轉必須完整**：列出所有狀態、轉換條件、觸發者、備註
- **流程步驟用編號圓圈**：`.num-circle` + 文字說明
- **數據用大字呈現**：KPI 數字、統計值用大號 font-weight: 700
- **進度/比較用 meter**：視覺化呈現百分比或等級
- **公式用 monospace 區塊**：計算邏輯放在 `background: var(--bg-base)` 區塊內

---

## 參考範本

已完成的簡報範本位於：
```
bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
```

新產生的簡報應與此範本保持一致的視覺品質與結構規範。

---

## Step 6（選填）：轉換為 PDF

HTML 簡報產生後，**詢問使用者是否需要同時產生 PDF**。若需要，執行以下步驟：

### 轉換工具

使用 `bombus-system/docs/_html-to-pdf.js` 腳本（已內建，基於 Puppeteer 逐頁截圖策略）。

### 執行指令

```bash
cd bombus-system && node docs/_html-to-pdf.js "<html-file-path>"
```

範例：
```bash
cd bombus-system && node docs/_html-to-pdf.js "docs/功能說明書/簡報_招募與AI智能面試.html"
```

### 轉換原理

腳本採用「**逐頁截圖合併**」策略，確保每頁 slide 完整呈現在一頁 PDF 中，不會被切割：

1. 使用 Puppeteer 開啟 HTML 簡報
2. 逐一激活每頁 slide（`position: fixed` 全螢幕），隱藏其他 slide
3. 截取 1440×900 @2x 高清截圖
4. 將所有截圖嵌入新的 HTML 頁面（每張圖一頁）
5. 輸出為自訂尺寸 PDF（1440×900px）

### 輸出規格

- 輸出路徑：與 HTML 同目錄同檔名，副檔名改為 `.pdf`
- 每頁 Slide = 一頁 PDF，保證不切割
- 無陰影（`box-shadow: none`），適合列印
- 導覽列與快捷鍵提示自動隱藏

### 回報格式

在 HTML 回報表格後附加 PDF 資訊：

| 項目 | 內容 |
|------|------|
| PDF 路徑 | `bombus-system/docs/功能說明書/簡報_xxx.pdf` |
| PDF 大小 | X.X MB |
| PDF 頁數 | N 頁（與 HTML 投影片數一致） |

### 批次轉換

若需一次轉換所有已產生的簡報 HTML：

```bash
cd bombus-system && for f in docs/功能說明書/簡報_*.html docs/簡報_*.html; do [ -f "$f" ] && node docs/_html-to-pdf.js "$f"; done
```

### 前提條件

- `puppeteer` 套件已安裝（專案中已有）
- 系統需有 Chrome/Chromium（macOS 通常已有）
- 若 puppeteer 未安裝：`cd bombus-system && npm install --no-save puppeteer`
