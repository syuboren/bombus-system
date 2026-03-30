# Batch Import Workflow Modal

## Purpose

Provides a six-step batch employee import workflow modal in the employee management page (`/settings/users`). The modal handles CSV upload, validation preview, import execution with progress polling, and result report download.

## Requirements

### Requirement: Batch import modal rendering

The employee management page SHALL render a batch import modal overlay when the `showBatchModal` signal is `true`. The modal SHALL use a step-based state machine controlled by a `batchStep` signal with values: `'upload'`, `'validating'`, `'preview'`, `'importing'`, `'complete'`.

#### Scenario: Modal opens on button click

- **WHEN** HR clicks the "批次匯入" button
- **THEN** the modal overlay SHALL appear with the initial step set to `'upload'`

#### Scenario: Modal closes

- **WHEN** HR clicks the close button or backdrop
- **THEN** the modal SHALL close, all state SHALL reset, and any active polling interval SHALL be cleared


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: CSV upload step

The upload step SHALL display a file drop zone that accepts `.csv` files, a file input button, and a "Download CSV Template" link.

#### Scenario: File selected via input

- **WHEN** HR selects a `.csv` file via the file input
- **THEN** the system SHALL parse the CSV content, extract rows as objects using the header-to-field mapping, display the file name, and enable the "開始驗證" button

#### Scenario: File drag and drop

- **WHEN** HR drags and drops a `.csv` file onto the drop zone
- **THEN** the system SHALL parse the file identically to the file input scenario

#### Scenario: CSV template download

- **WHEN** HR clicks "下載 CSV 範本"
- **THEN** the system SHALL generate and download a CSV file with all supported column headers (Chinese names) and one example row

#### Scenario: Non-CSV file rejected

- **WHEN** HR selects a non-CSV file
- **THEN** the system SHALL display an error message "僅支援 CSV 格式" and SHALL NOT enable the validation button


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: Validation step

The validation step SHALL call `EmployeeService.batchImportValidate()` with the parsed rows and display a loading indicator during the API call.

#### Scenario: Validation in progress

- **WHEN** the system is calling the validation API
- **THEN** the modal SHALL display a spinner with text "驗證中..." and the step SHALL be `'validating'`

#### Scenario: Validation complete with no errors

- **WHEN** the validation API returns `errorRows === 0`
- **THEN** the step SHALL advance to `'preview'` and the "確認匯入" button SHALL be enabled

#### Scenario: Validation complete with errors

- **WHEN** the validation API returns `errorRows > 0`
- **THEN** the step SHALL advance to `'preview'` and the "確認匯入" button SHALL be disabled


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: Preview report step

The preview step SHALL display a table showing each row's validation result with row number, employee name, email, status icon (✓ or ✗), and error messages for failed rows.

#### Scenario: Preview table rendering

- **WHEN** the step is `'preview'`
- **THEN** the modal SHALL display all validation rows in a scrollable table with status indicators

#### Scenario: Error row highlighting

- **WHEN** a row has `status === 'error'`
- **THEN** the row SHALL be highlighted with a red background and display the error messages

#### Scenario: Confirm import button state

- **WHEN** `errorRows > 0`
- **THEN** the "確認匯入" button SHALL be disabled with tooltip "請修正錯誤後重新上傳"


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: Import execution step

The import execution step SHALL call `EmployeeService.batchImportExecute()` and poll `EmployeeService.batchImportStatus()` every 2 seconds to update a progress bar.

#### Scenario: Import starts

- **WHEN** HR clicks "確認匯入"
- **THEN** the step SHALL change to `'importing'`, the system SHALL call the execute API, and begin polling the status API every 2 seconds

#### Scenario: Progress bar updates

- **WHEN** the status API returns updated `processedRows`
- **THEN** the progress bar SHALL update to show `processedRows / totalRows` percentage and display "N / M 筆處理中..."

#### Scenario: Import completes

