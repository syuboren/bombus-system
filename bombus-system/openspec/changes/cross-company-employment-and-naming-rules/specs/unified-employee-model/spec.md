## MODIFIED Requirements

### Requirement: Unified Employee interface

The system SHALL define a single `UnifiedEmployee` TypeScript interface in `shared/models/employee.model.ts` that merges the cross-company position support from `organization.model.ts` and the full history fields from `talent-pool.model.ts`. All employee-related pages SHALL use this unified interface. The interface SHALL include `assignments: EmployeeAssignment[]` for cross-company employment records and `crossCompanyCode?: string` for the system-assigned cross-company identifier.

#### Scenario: UnifiedEmployee contains all required fields

- **WHEN** a developer imports `UnifiedEmployee` from `shared/models/employee.model.ts`
- **THEN** the interface SHALL include: `id`, `employeeNo`, `crossCompanyCode?`, `name`, `englishName?`, `email`, `phone`, `mobile?`, `gender`, `birthDate?`, `hireDate`, `status` (EmployeeStatus), `avatar?`, `contractType`, `workLocation?`, `positions` (EmployeePosition[]), `assignments` (EmployeeAssignment[]), `education?`, `skills?`, `certifications?`, `emergencyContact?`, `userId?`, `userStatus?`

#### Scenario: UnifiedEmployeeDetail extends UnifiedEmployee with history

- **WHEN** a developer imports `UnifiedEmployeeDetail` from `shared/models/employee.model.ts`
- **THEN** the interface SHALL extend `UnifiedEmployee` and add: `workHistory` (JobChange[]), `documents` (EmployeeDocument[]), `training` (EmployeeTraining[]), `performance` (EmployeePerformance[]), `roi` (EmployeeROI), `candidateSource?`, `onboardingProgress?`, `auditLogs?`, `userRoles?` (UserRole[])

#### Scenario: EmployeeAssignment shape

- **WHEN** a developer imports `EmployeeAssignment` from `shared/models/employee.model.ts`
- **THEN** the interface SHALL include: `id`, `employeeId`, `orgUnitId`, `position?`, `grade?`, `level?`, `isPrimary` (boolean), `startDate`, `endDate?` (NULL means active)
- **AND** the interface SHALL carry a JSDoc comment clarifying it is the DB-row shape for cross-company employment (not to be confused with `UserRole` assignments or D-16 `IndustryDeptAssignment`)

#### Scenario: positions[] derived from assignments[]

- **WHEN** the backend builds an employee response for an employee with two active assignments
- **THEN** `assignments[]` SHALL contain both raw rows AND `positions[]` SHALL contain two entries (one per active assignment) with resolved `companyName` and `departmentName` from `org_units` JOIN, `isPrimary` mirroring each assignment's value

## ADDED Requirements

### Requirement: Unified Employee API includes assignments and cross_company_code

The `GET /api/employee/list` and `GET /api/employee/:id` endpoints SHALL return employee records that include `assignments` (array of all active assignments transformed into `EmployeeAssignment` shape) and `crossCompanyCode` (NULL when not populated). Frontend service mappers SHALL preserve these fields when transforming raw API responses to `UnifiedEmployee`.

#### Scenario: List API returns assignments array

- **WHEN** `GET /api/employee/list` is called
- **THEN** each employee object in the response SHALL include `assignments: [...]` containing one or more active assignment records, sorted by `is_primary DESC, start_date ASC`

#### Scenario: Detail API includes cross_company_code

- **WHEN** `GET /api/employee/emp-001` is called for an employee with `cross_company_code='HQ-005'`
- **THEN** the response SHALL include `"crossCompanyCode": "HQ-005"`; for an employee with NULL value, the field SHALL be `null` (not omitted)
