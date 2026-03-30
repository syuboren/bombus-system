## ADDED Requirements

### Requirement: Batch import modal rendering

The employee management page SHALL render a batch import modal overlay when the `showBatchModal` signal is `true`. The modal SHALL use a step-based state machine controlled by a `batchStep` signal with values: `'upload'`, `'validating'`, `'preview'`, `'importing'`, `'complete'`.

#### Scenario: Modal opens on button click

- **WHEN** HR clicks the "批次匯入" button
- **THEN** the modal overlay SHALL appear with the initial step set to `'upload'`

#### Scenario: Modal closes

- **WHEN** HR clicks the close button or backdrop
- **THEN** the modal SHALL close, all state SHALL reset, and any active polling interval SHALL be cleared

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

---

### Requirement: Polling cleanup on destroy

All active polling intervals SHALL be cleared when the modal closes or the component is destroyed.

#### Scenario: Component destroyed during import

- **WHEN** the component is destroyed while an import polling interval is active
- **THEN** the interval SHALL be cleared to prevent memory leaks

#### Scenario: Modal closed during import

- **WHEN** HR closes the modal during the `'importing'` step
- **THEN** the polling interval SHALL be cleared and the modal state SHALL reset
