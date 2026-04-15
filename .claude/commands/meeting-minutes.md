# 會議逐字稿 → 結構化會議記錄

將錄音逐字稿整理為結構化的會議記錄（Markdown），並可選擇轉換為 HTML。

## 輸入參數

`$ARGUMENTS` 應包含以下資訊：

1. **逐字稿來源**（必填）：逐字稿檔案路徑，或直接貼上逐字稿文字
2. **輸出路徑**（選填）：指定輸出檔案路徑。預設為專案根目錄 `YYYYMMDD-<主題>.md`
3. **轉換 HTML**（選填）：加上 `--html` 則在產出 MD 後自動轉換為 HTML

---

## 執行流程

### Phase 1：解析逐字稿

1. **讀取逐字稿**：從檔案或使用者輸入取得原始文字
2. **辨識與會人員**：從對話中辨識說話者（語者 1、語者 2...），**向使用者確認每位語者的真實姓名與所屬單位**
3. **辨識會議基本資訊**：
   - 日期（從檔名或內容推斷）
   - 主題（從討論內容歸納）
   - 與會人員

### Phase 2：結構化整理

依照下方模板結構整理會議內容。整理原則：

- **去蕪存菁**：移除口語贅詞（「就是」「然後」「對對對」「嗯」等），保留實質內容
- **合併碎片發言**：同一人連續的碎片發言合併為完整段落
- **歸納分類**：將討論內容依主題分類，而非依時間順序逐條列出
- **提取決議與待辦**：明確標註已達成共識的決議，以及各方需執行的事項
- **保留關鍵原話**：重要承諾、爭議點、關鍵數字用 blockquote 引述原話
- **時間正規化**：口語中的相對時間（「下禮拜」「連假後」）轉為絕對日期

### Phase 3：產出 Markdown

輸出檔案路徑格式：`YYYYMMDD-<會議主題簡稱>.md`

---

## Markdown 輸出模板

```markdown
# <會議主題>

| 項目 | 內容 |
|------|------|
| 日期 | YYYY-MM-DD |
| 與會人員 | 姓名（單位）、姓名（單位）、... |
| 會議主題 | <一句話摘要> |

---

## 會議核心重點

> 以編號列表列出 3~8 項關鍵結論，每項一句話。讀者只看這段就能掌握全貌。

1. **<重點標題>**：<一句話說明>
2. ...

---

## 雙方待辦事項 (Action Items)

### <單位 A>（<負責人>）

| # | 待辦事項 | 預計完成日 | 備註 |
|---|---------|-----------|------|
| A1 | ... | YYYY-MM-DD | ... |

### <單位 B>（<負責人>）

| # | 待辦事項 | 預計完成日 | 備註 |
|---|---------|-----------|------|
| B1 | ... | YYYY-MM-DD | ... |

### 共同事項

| # | 待辦事項 | 預計完成日 | 備註 |
|---|---------|-----------|------|
| C1 | ... | YYYY-MM-DD | ... |

---

## <議題一標題>

<歸納後的討論內容，以段落或條列呈現>

> <關鍵原話引述>

## <議題二標題>

...

（依實際議題數量展開，通常 4~8 個議題）

---

*下次會議：<安排說明>*
```

---

## 整理準則

### 內容品質

- **目標讀者是未出席者**：看完記錄就能完整了解會議結論與後續行動
- **核心重點放最前面**：忙碌的主管只看前兩段（核心重點 + Action Items）就夠
- **Action Items 必須具體**：每項都要有明確的負責人、預計完成日、可驗證的交付物
- **議題歸納而非流水帳**：將同一主題的前後討論合併，不按時間順序列出
- **數字與日期必須精確**：金額、人數、日期不可模糊（「大約」「之後」），若原話模糊則標註

### 格式規範

- **表格對齊**：所有表格使用 Markdown pipe 格式
- **粗體標重點**：關鍵決議、重要數字、人名首次出現時加粗
- **Blockquote 引述原話**：重要承諾、爭議觀點保留原話，格式為 `> 姓名：「原話」`
- **日期格式**：統一使用 `YYYY-MM-DD（星期X）`
- **編號系統**：Action Items 使用 A1/B1/C1 前綴區分所屬單位

### 禁止事項

- 不加入逐字稿中未提及的內容或推測
- 不使用 emoji（除非使用者要求）
- 不省略有爭議或未達共識的討論（應標註「未有定論」）
- 不合併不同人的發言為同一段（引述時需標明發言者）

---

## Phase 4：轉換 HTML（若指定 `--html`）

產出一份可直接用瀏覽器開啟的單頁 HTML 會議記錄。

### HTML 設計規範

- **單一 HTML 檔案，零外部依賴**（CSS 全部內嵌）
- **配色**：使用 Bombus 品牌中性色系
- **排版**：A4 友善（`max-width: 800px`、適合列印）
- **列印支援**：`@media print` 隱藏不必要元素、分頁控制

### CSS 變數

```css
:root {
  --bg-base: #F5F5F7;
  --bg-card: #FCFCFD;
  --text-primary: #464E56;
  --text-secondary: #6B7280;
  --text-dark: #1F2937;
  --border: #E2E4E8;
  --accent: #64748B;
  --accent-light: #94A3B8;
  --accent-bg: rgba(100,116,139,0.06);
  --success: #7FB095;
  --warning: #E3C088;
  --danger: #C77F7F;
  --radius: 8px;
  --shadow: 0 2px 12px rgba(0,0,0,0.04);
}
```

### HTML 結構

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{會議主題} — 會議記錄</title>
  <style>/* 全部內嵌 */</style>
</head>
<body>
  <div class="page">
    <header class="doc-header">
      <h1>{會議主題}</h1>
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">日期</span><span>YYYY-MM-DD</span></div>
        <div class="meta-item"><span class="meta-label">與會人員</span><span>...</span></div>
      </div>
    </header>

    <section class="highlights">
      <h2>會議核心重點</h2>
      <ol class="key-points">
        <li><strong>重點標題</strong>：說明</li>
      </ol>
    </section>

    <section class="action-items">
      <h2>待辦事項</h2>
      <!-- 分組表格 -->
    </section>

    <section class="topic">
      <h2>議題一</h2>
      <!-- 內容 -->
    </section>

    <footer class="doc-footer">
      <p>下次會議：...</p>
    </footer>
  </div>
</body>
</html>
```

### 視覺元素

| 元素 | 樣式 |
|------|------|
| 文件標題 | `font-size: 1.75rem`、`color: var(--text-dark)`、底部 `2px solid var(--accent)` |
| 核心重點區 | 淺背景 `var(--accent-bg)`、左側 `3px solid var(--accent)` |
| Action Items 表格 | thead 使用 `var(--accent)` 底色 + 白字、hover 行高亮 |
| 議題標題 | `border-bottom: 1px solid var(--border)`、上方間距 `2rem` |
| Blockquote | 左側 `3px solid var(--accent-light)`、斜體、灰色背景 |
| 列印模式 | 隱藏陰影、背景色保留、自動分頁 |

### 輸出路徑

與 MD 同目錄同檔名，副檔名改為 `.html`。

---

## 回報格式

### 僅 Markdown

```
已產出會議記錄：<檔案路徑>

| 項目 | 內容 |
|------|------|
| 會議日期 | YYYY-MM-DD |
| 與會人員 | N 位 |
| 核心重點 | N 項 |
| Action Items | N 項（A方 X 項 / B方 Y 項 / 共同 Z 項） |
| 議題數 | N 個 |
```

### Markdown + HTML

上述表格再加一行：

```
| HTML 檔案 | <html 檔案路徑> |
```
