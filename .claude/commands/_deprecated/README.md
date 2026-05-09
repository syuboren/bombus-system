---
description: "（不是指令，是 _deprecated/ 目錄的說明文件，請勿執行）"
disable-model-invocation: true
---

# Deprecated Commands

此目錄保留**已棄用**但暫不刪除的舊版 slash commands，作為歷史參考。

## 為何保留而不刪除

- **歷史追溯**：未來看 git log 時，能對照舊指令名稱與當時行為
- **災難備援**：若 spectra plugin 出問題，可暫時退回 openspec CLI 流程
- **開發環境參考**：若有人 clone 舊 commit，仍能找到對應的指令說明

## 檔案清單

| 舊指令 | 對應的新指令 | 棄用原因 |
| --- | --- | --- |
| `/opsx-propose` | `/spectra:propose` | 改用 spectra CLI（取代 openspec） |
| `/opsx-apply` | `/spectra:apply` | 同上 |
| `/opsx-archive` | `/spectra:archive` | 同上 |
| `/opsx-explore` | `/explore` | 探索流程已獨立為通用 skill |

## 重要差異

舊版 opsx-* 使用 `openspec` CLI（例：`openspec list --json`），新版 spectra:* 使用 `spectra` CLI（例：`spectra list --json`）。底層工具已換代，舊指令呼叫的 CLI 命令不再存在。

## 不要在新工作中呼叫這些指令

- 它們仍能被 Claude Code 載入（會出現在 `/` 補全清單裡，名稱以 `_deprecated:opsx-` 開頭）
- 但執行時會失敗（CLI 已換）
- 真要查歷史行為，直接讀此目錄的 .md 檔即可，不要呼叫指令

## 可考慮的清理時機

- spectra 用穩定 6 個月以上 → 整個目錄可刪
- 若 git log 中已不再有 opsx-* 引用 → 可刪
- 目前（2026-05）保留作為過渡期備援
