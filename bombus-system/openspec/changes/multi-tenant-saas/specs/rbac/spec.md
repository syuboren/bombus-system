## ADDED Requirements

### Requirement: 多層級組織架構
系統 SHALL 支援集團（group）→ 子公司（subsidiary）→ 部門（department）三層組織架構。org_units 表 SHALL 以 parent_id 形成樹狀結構。現有 onboarding.db 的 `departments` 表資料（7 個部門）SHALL 作為 demo 租戶的預設部門。

#### Scenario: 建立組織架構
- **WHEN** 租戶管理員建立組織單位（name、type、parent_id）
- **THEN** 系統在 org_units 表新增記錄，自動計算 level 值（group=0, subsidiary=1, department=2）

#### Scenario: 部門必須屬於子公司
- **WHEN** 建立 type=department 的組織單位
- **THEN** parent_id MUST 指向一個 type=subsidiary 的組織單位，否則回傳 400 錯誤

#### Scenario: 查詢組織架構樹
- **WHEN** 使用者查詢組織架構
- **THEN** 系統回傳完整的樹狀結構（JSON），包含各層級的組織單位

#### Scenario: demo 租戶預載現有部門
- **WHEN** demo 租戶資料庫初始化
- **THEN** org_units 表 SHALL 包含從現有 onboarding.db `departments` 表遷入的 7 個部門（執行長辦公室、行政部、財務部、專案部、人資部、業務部、工程部），以及一個預設的集團根節點

### Requirement: 角色定義與管理
系統 SHALL 支援建立自訂角色，每個角色 SHALL 綁定一個作用範圍（scope_type：global/subsidiary/department）。

#### Scenario: 建立新角色
- **WHEN** 租戶管理員建立角色（name、scope_type、permissions[]）
- **THEN** 系統在 roles 表新增記錄，並在 role_permissions 表建立對應的權限關聯

#### Scenario: 不可修改系統預設角色名稱
- **WHEN** 嘗試修改 is_system=1 的角色名稱
- **THEN** 系統回傳 400 錯誤（可修改預設角色的權限，但不可改名或刪除）

#### Scenario: 刪除自訂角色
- **WHEN** 租戶管理員刪除 is_system=0 的角色
- **THEN** 系統刪除該角色及其所有 role_permissions 和 user_roles 關聯（CASCADE）

### Requirement: 權限定義
系統 SHALL 使用 `resource:action` 格式定義權限。系統 SHALL 預載所有 L1~L6 模組對應的權限清單。

#### Scenario: 預載權限清單
- **WHEN** 租戶資料庫初始化
- **THEN** permissions 表 SHALL 包含所有預定義的 resource:action 組合（對應既有路由：employee:read/write/delete、recruitment:manage、grade-matrix:read/edit、job-description:read/edit/approve、competency:read/edit、meeting:read/manage、talent-pool:read/manage、onboarding:read/manage、organization:read/manage 等）

#### Scenario: 查詢可用權限
- **WHEN** 租戶管理員查詢權限列表
- **THEN** 系統回傳所有權限，按 resource 分組

### Requirement: 使用者角色指派（Scoped Roles）
系統 SHALL 支援將角色指派給使用者，並綁定作用範圍（org_unit_id）。

#### Scenario: 指派集團級角色
- **WHEN** 將 scope_type=global 的角色指派給使用者
- **THEN** user_roles 中 org_unit_id 設為集團根節點的 ID，該使用者可存取所有子公司與部門

#### Scenario: 指派子公司級角色
- **WHEN** 將 scope_type=subsidiary 的角色指派給使用者，綁定某子公司
- **THEN** user_roles 中 org_unit_id 設為該子公司 ID，使用者僅可存取該子公司及其部門

#### Scenario: 指派部門級角色
- **WHEN** 將 scope_type=department 的角色指派給使用者，綁定某部門
- **THEN** user_roles 中 org_unit_id 設為該部門 ID，使用者僅可存取該部門

#### Scenario: 同一使用者可擁有多個角色
- **WHEN** 使用者被指派多個角色（如在 A 部門是主管，在 B 部門是員工）
- **THEN** 系統 SHALL 合併所有角色的權限，取聯集

### Requirement: 權限繼承
系統 SHALL 實作範圍繼承：global 角色自動涵蓋所有 subsidiary 和 department；subsidiary 角色自動涵蓋該子公司下所有 department。

#### Scenario: global 角色存取部門資料
- **WHEN** 擁有 global 角色且具備 employee:read 權限的使用者，請求某部門的員工列表
- **THEN** 系統允許存取（global 範圍自動涵蓋所有層級）

#### Scenario: subsidiary 角色存取下屬部門
- **WHEN** 擁有子公司 A 的 subsidiary 角色使用者，請求子公司 A 下某部門的資料
- **THEN** 系統允許存取