- **WHEN** the status API returns `status === 'completed'`
- **THEN** the polling SHALL stop, the step SHALL advance to `'complete'`, and the system SHALL load the result report


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: Result report step

The result step SHALL display import statistics and a detailed result table with a download button.

#### Scenario: Statistics summary

- **WHEN** the step is `'complete'`
- **THEN** the modal SHALL display success count, error count, and total count as summary cards

#### Scenario: Result table with passwords

- **WHEN** the result report is loaded
- **THEN** the table SHALL display each row's name, email, employee number, status, initial password (for successful rows), and error message (for failed rows)

#### Scenario: Download report as CSV

- **WHEN** HR clicks "下載報告"
- **THEN** the system SHALL generate a CSV file containing row number, name, email, employee number, status, initial password, and error message, and trigger a browser download


<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->

---
### Requirement: Polling cleanup on destroy

All active polling intervals SHALL be cleared when the modal closes or the component is destroyed.

#### Scenario: Component destroyed during import

- **WHEN** the component is destroyed while an import polling interval is active
- **THEN** the interval SHALL be cleared to prevent memory leaks

#### Scenario: Modal closed during import

- **WHEN** HR closes the modal during the `'importing'` step
- **THEN** the polling interval SHALL be cleared and the modal state SHALL reset

