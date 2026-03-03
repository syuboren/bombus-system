# Ralph Loop 提示詞速查 — Multi-Tenant SaaS

完整計畫詳見：`.claude/plans/jolly-sleeping-cerf.md`

## 啟動前檢查

```bash
git branch                                    # 確認在正確分支
cd bombus-system/server && npm install        # 後端依賴
cd bombus-system && npm install               # 前端依賴
ls bombus-system/server/.env                  # 確認 .env 存在
```

## Loop 之間檢查

```bash
cat .claude/ralph-loop-saas.log | grep CIRCUIT_BREAKER   # 檢查斷路器
git log --oneline -20                                     # 確認 commit 序列
```

---

## Loop A（Group 5+6+7，14 任務）

複製以下整段指令，貼到新 session 中：

```
/ralph-loop "你是 Bombus 專案的資深全端工程師，正在執行 multi-tenant SaaS 變更的 Loop A：Group 5（Demo 租戶資料遷移）、Group 6（前端認證系統重構）、Group 7（前端權限系統），共 14 個任務。

每次迭代你會重新閱讀這份指示。你必須嚴格按照以下 8 個步驟執行，不可跳過任何步驟。

========================================
STEP 1 — 讀取規範與判斷下一個任務
========================================

1a. 讀取 bombus-system/openspec/changes/multi-tenant-saas/tasks.md
1b. 讀取 CLAUDE.md 和 PROJECT_RULES.md
1c. 如果下一個任務屬於 Group 6 或 7（前端），額外讀取 DESIGN_SYSTEM.md 和 bombus-system/CLAUDE.md
1d. 在 tasks.md 中，僅看 Group 5、6、7 的任務，找到第一個標記為 '- [ ]' 的任務。這就是本次迭代要做的任務。
1e. 根據任務內容讀取對應 spec 檔案：
    - Group 5 任務 → specs/tenant-isolation/spec.md + specs/tenant-management/spec.md
    - Group 6 任務 → specs/authentication/spec.md
    - Group 7 任務 → specs/rbac/spec.md
    spec 路徑前綴: bombus-system/openspec/changes/multi-tenant-saas/specs/
1f. 如果 .claude/ralph-loop-saas.log 存在，讀取最後 40 行以了解前次迭代狀態

任務依賴順序（必須遵守）：
- Group 5: 5.1a → 5.1b → 5.2 → 5.3
- Group 6: 6.1 → 6.2 → 6.3 → 6.4 → 6.5（6.1 和 6.4 極小，可在同一迭代合併）
- Group 7: 7.1 → 7.2 → 7.3 → 7.4 → 7.5（7.2 和 7.3 各自獨立，但都依賴 7.1）
- 跨組: Group 5 全部完成 → Group 6 開始；Group 6.2 完成 → Group 7 開始

========================================
STEP 2 — 斷路器檢查（Circuit Breaker）
========================================

讀取 .claude/ralph-loop-saas.log（如不存在則跳過此步驟）。

檢查方法：搜尋最近的 log 條目，找與當前任務 ID 相同的連續 FAIL 記錄。

情況 A — 連續失敗 3 次或以上：
  執行 macOS 通知:
    osascript -e 'display notification \"斷路器觸發：任務 TASK_ID 連續失敗 3 次，需要人工介入\" with title \"Bombus SaaS 告警\" sound name \"Basso\"'
  在 log 中追加一筆 CIRCUIT_BREAKER 記錄。
  跳過此任務，嘗試下一個不受阻擋的 '- [ ]' 任務。
  如果所有剩餘任務都被阻擋，輸出完整的錯誤報告後正常結束迭代。

情況 B — 連續失敗 1-2 次：
  仔細閱讀前次的 error_details 欄位，理解失敗原因。
  在本次迭代中採用不同的實作方式。在 log 中記錄你改變了什麼策略。

情況 C — 無失敗記錄：正常進行。

========================================
STEP 3 — 實作任務
========================================

後端任務（Group 5）規則：
- 檔案放在 bombus-system/server/src/ 下
- 使用 Prepared Statements，禁止字串拼接 SQL
- 使用 DBAdapter（req.tenantDB）介面，不直接操作 sql.js
- bcryptjs cost factor 10
- 參考現有 server/src/db/tenant-schema.js 的表定義
- 遷移腳本需讀取 server/src/db/onboarding.db 的既有資料
- 整合 audit-logger（server/src/utils/audit-logger.js）

前端任務（Group 6、7）規則：
- Standalone 元件 + ChangeDetectionStrategy.OnPush
- 使用 inject() 注入服務，禁止 constructor 注入
- Signal APIs: signal(), computed(), input(), output(), model()
- 控制流: @if/@for(track expr)/@switch，禁止 *ngIf/*ngFor/*ngSwitchCase
- templateUrl + styleUrl 分離，禁止 inline HTML/CSS
- 禁止使用 any 型別和 NgModules
- 單引號，2 空格縮排，const 優先
- SCSS 使用 _variables.scss 色彩變數和 _mixins.scss 的 mixin

========================================
STEP 4 — 驗證
========================================

後端驗證（Group 5）：
  cd bombus-system/server && timeout 10 node -e \"require('./src/index.js')\"
  如果失敗，立即修復並重試，最多 3 次。

前端驗證（Group 6、7）：
  cd bombus-system && npx ng build --configuration=development 2>&1 | tail -80
  如果失敗，立即修復並重試，最多 3 次。

3 次重試後仍失敗 → 不標記完成，STEP 6 記錄為 FAIL。

========================================
STEP 5 — 更新進度與 Git Commit
========================================

僅在 STEP 4 驗證通過後：
5a. 編輯 tasks.md，將完成的任務從 '- [ ]' 改為 '- [x]'
5b. git add -A && git commit -m \"feat(multi-tenant): TASK_ID TASK_SHORT_DESCRIPTION\"

========================================
STEP 6 — 記錄日誌
========================================

追加到 .claude/ralph-loop-saas.log（如不存在先建立）：

---
iteration: N
loop: A
timestamp: YYYY-MM-DDTHH:mm:ss+08:00
task_id: X.Ya
task_description: 簡短描述
status: SUCCESS 或 FAIL
files_created: [新建的檔案路徑]
files_modified: [修改的檔案路徑]
verification_command: 執行的驗證命令
verification_result: PASS 或 FAIL
error_details: 失敗時的詳細錯誤
retry_count: 0-3
consecutive_failures: 該任務累計連續失敗次數
strategy_change: 重試時改變了什麼
progress: M/14
git_commit: hash 和訊息，或 NONE
---

========================================
STEP 7 — 里程碑通知
========================================

計算 Group 5+6+7 中 '- [x]' 的任務數（0~14）。
達到 7（50%）→ osascript 通知 Loop A 進度 50%（Glass 音效）
達到 11（~75%）→ osascript 通知 Loop A 進度 75%（Glass 音效）

========================================
STEP 8 — 完成判斷
========================================

重新讀取 tasks.md。如果 Group 5+6+7 共 14/14 全部 '- [x]'：
  osascript 通知完成（Hero 音效）
  輸出完成報告
  輸出: <promise>LOOP_A_COMPLETE</promise>
否則輸出迭代摘要，正常結束。

========================================
重要提醒
========================================
- 所有回覆使用繁體中文
- 每次迭代只做一個任務（除非兩個極小且無依賴衝突）
- 不要假設前次迭代的記憶體狀態仍在，每次都重新讀取檔案
- 修改 tasks.md 時只改動目標行
- 如果 git log 顯示前一次 commit 有問題，先修復再繼續
" --max-iterations 25 --completion-promise "LOOP_A_COMPLETE"
```

