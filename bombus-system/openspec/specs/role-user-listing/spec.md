# Role User Listing — 角色使用者列表

## Purpose

定義角色管理頁面中角色卡片的使用者數量顯示與使用者列表 Modal 功能。

## Requirements

### Requirement: Role card user count display

Each role card on the Role Management page SHALL display the number of users assigned to that role in the format "已指派 N 位使用者". The count SHALL come from the `user_count` field returned by the existing `GET /api/tenant-admin/roles` endpoint. If no users are assigned (count is 0), the link SHALL be displayed in a disabled state.

#### Scenario: Role has assigned users

- **WHEN** a role has 3 users assigned
- **THEN** the role card displays "已指派 3 位使用者" as a clickable link

#### Scenario: Role has no assigned users

- **WHEN** a role has 0 users assigned
- **THEN** the role card displays "已指派 0 位使用者" in a disabled/muted state

---

### Requirement: Role users list modal

When admin clicks the user count link on a role card, the system SHALL open a modal displaying the list of users assigned to that role. Each user entry SHALL show the user's name, email, and scope name (if the assignment is scoped to an org unit). The data SHALL be fetched from `GET /api/tenant-admin/roles/:id/users`.

#### Scenario: Admin views users for a role

- **WHEN** admin clicks "已指派 3 位使用者" on a role card
- **THEN** a modal opens showing 3 user entries with name, email, and scope information

#### Scenario: Role users modal with scoped assignments

- **WHEN** a user is assigned a role scoped to a subsidiary named "台北分公司"
- **THEN** the user entry in the modal displays the scope name "台北分公司" alongside the user info

---

### Requirement: Role users API endpoint

The system SHALL provide a `GET /api/tenant-admin/roles/:id/users` endpoint that returns all users assigned to a specific role. The response SHALL include each user's id, name, email, and scope_name (from org_units if applicable). The endpoint SHALL return 404 if the role does not exist.

#### Scenario: Fetch users for existing role

- **WHEN** client sends GET /api/tenant-admin/roles/{roleId}/users for a valid role
- **THEN** the API returns `{ users: [{ id, name, email, scope_name }] }` with HTTP 200

#### Scenario: Fetch users for non-existent role

- **WHEN** client sends GET /api/tenant-admin/roles/{invalidId}/users
- **THEN** the API returns HTTP 404 with error message "角色不存在"