<!-- @trace
source: batch-import-modal
updated: 2026-03-31
code:
  - bombus-system/.claude/skills/spectra-discuss/SKILL.md
  - bombus-system/openspec/changes/batch-import-modal/tasks.md
  - bombus-system/.claude/commands/spectra/propose.md
  - bombus-system/.claude/commands/spectra/discuss.md
  - bombus-system/docs/備份/Account_Management_Module_Implementation_Plan.md
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.html
  - bombus-system/openspec/changes/batch-import-modal/.openspec.yaml
  - bombus-system/docs/功能說明書/簡報_職能評估.pdf
  - bombus-system/server/src/routes/auth.js
  - bombus-system/openspec/changes/simplify-grade-matrix/specs/grade-matrix-template-import/spec.md
  - bombus-system/docs/resume_api_test_results.html
  - bombus-system/docs/resume_api_test_results.json
  - bombus-system/openspec/changes/batch-import-modal/design.md
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.html
  - bombus-system/.claude/commands/spectra/ingest.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts
  - bombus-system/src/app/shared/models/employee.model.ts
  - bombus-system/docs/備份/candidates-tables-summary.md
  - bombus-system/.claude/skills/spectra-debug/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.ts
  - bombus-system/.agent/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.html
  - bombus-system/docs/candidates-tables-summary.md
  - bombus-system/src/app/core/services/feature-gate.service.ts
  - bombus-system/docs/permission-management-guide.html
  - bombus-system/.claude/commands/spectra/ask.md
  - bombus-system/.agent/skills/spectra-debug/SKILL.md
  - bombus-system/.agent/workflows/spectra-apply.md
  - bombus-system/docs/備份/permission-management-guide.md
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss
  - bombus-system/.agent/skills/spectra-ingest/SKILL.md
  - bombus-system/.claude/commands/spectra/apply.md
  - bombus-system/AGENTS.md
  - bombus-system/server/src/routes/competency.js
  - bombus-system/src/app/features/platform-admin/pages/plan-management-page/plan-management-page.component.ts
  - bombus-system/.claude/skills/spectra-propose/SKILL.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書_組織架構與權限管理.html
  - bombus-system/server/src/routes/employee.js
  - bombus-system/docs/功能說明書/簡報_職能評估.html
  - bombus-system/.agent/skills/spectra-propose/SKILL.md
  - bombus-system/openspec/changes/simplify-grade-matrix/tasks.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/openspec/changes/batch-import-modal/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/db/db-adapter.js
  - bombus-system/.agent/skills/spectra-discuss/SKILL.md
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.pdf
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts
  - bombus-system/server/src/routes/platform.js
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/routes/hr-onboarding.js
  - bombus-system/src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html
  - bombus-system/docs/功能說明書_組織架構與權限管理.md
  - bombus-system/.agent/workflows/spectra-ingest.md
  - bombus-system/openspec/changes/fix-departments-org-isolation/specs/departments-org-isolation/spec.md
  - bombus-system/server/src/routes/grade-matrix.js
  - bombus-system/.claude/skills/spectra-ask/SKILL.md
  - bombus-system/docs/備份/resume_api_test_results.json
  - bombus-system/openspec/changes/simplify-grade-matrix/proposal.md
  - bombus-system/server/src/index.js
  - bombus-system/src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss
  - bombus-system/src/app/shared/components/employee-detail/employee-detail.component.ts
  - bombus-system/docs/Account_Management_Module_Implementation_Plan.md
  - bombus-system/openspec/changes/batch-import-modal/proposal.md
  - bombus-system/docs/備份/功能說明書_招募管理與AI智能面試拷貝.html
  - bombus-system/.claude/skills/spectra-apply/SKILL.md
  - bombus-system/docs/備份/部署說明文件.html
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.html
  - bombus-system/docs/部署說明文件.html
  - bombus-system/.claude/skills/spectra-audit/SKILL.md
  - bombus-system/.claude/skills/spectra-ingest/SKILL.md
  - bombus-system/.spectra.yaml
  - bombus-system/openspec/changes/fix-departments-org-isolation/design.md
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.md
  - bombus-system/docs/_html-to-pdf.js
  - bombus-system/docs/功能說明書/Bombus_系統操作指引.html
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.html
  - bombus-system/docs/備份/Resume_API_Sandbox_Test_Report.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.pdf
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.html
  - bombus-system/src/app/features/competency/services/competency.service.ts
  - bombus-system/openspec/changes/fix-departments-org-isolation/proposal.md
  - bombus-system/server/src/routes/batch-import.js
  - bombus-system/.claude/skills/spectra-archive/SKILL.md
  - bombus-system/docs/功能說明書/簡報_組織架構與權限管理.pdf
  - bombus-system/src/app/features/competency/components/track-edit-modal/track-edit-modal.component.ts
  - bombus-system/.claude/commands/spectra/debug.md
  - bombus-system/openspec/changes/simplify-grade-matrix/design.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.md
  - bombus-system/.agent/workflows/spectra-ask.md
  - bombus-system/docs/Resume_API_Sandbox_Test_Report.html
  - bombus-system/src/app/features/platform-admin/models/platform.model.ts
  - bombus-system/.agent/workflows/spectra-debug.md
  - bombus-system/server/src/middleware/permission.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/tasks.md
  - bombus-system/docs/功能說明書/簡報_系統操作指引.html
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.html
  - bombus-system/.agent/skills/spectra-ask/SKILL.md
  - bombus-system/src/app/features/platform-admin/pages/tenant-management-page/tenant-management-page.component.scss
  - bombus-system/docs/功能說明書/功能說明書_組織架構與權限管理.md
  - bombus-system/docs/備份/permission-management-guide.html
  - bombus-system/docs/功能說明書/簡報_招募與AI智能面試.html
  - bombus-system/docs/功能說明書/簡報_職務說明書與職能職等管理.pdf
  - bombus-system/.agent/workflows/spectra-propose.md
  - bombus-system/server/src/routes/organization.js
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.html
  - bombus-system/docs/permission-management-guide.md
  - bombus-system/docs/MULTI_TENANT_ARCHITECTURE.md
  - bombus-system/docs/備份/MULTI_TENANT_ARCHITECTURE拷貝.html
  - bombus-system/.agent/workflows/spectra-discuss.md
  - bombus-system/openspec/specs/batch-import-workflow-modal/spec.md
  - bombus-system/server/src/routes/tenant-admin.js
  - bombus-system/openspec/changes/fix-departments-org-isolation/.openspec.yaml
  - bombus-system/openspec/changes/simplify-grade-matrix/.openspec.yaml
-->