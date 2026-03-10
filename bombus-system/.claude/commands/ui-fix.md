# UI 修復流程

修復以下 UI 問題，並確保不產生連鎖副作用：$ARGUMENTS

## 流程

### 1. 理解現有版面結構

- 讀取相關元件的 `.html` 和 `.scss` 檔案
- 辨識目前的版面模式（flex/grid/position）
- 記錄固定定位元素（fixed/sticky header、sidebar、overlay）

### 2. 影響範圍評估（修改前必做）

列出此修復將影響的所有視覺元素：
- 可能重疊、被推移或被遮住的元素
- z-index 衝突風險
- 響應式斷點下的表現
- 溢出（overflow）問題

### 3. 套用修復

- 在同一次編輯中包含修復本身 + 所有補償樣式
- 固定定位元素必須為內容容器加 `padding-top`/`margin-top` 補償
- 加入簡短註解說明間距值的由來（例如 `/* 補償 64px 固定標頭高度 */`）

### 4. 建構驗證

```bash
cd bombus-system && npx ng build --configuration=development
```

確認 0 errors 後回報修復內容與受影響的檔案。

### 5. 回歸檢查清單

- [ ] 固定/黏性元素未遮住內容
- [ ] z-index 層級正確
- [ ] 手機版（< 600px）版面正常
- [ ] overflow 無異常捲軸
- [ ] 相鄰元件間距未被破壞
