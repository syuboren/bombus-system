# Audit Logging — 審計日誌

## Purpose

定義 Bombus 的操作審計日誌系統，記錄所有敏感操作以供安全稽核與合規需求。日誌為唯寫模式，不可修改或刪除。

## Requirements

### Requirement: 記錄敏感操作審計日誌
系統 SHALL 自動記錄所有敏感操作至 platform.db 的 audit_logs 表，包含操作者、租戶、動作、資源、IP 位址。

#### Scenario: 記錄登入事件
- **WHEN** 使用者成功或失敗登入
- **THEN** 系統在 audit_logs 記錄 action=login_success 或 action=login_failed，包含 tenant_id、user_id（如適用）、IP

#### Scenario: 記錄租戶管理操作
- **WHEN** 平台管理員建立、暫停、軟刪除或永久刪除租戶
- **THEN** 系統記錄對應的 action（tenant_create、tenant_suspend、tenant_soft_delete、tenant_purge）

#### Scenario: 記錄角色權限變更
- **WHEN** 管理員新增/修改/刪除角色，或變更使用者的角色指派
- **THEN** 系統記錄 action（role_create、role_update、role_delete、user_role_assign、user_role_revoke），details 欄位包含變更前後的差異

#### Scenario: 記錄資料遷移事件
- **WHEN** demo 租戶執行 onboarding.db 資料遷移
- **THEN** 系統記錄 action=data_migration，details 包含遷移的表名和記錄數

### Requirement: 審計日誌查詢
系統 SHALL 提供 API 端點查詢審計日誌，支援依租戶、使用者、動作類型、時間範圍篩選。

#### Scenario: 平台管理員查詢所有審計日誌
- **WHEN** 平台管理員呼叫 `/api/audit/logs`
- **THEN** 系統回傳所有租戶的審計日誌，支援分頁與篩選

#### Scenario: 租戶管理員查詢自家審計日誌
- **WHEN** 租戶管理員呼叫 `/api/audit/logs`
- **THEN** 系統僅回傳該租戶的審計日誌（自動依 tenant_id 過濾）

#### Scenario: 依時間範圍篩選
- **WHEN** 查詢帶入 from 和 to 時間參數
- **THEN** 系統回傳指定時間範圍內的日誌

### Requirement: 審計日誌不可修改
audit_logs 表的記錄 SHALL 為唯寫（append-only），不提供 UPDATE 或 DELETE 的 API。

#### Scenario: 嘗試修改審計日誌
- **WHEN** 任何 API 請求嘗試修改或刪除審計日誌記錄
- **THEN** 系統回傳 405 Method Not Allowed

### Requirement: 審計日誌前端查詢介面
平台管理後台與租戶設定 SHALL 提供審計日誌查詢頁面，以表格呈現日誌記錄。

#### Scenario: 平台管理員查看審計日誌
- **WHEN** 平台管理員在後台進入審計日誌頁面
- **THEN** 系統以表格呈現日誌，支援按租戶、動作類型、時間範圍篩選

#### Scenario: 租戶管理員查看自家審計日誌
- **WHEN** 租戶管理員在設定頁進入審計日誌
- **THEN** 系統僅顯示該租戶的日誌記錄