---

## Loop B（Group 8+9+10，16 任務）

```
/ralph-loop "你是 Bombus 專案的資深前端工程師，正在執行 multi-tenant SaaS 變更的 Loop B：Group 8（組織管理模組遷移）、Group 9（平台管理後台）、Group 10（租戶管理設定），共 16 個任務。

前置條件：Group 1-7 已全部完成。後端 API 就緒，前端認證和權限系統已實作。

每次迭代嚴格按照以下 8 個步驟執行。

========================================
STEP 1 — 讀取規範與判斷下一個任務
========================================

1a. 讀取 bombus-system/openspec/changes/multi-tenant-saas/tasks.md
1b. 讀取 CLAUDE.md、PROJECT_RULES.md、DESIGN_SYSTEM.md、bombus-system/CLAUDE.md
1c. 在 tasks.md 中僅看 Group 8、9、10，找到第一個 '- [ ]' 任務
1d. 讀取對應 spec：
    - Group 8 → specs/rbac/spec.md
    - Group 9 → specs/admin-portal/spec.md
    - Group 10 → specs/admin-portal/spec.md + specs/rbac/spec.md
1e. 讀取 .claude/ralph-loop-saas.log 最後 40 行

任務依賴順序：
- Group 8: 8.1 → 8.2 → 8.3
- Group 9: 9.1 → 9.2a → 9.2b → 9.3 → 9.4
- Group 10: 10.1 → 10.2a → 10.2b → 10.3a → 10.3b → 10.4 → 10.5a → 10.5b → 10.6
- Group 8 和 Group 9 互不依賴；建議順序: Group 8 → Group 9 → Group 10

========================================
STEP 2 — 斷路器（同 Loop A 邏輯）
========================================
連續 3 次失敗 → osascript 告警 + 跳過
1-2 次失敗 → 改變策略重試

========================================
STEP 3 — 實作任務
========================================

Angular 元件規範：
- Standalone + OnPush + inject() + Signal APIs
- @if/@for(track)/@switch，禁止 NgModules/any/*ngIf/*ngFor
- templateUrl + styleUrl 分離，單引號，2 空格，const 優先

SCSS 規範：
- 每個元件 SCSS 頂部定義 $module-color
- 必須使用 mixin：@include card, data-table($module-color), filter-bar($module-color), button-base + button-module($module-color), status-badge
- 圓角 12px，陰影 0 4px 20px rgba(0,0,0,0.05)，充分留白

新模組結構：
- features/platform-admin/（路由 /platform，PlatformAdminGuard 保護）
- features/tenant-admin/（路由 /settings，PermissionGuard 保護）

Group 8 特別注意：
- organization.service.ts 有 1200 行 mock 資料，全部替換為 HttpClient API 呼叫
- 保持 method 簽名和 Observable 回傳型別不變
- API 端點: /api/organization/companies, /api/organization/departments, /api/employee

使用既有 shared/components（StatusBadge, Pagination, NotificationService）

========================================
STEP 4 — 驗證
========================================
cd bombus-system && npx ng build --configuration=development 2>&1 | tail -80
失敗最多重試 3 次。

========================================
STEP 5 — 更新進度與 Git Commit
========================================
驗證通過後：tasks.md 標記 [x] + git commit

========================================
STEP 6 — 記錄日誌（同 Loop A 格式，loop: B，progress: M/16）
========================================

========================================
STEP 7 — 里程碑通知
========================================
達到 8（50%）→ Glass 通知
達到 12（75%）→ Glass 通知

========================================
STEP 8 — 完成判斷
========================================
16/16 全部完成 → Hero 通知 + <promise>LOOP_B_COMPLETE</promise>
否則輸出摘要，正常結束。

========================================
重要提醒（同 Loop A）
========================================
" --max-iterations 30 --completion-promise "LOOP_B_COMPLETE"
```

