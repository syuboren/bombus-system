## MODIFIED Requirements

### Requirement: 使用者角色指派（Scoped Roles）
The system SHALL support assigning roles to users with a bound scope (org_unit_id). In addition to manual assignment via the tenant admin interface, the system SHALL support automatic role assignment during candidate-to-employee conversion.

#### Scenario: 指派集團級角色
- **WHEN** a role with scope_type=global is assigned to a user
- **THEN** user_roles org_unit_id is set to the group root node ID, and the user can access all subsidiaries and departments

#### Scenario: 指派子公司級角色
- **WHEN** a role with scope_type=subsidiary is assigned to a user, bound to a subsidiary
- **THEN** user_roles org_unit_id is set to that subsidiary ID, and the user can only access that subsidiary and its departments

#### Scenario: 指派部門級角色
- **WHEN** a role with scope_type=department is assigned to a user, bound to a department
- **THEN** user_roles org_unit_id is set to that department ID, and the user can only access that department

#### Scenario: 同一使用者可擁有多個角色
- **WHEN** a user is assigned multiple roles (e.g., manager in dept A, employee in dept B)
- **THEN** the system SHALL merge all role permissions, taking the union

#### Scenario: Automatic employee role assignment during conversion
- **WHEN** a candidate is converted to an employee and a new user account is created
- **THEN** the system SHALL automatically assign the `employee` system role (is_system=1) to the new user, with org_unit_id set to the employee's assigned organizational unit (or NULL if no org unit is provided)

### Requirement: 既有組織管理模組整合
The system SHALL integrate the existing organization management module with real API data. The `employees` table SHALL include an `org_unit_id` column as a foreign key referencing `org_units(id)` to link employees to the organizational structure.

#### Scenario: 集團組織圖使用真實資料
- **WHEN** a user opens the group organization chart page (`/organization/group-structure`)
- **THEN** OrganizationService fetches data from `/api/organization/companies` (replacing mockCompanies), with Company data sourced from org_units(type=group/subsidiary)

#### Scenario: 部門結構管理使用真實資料
- **WHEN** a user opens the department structure management page (`/organization/department-structure`)
- **THEN** OrganizationService fetches department data from `/api/organization/departments` (replacing mockDepartments), sourced from org_units(type=department) and the existing departments table

#### Scenario: 員工管理使用真實資料
- **WHEN** a user opens the employee management page (`/organization/employee-management`)
- **THEN** OrganizationService fetches employee data from `/api/employee` (replacing mockEmployees), with multi-dimensional filtering and pagination

#### Scenario: CRUD 操作連接真實 API
- **WHEN** a user creates/modifies/deletes companies, departments, or employees in organization management
- **THEN** OrganizationService calls the corresponding backend API, and data is persisted to the tenant database

#### Scenario: 組織管理受權限控制
- **WHEN** a user does not have organization:manage permission
- **THEN** edit functions (create/modify/delete) in org chart and department structure SHALL be hidden, showing read-only mode only

#### Scenario: 員工與使用者帳號關聯
- **WHEN** both employees and users tables exist in the system
- **THEN** the system SHALL link users to employees via the employee_id column. Employees with an `org_unit_id` SHALL have their corresponding user_roles scoped to that organizational unit.

#### Scenario: Employee org_unit_id linked to org_units
- **WHEN** an employee record has a non-null `org_unit_id`
- **THEN** the `org_unit_id` SHALL reference a valid record in the `org_units` table, establishing the employee's position in the organizational hierarchy
