## ADDED Requirements

### Requirement: Unified Employee interface

The system SHALL define a single `UnifiedEmployee` TypeScript interface in `shared/models/employee.model.ts` that merges the cross-company position support from `organization.model.ts` and the full history fields from `talent-pool.model.ts`. All employee-related pages SHALL use this unified interface.

#### Scenario: UnifiedEmployee contains all required fields

- **WHEN** a developer imports `UnifiedEmployee` from `shared/models/employee.model.ts`
- **THEN** the interface SHALL include: `id`, `employeeNo`, `name`, `englishName?`, `email`, `phone`, `mobile?`, `gender`, `birthDate?`, `hireDate`, `status` (EmployeeStatus), `avatar?`, `contractType`, `workLocation?`, `positions` (EmployeePosition[]), `education?`, `skills?`, `certifications?`, `emergencyContact?`, `userId?`, `userStatus?`

#### Scenario: UnifiedEmployeeDetail extends UnifiedEmployee with history

- **WHEN** a developer imports `UnifiedEmployeeDetail` from `shared/models/employee.model.ts`
- **THEN** the interface SHALL extend `UnifiedEmployee` and add: `workHistory` (JobChange[]), `documents` (EmployeeDocument[]), `training` (EmployeeTraining[]), `performance` (EmployeePerformance[]), `roi` (EmployeeROI), `candidateSource?`, `onboardingProgress?`, `auditLogs?`, `userRoles?` (UserRole[])

---

### Requirement: Deprecated legacy Employee interfaces

The existing `Employee` interface in `organization.model.ts` and `EmployeeDetail` in `talent-pool.model.ts` SHALL be marked with `@deprecated` JSDoc annotations directing developers to use the unified model. These interfaces SHALL NOT be removed until all consuming components have been migrated.

#### Scenario: Legacy interface marked as deprecated

- **WHEN** a developer hovers over the `Employee` type from `organization.model.ts` in the IDE
- **THEN** the IDE SHALL display a deprecation warning with the message directing to use `UnifiedEmployee` from `shared/models/employee.model.ts`

---

### Requirement: Unified Employee list API response

The `GET /api/employee/list` endpoint SHALL return employee records conforming to the `UnifiedEmployee` shape, including `positions[]` array with company and department information, and `userId`/`userStatus` fields indicating linked user account status.

#### Scenario: Employee list returns positions array

- **WHEN** a client calls `GET /api/employee/list`
- **THEN** each employee record SHALL include a `positions` array where each position has: `id`, `companyId`, `companyName`, `departmentId`, `departmentName`, `positionTitle`, `positionLevel`, `isPrimary` (boolean), `startDate`, and optional `endDate`

#### Scenario: Employee list returns user account status

- **WHEN** a client calls `GET /api/employee/list`
- **THEN** each employee record SHALL include `userId` (string or null) and `userStatus` (string or null) fields populated by joining the `users` table on `users.employee_id = employees.id`

#### Scenario: Employee list supports org_unit_id filtering

- **WHEN** a client calls `GET /api/employee/list?org_unit_id=xxx`
- **THEN** the response SHALL only include employees whose `org_unit_id` matches the provided value or whose org_unit is a descendant of the provided org_unit in the hierarchy

---

### Requirement: Unified Employee detail API response

The `GET /api/employee/:id` endpoint SHALL return a full `UnifiedEmployeeDetail` shape including all history records, documents, training, performance, ROI data, and linked user roles.

#### Scenario: Employee detail returns complete data

- **WHEN** a client calls `GET /api/employee/:id` with a valid employee ID
- **THEN** the response SHALL include all `UnifiedEmployee` fields plus: `workHistory` (from `employee_job_changes`), `documents` (from `employee_documents` and `submissions`), `training` (from `employee_training`), `performance` (from `employee_performance`), `roi` (from `employee_roi`), `auditLogs` (from employee audit records), and `userRoles` (from `user_roles` joined with `roles` for the linked user)

#### Scenario: Employee detail for employee without user account

- **WHEN** a client calls `GET /api/employee/:id` for an employee with no linked user account
- **THEN** the response SHALL have `userId: null`, `userStatus: null`, and `userRoles: []`

---

### Requirement: Employee database schema extensions

The `employees` table SHALL include additional columns to support the unified model: `english_name`, `mobile`, `gender`, `birth_date`, `address`, `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`, and `import_job_id`. These columns SHALL be added via idempotent migration in both `initTenantSchema()` and `_runMigrations()`.

#### Scenario: Schema migration adds new columns

- **WHEN** the tenant database initializes or runs migrations
- **THEN** the system SHALL add all new employee columns using `ALTER TABLE employees ADD COLUMN` wrapped in try-catch to skip already-existing columns
