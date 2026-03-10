# Admin Portal — 管理後台

## Purpose

定義 Bombus 的平台管理後台與租戶自助管理入口，包含平台管理員的租戶/方案管理介面，以及租戶管理員的組織架構、角色權限、使用者管理介面。

## Requirements

### Requirement: 平台管理後台入口
系統 SHALL 提供獨立的平台管理後台（路由 `/platform`），僅限平台管理員存取。

#### Scenario: 平台管理員存取後台
- **WHEN** 已登入的平台管理員存取 `/platform`
- **THEN** 系統顯示平台管理後台，包含租戶列表、方案管理等功能

#### Scenario: 非平台管理員被拒絕
- **WHEN** 一般租戶使用者嘗試存取 `/platform`
- **THEN** 系統攔截並導向登入頁面或顯示無權限提示

---
### Requirement: 租戶管理介面
平台管理後台 SHALL 提供租戶管理介面，包含租戶列表、新增、編輯、暫停、退租等操作。

#### Scenario: 租戶列表頁面
- **WHEN** 平台管理員進入租戶管理頁面
- **THEN** 系統以表格顯示所有租戶，包含名稱、slug、狀態、方案、建立日期，支援搜尋與狀態篩選

#### Scenario: 新增租戶表單
- **WHEN** 平台管理員點擊「新增租戶」
- **THEN** 系統顯示表單，包含：租戶名稱、slug、選擇方案、初始管理員 email/密碼

#### Scenario: 編輯租戶資訊
- **WHEN** 平台管理員點擊租戶列表中的「編輯」
- **THEN** 系統顯示編輯表單，可修改名稱、方案、狀態

#### Scenario: 軟刪除租戶
- **WHEN** 平台管理員對租戶執行退租
- **THEN** 租戶狀態設為 deleted（軟刪除），資料保留，使用者無法登入

#### Scenario: 恢復軟刪除的租戶
- **WHEN** 平台管理員對 deleted 租戶點擊「恢復」
- **THEN** 租戶狀態恢復為 active

---
### Requirement: 方案管理介面
平台管理後台 SHALL 提供訂閱方案管理介面。

#### Scenario: 方案列表
- **WHEN** 平台管理員進入方案管理頁面
- **THEN** 系統顯示所有方案，包含名稱、人數上限、子公司上限、功能限制

#### Scenario: 新增/編輯方案
- **WHEN** 平台管理員新增或編輯方案
- **THEN** 系統提供表單設定 name、max_users、max_subsidiaries、features

---
### Requirement: 租戶自助管理入口
系統 SHALL 提供租戶管理設定入口（路由 `/settings`），供租戶管理員（super_admin 或 subsidiary_admin）管理自己組織的設定。

#### Scenario: 租戶管理員存取設定
- **WHEN** 具有管理權限的使用者存取 `/settings`
- **THEN** 系統顯示租戶管理設定頁面，包含組織架構、角色權限、使用者管理

#### Scenario: 一般員工無法存取
- **WHEN** 僅有 employee 角色的使用者存取 `/settings`
- **THEN** 系統攔截並顯示無權限提示

---
### Requirement: 組織架構管理介面
租戶設定 SHALL 提供組織架構的視覺化編輯介面，與既有的組織管理模組（`features/organization/`）共用 Canvas/List 視圖模式，支援新增/編輯/刪除集團→子公司→部門的樹狀結構。

#### Scenario: 顯示組織架構樹
- **WHEN** 管理員進入組織架構管理
- **THEN** 系統以可互動的樹狀圖顯示完整組織結構（來自 org_units 表），支援展開/收縮

#### Scenario: 新增子公司
- **WHEN** 管理員在集團節點下點擊「新增子公司」
- **THEN** 系統顯示表單輸入名稱，提交後在 org_units 表新增記錄，樹狀圖即時更新

#### Scenario: 新增部門
- **WHEN** 管理員在子公司節點下點擊「新增部門」
- **THEN** 系統顯示表單輸入名稱，提交後在 org_units 表新增記錄，樹狀圖即時更新

---
### Requirement: 角色權限設定介面
租戶設定 SHALL 提供角色管理介面，包含角色列表、角色 CRUD、權限矩陣設定。

#### Scenario: 角色列表
- **WHEN** 管理員進入角色管理
- **THEN** 系統顯示所有角色，標註系統預設角色（不可刪除）與自訂角色

#### Scenario: 權限矩陣設定
- **WHEN** 管理員編輯某角色的權限
- **THEN** 系統以 resource × action 的矩陣介面呈現，管理員可勾選/取消勾選權限

#### Scenario: 新增自訂角色
- **WHEN** 管理員新增角色
- **THEN** 系統提供表單輸入角色名稱、選擇 scope_type、設定權限矩陣

---
### Requirement: 使用者管理介面
租戶設定 SHALL 提供使用者管理介面，包含使用者列表、新增、編輯、角色指派。使用者帳號 SHALL 與既有 employees 表的員工資料關聯。

#### Scenario: 使用者列表
- **WHEN** 管理員進入使用者管理
- **THEN** 系統顯示所有使用者，包含姓名、email、狀態、所屬角色、關聯的員工資料

#### Scenario: 指派角色給使用者
- **WHEN** 管理員為使用者指派角色
- **THEN** 系統顯示角色選擇介面，選擇角色後需指定作用範圍（對應的組織單位）

#### Scenario: 新增使用者
- **WHEN** 管理員新增使用者
- **THEN** 系統提供表單輸入 email、姓名、密碼（最低 8 字元），可選擇關聯既有員工，並立即指派角色

#### Scenario: 從既有員工建立帳號
- **WHEN** 管理員選擇「從員工建立帳號」
- **THEN** 系統顯示尚無帳號的員工列表（來自 employees 表），選擇後自動填入姓名和 email，管理員只需設定密碼和角色