---

## Loop C（Group 11，5 任務）

```
/ralph-loop "你是 Bombus 專案的資深 QA 工程師，正在執行 multi-tenant SaaS 變更的 Loop C：Group 11（整合測試與驗收），共 5 個任務。

前置條件：Group 1-10 已全部完成。

每次迭代嚴格按照以下 8 個步驟執行。

========================================
STEP 1 — 讀取規範與判斷下一個任務
========================================

1a. 讀取 tasks.md，找 Group 11 第一個 '- [ ]' 任務
1b. 讀取 design.md（架構決策、Token 格式、RBAC 模型）
1c. 讀取對應 spec：
    - 11.1 → specs/authentication/spec.md + specs/admin-portal/spec.md + specs/rbac/spec.md
    - 11.2 → specs/tenant-isolation/spec.md
    - 11.3 → specs/tenant-management/spec.md
    - 11.4 → specs/rbac/spec.md
    - 11.5 → specs/audit-logging/spec.md
1d. 讀取 .claude/ralph-loop-saas.log 最後 40 行

順序: 11.1 → 11.2 → 11.3 → 11.4 → 11.5

========================================
STEP 2 — 斷路器（同前）
========================================

========================================
STEP 3 — 建立測試腳本
========================================

測試腳本放在 bombus-system/server/src/tests/ 目錄。
使用 Node.js http/fetch，假設伺服器在 http://localhost:3001。
每個斷言輸出 PASS/FAIL + 描述，最後輸出總結 X/Y passed。

11.1: test-e2e-flow.js（平台管理員登入→建立租戶→管理員登入→設組織→建角色→指派使用者→員工登入→存取功能）
11.2: test-tenant-isolation.js（租戶 A Token 存取→成功；竄改 tenant_id→403）
11.3: test-demo-tenant.js（admin/admin123 登入→12 員工→7 部門→職等資料）
11.4: test-permission-inheritance.js（global/subsidiary/department 角色存取範圍）
11.5: test-audit-logs.js（登入/角色建立/指派→audit_logs 有記錄）

如果測試發現 bug → 同一迭代中修復 + 重新測試 + 額外驗證前端編譯

========================================
STEP 4 — 執行測試
========================================
4a. cd bombus-system/server && node src/index.js &（背景啟動）
4b. node bombus-system/server/src/tests/SCRIPT.js
4c. kill 伺服器
4d. 若修 bug → 額外 npx ng build 驗證

========================================
STEP 5 — 更新進度與 Git Commit
========================================
測試全通過後：tasks.md 標記 [x] + git commit（test(multi-tenant): ...）

========================================
STEP 6 — 記錄日誌（loop: C，含 test_results/bugs_found/bugs_fixed 欄位）
========================================

========================================
STEP 7 — 里程碑通知
========================================
達到 3（60%）→ Glass；達到 4（80%）→ Glass

========================================
STEP 8 — 完成判斷
========================================
Group 11 的 5 個任務 + Group 5-10 的 31 個任務全部 '- [x]' →
  Hero 通知 + 最終驗收報告 + <promise>ALL_TASKS_COMPLETE</promise>
否則輸出摘要，正常結束。
" --max-iterations 15 --completion-promise "ALL_TASKS_COMPLETE"
```
