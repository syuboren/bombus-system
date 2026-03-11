## ADDED Requirements

### Requirement: Recruitment candidate list filters by subsidiary

The system SHALL filter recruitment candidates by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/recruitment/candidates`, it SHALL return only candidates whose associated job has a matching `org_unit_id`. The filtering SHALL use a JOIN on the jobs table (`j.org_unit_id = ?`). When no `org_unit_id` parameter is provided, the API SHALL return all candidates.

#### Scenario: Filter candidates by subsidiary

- **WHEN** a GET request is made to `/api/recruitment/candidates?org_unit_id=org-sub-1`
- **THEN** the response SHALL contain only candidates whose associated job has `org_unit_id = 'org-sub-1'`

#### Scenario: No subsidiary filter returns all candidates

- **WHEN** a GET request is made to `/api/recruitment/candidates` without `org_unit_id` parameter
- **THEN** the response SHALL contain all candidates regardless of their job's org_unit_id

### Requirement: Talent pool list filters by subsidiary

The system SHALL filter talent pool entries by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/talent-pool`, it SHALL return only talent pool records with a matching `org_unit_id`. When no parameter is provided, the API SHALL return all records.

#### Scenario: Filter talent pool by subsidiary

- **WHEN** a GET request is made to `/api/talent-pool?org_unit_id=org-sub-1`
- **THEN** the response SHALL contain only talent pool records where `org_unit_id = 'org-sub-1'`

#### Scenario: No filter returns all talent pool records

- **WHEN** a GET request is made to `/api/talent-pool` without `org_unit_id` parameter
- **THEN** the response SHALL contain all talent pool records

### Requirement: Talent pool stats filter by subsidiary

The system SHALL filter talent pool statistics by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/talent-pool/stats`, all statistical queries SHALL include `WHERE org_unit_id = ?` filtering.

#### Scenario: Filter talent pool stats by subsidiary

- **WHEN** a GET request is made to `/api/talent-pool/stats?org_unit_id=org-sub-1`
- **THEN** the returned statistics SHALL reflect only talent pool records where `org_unit_id = 'org-sub-1'`

### Requirement: Meeting list filters by subsidiary

The system SHALL filter meetings by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/meetings`, it SHALL return only meetings with a matching `org_unit_id`. When no parameter is provided, the API SHALL return all meetings.

#### Scenario: Filter meetings by subsidiary

- **WHEN** a GET request is made to `/api/meetings?org_unit_id=org-sub-1`
- **THEN** the response SHALL contain only meetings where `org_unit_id = 'org-sub-1'`

#### Scenario: No filter returns all meetings

- **WHEN** a GET request is made to `/api/meetings` without `org_unit_id` parameter
- **THEN** the response SHALL contain all meetings

### Requirement: Meeting dashboard stats filter by subsidiary

The system SHALL filter meeting dashboard statistics by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/meetings/dashboard/stats`, all statistical queries SHALL include `WHERE org_unit_id = ?` filtering.

#### Scenario: Filter meeting stats by subsidiary

- **WHEN** a GET request is made to `/api/meetings/dashboard/stats?org_unit_id=org-sub-1`
- **THEN** the returned statistics SHALL reflect only meetings where `org_unit_id = 'org-sub-1'`

### Requirement: Meeting conclusions filter by subsidiary

The system SHALL filter meeting conclusions by subsidiary org_unit_id. When the API receives an `org_unit_id` query parameter on GET `/api/meetings/conclusions`, it SHALL JOIN the meetings table and filter by `meetings.org_unit_id = ?`.

#### Scenario: Filter conclusions by subsidiary

- **WHEN** a GET request is made to `/api/meetings/conclusions?org_unit_id=org-sub-1`
- **THEN** the response SHALL contain only conclusions from meetings where `org_unit_id = 'org-sub-1'`

### Requirement: Recruitment page subsidiary dropdown

The recruitment page SHALL display a subsidiary dropdown filter when multiple subsidiaries exist. When the user selects a subsidiary, the page SHALL reload the candidate list filtered by the selected subsidiary's org_unit_id. The dropdown SHALL use the standard `OrgUnitService` and reactive `toObservable` + `switchMap` pattern.

#### Scenario: User selects a subsidiary on recruitment page

- **WHEN** the user selects "DEMO subsidiary" from the subsidiary dropdown on the recruitment page
- **THEN** the candidate list SHALL reload showing only candidates belonging to jobs under "DEMO subsidiary"

### Requirement: Talent pool page subsidiary dropdown

The talent pool page SHALL display a subsidiary dropdown filter when multiple subsidiaries exist. When the user selects a subsidiary, the page SHALL reload both the talent list and statistics filtered by the selected subsidiary's org_unit_id.

#### Scenario: User selects a subsidiary on talent pool page

- **WHEN** the user selects a subsidiary from the dropdown on the talent pool page
- **THEN** both the talent list and statistics panels SHALL update to show only data for the selected subsidiary

### Requirement: Meeting page reactive subsidiary filtering

The meeting page SHALL reactively reload data when the subsidiary selection changes. The existing subsidiary dropdown SHALL trigger data reload for meeting list, calendar events, and dashboard statistics. The `buildScopeFilters()` method SHALL include `orgUnitId` in the filter parameters.

#### Scenario: User changes subsidiary on meeting page

- **WHEN** the user changes the subsidiary selection on the meeting page
- **THEN** the meeting list, calendar, and statistics SHALL all reload with data filtered by the new subsidiary
