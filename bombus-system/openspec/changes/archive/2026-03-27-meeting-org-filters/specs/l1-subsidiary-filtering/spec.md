## ADDED Requirements

### Requirement: Meeting page company tab subsidiary dropdown

The meeting page calendar "Company" tab SHALL display a subsidiary dropdown filter. When the user selects a subsidiary, the system SHALL reload meeting data filtered by the selected `org_unit_id`. The dropdown SHALL use `OrgUnitService.subsidiaries` and the existing `selectedSubsidiaryId` signal.

#### Scenario: User selects subsidiary on company tab

- **WHEN** the user is on the calendar "Company" tab and selects a subsidiary from the dropdown
- **THEN** the meeting calendar SHALL reload showing only meetings with the selected `org_unit_id`

#### Scenario: Company tab shows all meetings by default

- **WHEN** the user is on the calendar "Company" tab with no subsidiary selected (shows "all")
- **THEN** the meeting calendar SHALL display all meetings regardless of `org_unit_id`

### Requirement: Meeting page personal tab subsidiary and department dropdowns

The meeting page calendar "Personal" tab SHALL display subsidiary and department dropdown filters before the employee dropdown. The subsidiary dropdown SHALL filter the department dropdown options via cascading. The department dropdown SHALL use `OrgUnitService.filterDepartments(selectedSubsidiaryId)`.

#### Scenario: User selects subsidiary on personal tab

- **WHEN** the user is on the calendar "Personal" tab and selects a subsidiary
- **THEN** the department dropdown SHALL show only departments belonging to that subsidiary

#### Scenario: User selects department on personal tab

- **WHEN** the user selects a department on the "Personal" tab
- **THEN** the `buildScopeFilters()` method SHALL include `department` in the API query parameters

### Requirement: Meeting list tab subsidiary and department filters

The meeting list tab filter bar SHALL include subsidiary and department filter items in addition to the existing type and status filters. The subsidiary filter SHALL use `selectedSubsidiaryId` signal. The department filter SHALL use `selectedDepartment` signal with cascading from the subsidiary selection.

#### Scenario: User filters meeting list by subsidiary

- **WHEN** the user selects a subsidiary from the meeting list filter bar
- **THEN** the meeting list SHALL reload showing only meetings with the matching `org_unit_id`

#### Scenario: User filters meeting list by department

- **WHEN** the user selects a department from the meeting list filter bar
- **THEN** the meeting list SHALL reload showing only meetings with the matching `department`

### Requirement: Meeting list filters by department

The system SHALL filter meetings by department. When the API receives a `department` query parameter on GET `/api/meetings`, it SHALL return only meetings with a matching `department` value. When no `department` parameter is provided, the API SHALL return meetings without department filtering.

#### Scenario: Filter meetings by department

- **WHEN** a GET request is made to `/api/meetings?department=Engineering`
- **THEN** the response SHALL contain only meetings where `department = 'Engineering'`

#### Scenario: No department filter returns all meetings

- **WHEN** a GET request is made to `/api/meetings` without `department` parameter
- **THEN** the response SHALL contain all meetings regardless of department

### Requirement: Meeting modal attendee department filter

The add/edit meeting modal SHALL display a department filter dropdown in the attendee selection section. When a department is selected, the attendee grid SHALL show only employees belonging to that department. This filter SHALL use an independent `modalAttendeeDept` signal separate from the global `selectedDepartment`.

#### Scenario: User filters attendees by department in modal

- **WHEN** the user selects "Engineering" from the attendee department filter in the modal
- **THEN** the attendee grid SHALL show only employees whose department matches "Engineering"

#### Scenario: No department filter shows all attendees

- **WHEN** the attendee department filter is set to "all" (empty)
- **THEN** the attendee grid SHALL show all available employees

## MODIFIED Requirements

### Requirement: Meeting page reactive subsidiary filtering

The meeting page SHALL reactively reload data when the subsidiary selection changes. The existing subsidiary dropdown SHALL trigger data reload for meeting list, calendar events, and dashboard statistics. The `buildScopeFilters()` method SHALL include `orgUnitId` in the filter parameters. The `buildScopeFilters()` method SHALL also include `department` when a department is selected, for all scopes that have a department dropdown (department scope and personal scope).

#### Scenario: User changes subsidiary on meeting page

- **WHEN** the user changes the subsidiary selection on the meeting page
- **THEN** the meeting list, calendar, and statistics SHALL all reload with data filtered by the new subsidiary

#### Scenario: User changes department on personal scope

- **WHEN** the user changes the department selection on the personal scope tab
- **THEN** the meeting data SHALL reload with both subsidiary and department filters applied
