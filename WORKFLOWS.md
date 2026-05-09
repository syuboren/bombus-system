# Bombus 工作流程手冊

> 依任務性質選對進入點。每條流程列出技能對應順序，括號內為可選或情境分支。
>
> 配合 `CLAUDE.md` 的「自訂技能速查表」使用：速查表 = **每個指令的用途**，本文件 = **指令的串接順序**。

## 進入點對照

| 任務性質 | 進入流程 |
| --- | --- |
| 新功能開發（含 spec-driven） | [A](#a-新功能開發spectra-driven主要工作流程) |
| Bug 修復 | [B](#b-bug-修復) |
| 客戶溝通（收件 / 寄出） | [C](#c-客戶溝通循環雙向) |
| UI / 設計變更 | [D](#d-ui--設計變更) |
| 探索 / 規劃（需求模糊） | [E](#e-探索--規劃) |
| 平台維護（技能 / 記憶 / 規則） | [F](#f-平台維護技能--記憶--規則) |
| 文件交付（功能說明書 / 簡報 / PDF） | [G](#g-文件交付功能說明書--簡報--pdf) |

---

## A. 新功能開發（spectra-driven，主要工作流程）

```text
( /spectra:discuss )      # 需求模糊或方案待拍板時先收斂
  → /spectra:propose      # 建立 change：proposal + design + specs + tasks
  → /preflight            # 預飛：DB schema / API / 前端服務 / ID 一致性 / 租戶隔離
  → /spectra:apply        # 逐項實作 tasks（自動跑 tsc + 測試）
  → 客戶 xlsx 更新「預計修改 / 修改說明 / 預計提供測試時間 / 預計處理說明」
  → git commit            # 分組 commit（同變更 scope 一個 commit）
  → /spectra:archive      # 封存 change + 同步 delta specs 至 main
  → git merge → main → push
```

## B. Bug 修復

```text
( /verify-mapping )       # 若是欄位顯示/儲存/自動帶入相關，先驗 4 層對齊
  → /spectra:debug        # 結構化排查（資料層 / 邏輯層 / UI 層 / 邊界）
  → ( /fix-loop )         # 有測試覆蓋時自主修→測→退→重試
  → /verify               # 完成驗證（tsc + ng build）
  → git commit
```

- **欄位類 bug 優先 `/verify-mapping`**：avatar 顯示、grade 自動帶入、新欄位儲存後查不到——這類「看起來像前端 bug」的，4 層 grep 一次就能定位斷點，比 `/spectra:debug` 快
- **`/fix-loop`** 適合測試覆蓋已存在的 bug（會自動修→測→退→重試）
- **單純定位後直接改也可**，不必每次都跑完整流程

## C. 客戶溝通循環（雙向）

### Inbound（客戶來函處理）

```text
/client-feedback          # 客戶 .docx → 16 欄內部版 xlsx（含技術紀錄欄）
  → /spectra:discuss      # 對未決議題收斂（如保留期、欄位粒度）
  → 進入 A 流程逐項處理
```

### Outbound（寄交付對照表給客戶）

```text
（內部 16 欄 xlsx）→ 衍生 7 欄客戶版（精簡技術欄）
  → /client-update        # 7 欄 xlsx → 客戶訊息 draft（Syuboren 語氣）
  → 手動 polish 括號補充說明、調整問候時段
  → 寄出
```

## D. UI / 設計變更

```text
讀 DESIGN_SYSTEM.md + WEB_GUIDELINES.md
  → /spectra:propose（如為新元件）
  → 實作（mixin / 模組色 / SCSS 變數，禁硬編碼）
  → /verify（tsc + ng build）
  → ( /standardize-ui )   # 同類多元件統一時
```

## E. 探索 / 規劃

```text
/explore                  # 開放式思考，不寫 code
  → /spectra:discuss      # 收斂為可執行決定
  → 進入 A 流程
```

## F. 平台維護（技能 / 記憶 / 規則）

```text
發現重複模式 → 評估存 memory 或建 skill
  → /skill-creator        # 建新 skill（含 SKILL.md / scripts / references）
  → 更新 CLAUDE.md「技能速查表」與本文件「進入點對照」
  → 更新 ~/.claude/projects/-Users-alifrt-Desktop-Bombus/memory/MEMORY.md 索引
```

## G. 文件交付（功能說明書 / 簡報 / PDF）

從現有 code 與 spec 自動產出 4 種格式的客戶交付物：MD（內部存檔）→ HTML（客戶預覽）→ 簡報 HTML（會議螢幕分享）→ PDF（離線寄送）。

```text
程式碼 + spec 文件
  → /generate-feature-doc       # 從 code/spec 產出 MD 草稿（含架構圖、API 對應表、DB schema 圖）
  → 手動潤飾 MD                  # 補客戶面語氣 / 移技術詞
  → /convert-doc-html           # MD → 獨立 HTML（含目錄、莫蘭迪風）
  → /convert-doc-presentation   # HTML → 簡報式 HTML（一段一頁，上下鍵切換）
  → 瀏覽器列印 → PDF             # Cmd+P → 儲存為 PDF（離線版寄客戶）
```

**輸出位置**：`bombus-system/docs/功能說明書/`，每個主題會產出 4 個檔（`*.md` / `*.html` / `簡報_*.html` / `簡報_*.pdf`）。

**何時跑**：

- 新模組完工後第一次產出（封存 spec 之後、寄客戶之前）
- 既有模組大改後刷新對應文件
- 客戶要求看『某功能完整說明』時
- 內部新人 onboarding 需要該模組的整體理解

**注意事項**：

- **MD 是真理來源**：日後更新從 MD 改起，再依序跑後三步刷新。不要直接改 HTML（會被下次覆寫）
- **手動潤飾不可省**：`/generate-feature-doc` 產出是技術草稿，**寄客戶前必須手動潤色**（避技術詞、改客戶聽得懂的語氣，見 memory `feedback_syuboren_voice.md`）
- **同主題 4 檔同步**：避免出現 MD 已更新但 HTML 還是舊版的尷尬。建議「要更新就一次更新 4 個」
- **PDF 不是 skill**：用瀏覽器列印或 `pdf` skill 都可，但簡報式 HTML 用列印模式 PDF 質感較佳（保留分頁感）

**對稱於 C 流程**：

- C-Outbound：用 `/client-update` 寫**短**訊息（給客戶看的進度更新）
- G：用此 pipeline 產**長**文件（給客戶看的功能完整說明）
- 兩者都是 outbound，但 C 是即時溝通、G 是正式交付物

---

## 共用原則

- **進入點**：絕大多數工作從 A（新功能）或 C（客戶溝通）開始
- **驗證閘**：每條流程都必經 `/verify` 或內建 tsc + ng build；宣告完成前不可省
- **commit 邊界**：實作 → 驗證 → commit；不要寫一半就 commit
- **archive 時機**：實作完工 + 驗證通過後 archive；merge → push 之前或之後皆可，但不可先 push 再 archive（會留 unsynced delta specs）
- **客戶面寫法**：所有 outbound 文件（xlsx col 15/16、client-update 訊息）必須避技術詞、保留難度感（見 memory `feedback_xlsx_16col_standard.md` / `feedback_syuboren_voice.md`）
