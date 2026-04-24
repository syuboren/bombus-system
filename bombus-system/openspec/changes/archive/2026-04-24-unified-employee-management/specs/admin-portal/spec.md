## MODIFIED Requirements

### Requirement: 使用者管理介面

租戶設定 SHALL 提供精簡版使用者帳號總覽介面，顯示帳號清單（姓名、email、角色摘要、狀態、最後登入）。使用者帳號 SHALL 與既有 employees 表的員工資料關聯。帳號建立功能 SHALL 移至 HR 員工管理中心（`/organization/employee-management`），不在此頁面提供。

#### Scenario: 使用者列表

- **WHEN** 管理員進入使用者管理
- **THEN** 系統顯示所有使用者帳號清單，包含姓名、email、角色摘要（逗號分隔角色名稱）、帳號狀態、最後登入時間

#### Scenario: 快速操作 — 啟用/停用

- **WHEN** 管理員點擊帳號的啟用/停用切換
- **THEN** 系統更新帳號狀態並顯示成功通知

#### Scenario: 快速操作 — 密碼重設

- **WHEN** 管理員點擊「重設密碼」按鈕
- **THEN** 系統顯示確認對話框，確認後產生新隨機密碼、顯示在 Modal 中、設定 `must_change_password = 1`

#### Scenario: 導向 HR 管理中心

- **WHEN** 管理員點擊帳號列的「管理」連結
- **THEN** 系統導向 `/organization/employee-management?userId={userId}`，在 HR 管理中心開啟該員工的詳情 Modal 並切換至「帳號與權限」Tab

#### Scenario: 無新增使用者功能

- **WHEN** 管理員檢視使用者管理頁面
- **THEN** 頁面 SHALL NOT 顯示「新增使用者」按鈕或使用者建立表單。頁面標題或說明文字 SHALL 指示新帳號透過「組織管理 > 員工管理」建立

## REMOVED Requirements

### Requirement: 新增使用者

**Reason**: User account creation is now handled exclusively through the HR employee management hub (manual add or batch import) and the onboarding conversion flow, eliminating the need for a standalone user creation form in settings.

**Migration**: Use "Add Employee" in `/organization/employee-management` to create employee + user account simultaneously, or use batch import for bulk operations. Existing users created via the old flow are unaffected.

#### Scenario: 新增使用者功能已移除

- **WHEN** admin accesses `/settings/users`
- **THEN** no "Create User" form or button SHALL be present; account creation is exclusively handled by HR employee management hub

### Requirement: 從既有員工建立帳號

**Reason**: This scenario is now covered by the HR employee management hub where the employee detail modal includes an "Account & Permissions" tab. If an employee has no linked user account, the tab provides a "Create Account" button.

**Migration**: Navigate to the employee in `/organization/employee-management`, open their detail modal, go to the "Account & Permissions" tab, and click "Create Account".

#### Scenario: 從既有員工建立帳號功能已遷移

- **WHEN** admin needs to create an account for an existing employee
- **THEN** admin SHALL navigate to `/organization/employee-management`, open the employee detail modal, and use the "Create Account" button in the Account & Permissions tab
