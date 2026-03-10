# Tenant Management — 租戶管理

## Purpose

定義 Bombus 平台管理員對租戶的完整生命週期管理，包含建立、查詢、暫停、退租、恢復，以及 Demo 租戶的資料遷移機制。

## Requirements

### Requirement: 平台管理員可建立新租戶
系統 SHALL 提供 API 端點讓平台管理員建立新租戶。建立租戶時 SHALL 自動產生獨立的 SQLite 資料庫檔案，並初始化所有必要的表結構（RBAC 表 + L1~L6 業務表）。

#### Scenario: 成功建立租戶
- **WHEN** 平台管理員提交租戶建立請求（包含 name、slug、plan_id）
- **THEN** 系統建立 `server/data/tenants/tenant_{id}.db` 資料庫檔案，初始化所有表結構，在 platform.db 的 tenants 表新增記錄，並回傳租戶資訊

#### Scenario: slug 已存在
- **WHEN** 平台管理員提交的 slug 與既有租戶重複
- **THEN** 系統回傳 409 Conflict 錯誤，不建立任何資料

---
### Requirement: 平台管理員可查詢租戶列表
系統 SHALL 提供 API 端點查詢所有租戶，支援分頁與狀態篩選。

#### Scenario: 查詢所有活躍租戶
- **WHEN** 平台管理員查詢租戶列表且篩選 status=active
- **THEN** 系統回傳所有狀態為 active 的租戶列表，包含 id、name、slug、status、plan、created_at

#### Scenario: 分頁查詢
- **WHEN** 平台管理員帶入 page=2&limit=10
- **THEN** 系統回傳第 2 頁的 10 筆租戶資料，並附帶 total 筆數

---
### Requirement: 平台管理員可暫停租戶
系統 SHALL 允許平台管理員將租戶狀態設為 suspended。暫停後的租戶 SHALL 無法登入，但資料 SHALL 保留。

#### Scenario: 暫停活躍租戶
- **WHEN** 平台管理員將 active 租戶設為 suspended
- **THEN** 租戶狀態更新為 suspended，該租戶使用者的後續登入請求 SHALL 回傳 403 Forbidden

#### Scenario: 恢復暫停租戶
- **WHEN** 平台管理員將 suspended 租戶設為 active
- **THEN** 租戶狀態更新為 active，使用者可正常登入

---
### Requirement: 平台管理員可退租並清除資料
系統 SHALL 提供退租流程。退租 SHALL 將租戶狀態設為 deleted，並在確認後刪除租戶資料庫檔案。

#### Scenario: 標記租戶為 deleted
- **WHEN** 平台管理員對租戶執行退租操作
- **THEN** 租戶狀態設為 deleted，使用者無法登入，但資料庫檔案暫時保留（軟刪除）

#### Scenario: 恢復已刪除的租戶
- **WHEN** 平台管理員對 deleted 狀態的租戶執行恢復操作
- **THEN** 租戶狀態恢復為 active，使用者可重新登入，所有資料完整保留

#### Scenario: 永久刪除租戶資料
- **WHEN** 平台管理員對 deleted 狀態的租戶執行永久刪除
- **THEN** 系統刪除 `tenant_{id}.db` 檔案，並記錄審計日誌

#### Scenario: 防止誤刪活躍租戶
- **WHEN** 平台管理員嘗試永久刪除 active 或 suspended 的租戶
- **THEN** 系統回傳 400 錯誤，要求先將租戶設為 deleted

---
### Requirement: 租戶建立時自動建立管理員帳號
系統 SHALL 在建立租戶時同時建立一個初始管理員帳號（super_admin 角色）。

#### Scenario: 自動建立初始管理員
- **WHEN** 新租戶建立成功
- **THEN** 系統在租戶資料庫中建立一個 super_admin 使用者，密碼 SHALL 使用 bcryptjs 雜湊儲存

---
### Requirement: 訂閱方案管理
系統 SHALL 允許平台管理員管理訂閱方案（CRUD），包含 max_users、max_subsidiaries 等限制。

#### Scenario: 建立訂閱方案
- **WHEN** 平台管理員建立新方案（name、max_users、max_subsidiaries、features）
- **THEN** 系統在 platform.db 的 subscription_plans 表新增記錄

#### Scenario: 租戶綁定方案
- **WHEN** 平台管理員將方案指派給租戶
- **THEN** 租戶的 plan_id 更新為指定方案

---
### Requirement: Demo 租戶資料遷移
系統初始化時 SHALL 自動建立一個 demo 租戶，並將現有 onboarding.db 的完整測試資料正確遷移至 demo 租戶的資料庫。遷移 SHALL 涵蓋所有 55+ 張業務表的資料，不可遺漏。

#### Scenario: demo 租戶自動建立
- **WHEN** 平台首次啟動且無任何租戶
- **THEN** 系統自動建立 demo 租戶（slug: demo, name: Demo Company），資料庫檔案為 `tenant_demo.db`

#### Scenario: 完整遷移 onboarding.db 資料
- **WHEN** demo 租戶建立時
- **THEN** 系統 SHALL 將 onboarding.db 中的所有業務資料完整遷移至 tenant_demo.db，包含但不限於：departments（7 個部門）、employees（12 名員工）、grade_levels（7 個職等）、grade_salary_levels（20 個薪級）、department_positions（58 個職位）、promotion_criteria、career_paths、grade_tracks、job_descriptions、competencies、templates、meetings 等所有表的資料

#### Scenario: 遷移後資料完整性驗證
- **WHEN** 遷移完成後
- **THEN** 系統 SHALL 驗證 tenant_demo.db 中各表的記錄數與 onboarding.db 一致，確保無資料遺漏

#### Scenario: 遷移後新增 RBAC 表與使用者帳號
- **WHEN** demo 租戶遷移完成
- **THEN** 系統 SHALL 額外建立 RBAC 表（users、roles、permissions、role_permissions、user_roles、org_units、refresh_tokens），並根據現有 employees 表的 12 名員工自動建立對應的 users 帳號（email 來自 employees.email，role 對應為：employees.role='manager' → hr_manager 角色、employees.role='employee' → employee 角色），以及建立 demo 管理員帳號（admin/admin123 → super_admin 角色）

#### Scenario: 現有 employees 表欄位保留
- **WHEN** 遷移至多租戶架構後
- **THEN** employees 表的既有欄位和資料 SHALL 完整保留不變，新增的 users 表透過 employee_id 外鍵與 employees 關聯，兩者並存且各司其職（employees 管理人事資料，users 管理登入與權限）