#### Scenario: subsidiary 角色不可跨公司存取
- **WHEN** 擁有子公司 A 的 subsidiary 角色使用者，請求子公司 B 的資料
- **THEN** 系統回傳 403 Forbidden

### Requirement: Permission Middleware 檢查存取權限
系統 SHALL 提供 Permission Middleware，根據路由所需權限與使用者角色/範圍進行存取控制。

#### Scenario: 有權限的請求通過
- **WHEN** 使用者的角色包含路由所需的 resource:action 權限，且作用範圍涵蓋請求的資料
- **THEN** 中介層允許請求繼續

#### Scenario: 無權限的請求被拒
- **WHEN** 使用者缺少路由所需的權限
- **THEN** 中介層回傳 403 Forbidden

### Requirement: 預設角色初始化
系統 SHALL 在租戶資料庫初始化時建立 5 個預設角色：super_admin、subsidiary_admin、hr_manager、dept_manager、employee。

#### Scenario: 預設角色自動建立
- **WHEN** 新租戶資料庫初始化
- **THEN** roles 表包含 5 個 is_system=1 的預設角色，各自對應合理的預設權限

### Requirement: 前端權限感知
前端 SHALL 提供 PermissionService（Signal-based），在登入後從 Token 解析使用者權限並快取。元件層 SHALL 透過 PermissionDirective 或 PermissionService 控制 UI 元素的顯示/隱藏。

#### Scenario: 隱藏無權限的功能按鈕
- **WHEN** 使用者不具備 employee:delete 權限
- **THEN** 員工管理頁面的「刪除」按鈕 SHALL 不顯示

#### Scenario: Route Guard 攔截無權限路由
- **WHEN** 使用者不具備存取 /settings 頁面的權限
- **THEN** PermissionGuard 攔截並導向首頁或顯示無權限提示

### Requirement: 權限範圍可視化
前端 SHALL 提供權限可視化介面，以樹狀圖呈現組織架構與各角色的權限範圍，讓管理員直觀理解「誰可以看到什麼」。

#### Scenario: 顯示組織架構權限樹
- **WHEN** 租戶管理員開啟權限可視化頁面
- **THEN** 系統以樹狀圖顯示集團→子公司→部門結構，每個節點標註生效的角色與權限

#### Scenario: 查看特定使用者的有效權限
- **WHEN** 管理員選擇某位使用者
- **THEN** 系統高亮顯示該使用者所有角色的作用範圍，並列出合併後的有效權限清單

### Requirement: 既有組織管理模組整合
系統 SHALL 將現有的組織管理模組（`features/organization/`）從 Mock 資料遷移至真實 API。OrganizationService 的 mock 方法 SHALL 替換為呼叫後端 API，後端 API 讀取租戶資料庫中的真實資料（來源為 onboarding.db 遷入的 `employees` 和 `departments` 表）。

#### Scenario: 集團組織圖使用真實資料
- **WHEN** 使用者開啟集團組織圖頁面（`/organization/group-structure`）
- **THEN** OrganizationService 從 `/api/organization/companies` 取得資料（取代 mockCompanies），畫布和列表視圖正常運作，Company 資料來自 org_units(type=group/subsidiary)

#### Scenario: 部門結構管理使用真實資料
- **WHEN** 使用者開啟部門結構管理頁面（`/organization/department-structure`）
- **THEN** OrganizationService 從 `/api/organization/departments` 取得部門資料（取代 mockDepartments），資料來自 org_units(type=department) 和既有 departments 表

#### Scenario: 員工管理使用真實資料
- **WHEN** 使用者開啟員工管理頁面（`/organization/employee-management`）
- **THEN** OrganizationService 從 `/api/employee` 取得員工資料（取代 mockEmployees），多維篩選和分頁正常運作，資料來自既有 employees 表

#### Scenario: CRUD 操作連接真實 API
- **WHEN** 使用者在組織管理中建立/修改/刪除公司、部門或員工
- **THEN** OrganizationService 呼叫對應的後端 API，資料持久化至租戶資料庫

#### Scenario: 組織管理受權限控制
- **WHEN** 使用者不具備 organization:manage 權限
- **THEN** 集團組織圖和部門結構的編輯功能（新增/修改/刪除）SHALL 隱藏，僅顯示唯讀模式

#### Scenario: 員工與使用者帳號關聯
- **WHEN** 系統中同時存在 employees 表和 users 表
- **THEN** 系統 SHALL 透過 employee_id 欄位將 users 表的登入帳號與 employees 表的員工檔案關聯，employees 表的 `role` 欄位（manager/employee）SHALL 對應到 RBAC 角色
