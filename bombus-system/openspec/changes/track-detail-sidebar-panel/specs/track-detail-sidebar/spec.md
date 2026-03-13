## ADDED Requirements

### Requirement: Sidebar panel opens on track detail row click

The system SHALL open a right-side sliding panel (420px width) when the user clicks a row in the track detail table (Tab B/C: management/professional tracks). The panel SHALL replace the previous inline row expansion behavior. The panel SHALL display the grade number and track name in its header.

#### Scenario: User clicks a grade row in track detail tab

- **WHEN** the user clicks a grade row in the management or professional track detail table
- **THEN** a sidebar panel slides in from the right, showing the track entry data and promotion criteria for the selected grade and track

#### Scenario: User clicks a different grade row while panel is open

- **WHEN** a sidebar panel is already open for Grade 5 and the user clicks the Grade 3 row
- **THEN** the panel content updates to show Grade 3 data without closing and reopening

#### Scenario: User clicks the same grade row while panel is open

- **WHEN** a sidebar panel is already open for Grade 5 and the user clicks Grade 5 row again
- **THEN** the sidebar panel SHALL close

### Requirement: Panel displays track entry fields

The panel SHALL display four track entry fields in Section 1 (軌道資訊): title (職稱), education requirement (學歷要求), responsibility description (職責描述), and required skills and training (所需技能與培訓). Title SHALL be marked as required.

#### Scenario: View mode displays read-only track entry data

- **WHEN** the page is NOT in edit mode and the panel is open
- **THEN** all track entry fields SHALL be displayed as read-only text
- **THEN** fields without data SHALL show "尚未設定"
- **THEN** the panel footer SHALL show only a "關閉" button

#### Scenario: Edit mode displays editable track entry fields

- **WHEN** the page is in edit mode and the panel is open
- **THEN** title SHALL be an editable text input
- **THEN** education requirement SHALL be an editable text input
- **THEN** responsibility description SHALL be an editable textarea
- **THEN** required skills and training SHALL be an editable textarea
- **THEN** the panel footer SHALL show "取消" and "儲存" buttons

### Requirement: Panel embeds promotion criteria management

The panel SHALL embed a promotion criteria form in Section 2 (晉升條件), separated from Section 1 by a visual divider. The section header SHALL display the promotion path direction (e.g., "Grade 5 → Grade 6"). The `fromGrade` SHALL be automatically bound to the current grade number (read-only). The `toGrade` SHALL default to `fromGrade + 1`. The `track` SHALL be automatically bound to the current track code (read-only).

#### Scenario: Panel shows promotion criteria form fields

- **WHEN** the panel is open in edit mode
- **THEN** the promotion criteria section SHALL display: performance threshold (select), promotion procedure (text input), required skills (chip input), required courses (chip input), KPI focus (chip input), additional criteria (chip input)

#### Scenario: Panel shows existing promotion criteria data

- **WHEN** a promotion criteria record exists for the current grade and track
- **THEN** the form fields SHALL be pre-populated with the existing data
- **THEN** saving SHALL update the existing record (not create a duplicate)

#### Scenario: Panel shows empty promotion criteria form for new criteria

- **WHEN** no promotion criteria record exists for the current grade and track
- **THEN** the form fields SHALL be empty with default values
- **THEN** saving SHALL create a new promotion criteria record

#### Scenario: Highest grade hides promotion criteria section

- **WHEN** the panel is open for the highest grade in the system (no higher grade exists)
- **THEN** the promotion criteria section SHALL be hidden or show "已達最高職等" message

### Requirement: Chip input for dynamic list fields

The promotion criteria section SHALL use chip input components for required skills, required courses, KPI focus, and additional criteria. Users SHALL add items by typing text and pressing Enter. Users SHALL remove items by clicking the remove button on each chip.

#### Scenario: User adds a chip item

- **WHEN** the user types "領導力培訓" in the required skills chip input and presses Enter
- **THEN** a new chip "領導力培訓" SHALL appear in the chip container
- **THEN** the text input SHALL be cleared

#### Scenario: User removes a chip item

- **WHEN** the user clicks the remove button on a chip
- **THEN** that chip SHALL be removed from the list

#### Scenario: Read-only mode shows chips as static labels

- **WHEN** the page is NOT in edit mode
- **THEN** chip items SHALL be displayed as static labels without remove buttons
- **THEN** empty chip lists SHALL show "尚未設定"

### Requirement: Combined save for track entry and promotion criteria

The panel's save button SHALL save both track entry fields and promotion criteria in a single operation. Track entry SHALL be saved first; promotion criteria SHALL be saved after track entry succeeds. If promotion criteria fields are all empty and no existing record exists, the promotion criteria save SHALL be skipped.

#### Scenario: Successful combined save

- **WHEN** the user fills in track entry fields and promotion criteria fields, then clicks "儲存"
- **THEN** the system SHALL first save the track entry via API
- **THEN** upon success, the system SHALL save the promotion criteria via API
- **THEN** the panel SHALL close and the page data SHALL reload

#### Scenario: Track entry save fails

- **WHEN** the track entry save API returns an error
- **THEN** the promotion criteria save SHALL NOT be attempted
- **THEN** an error message SHALL be displayed in the panel

#### Scenario: Promotion criteria save fails after track entry succeeds

- **WHEN** the track entry saves successfully but the promotion criteria save fails
- **THEN** an error message SHALL be displayed specifying the promotion criteria failure
- **THEN** the panel SHALL remain open for the user to retry

#### Scenario: Save with empty promotion criteria

- **WHEN** the user fills in track entry fields but leaves all promotion criteria fields empty (and no existing record)
- **THEN** only the track entry SHALL be saved
- **THEN** no promotion criteria API call SHALL be made

### Requirement: Toolbar promotion button removed from track detail

The "新增晉升條件" button SHALL be removed from the track detail toolbar. Promotion criteria management SHALL only be accessible through the sidebar panel.

#### Scenario: Track detail toolbar in edit mode

- **WHEN** the page is in edit mode and Tab B/C is active
- **THEN** the toolbar SHALL show the "新增職位" button but NOT the "新增晉升條件" button

### Requirement: Position inline editing preserved

The inline editing of department × position titles in the track detail table SHALL remain unchanged. Clicking a position cell SHALL NOT trigger the sidebar panel opening.

#### Scenario: User edits a position title inline

- **WHEN** the user clicks a position cell in the track detail table in edit mode
- **THEN** the position title input SHALL appear for inline editing
- **THEN** the sidebar panel SHALL NOT open from this click

### Requirement: Active row highlighting

When the sidebar panel is open, the corresponding table row SHALL be visually highlighted to indicate which grade is being edited.

#### Scenario: Panel open shows active row

- **WHEN** the sidebar panel is open for Grade 5
- **THEN** the Grade 5 row in the track detail table SHALL have an active visual state (highlight background and left border accent)
