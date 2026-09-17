# Shift Feature — Frontend Migration Guide

> Based on: `shift-controller-enhancements.md`
> Branch: `refactoring-shifts-deep` | Date: 2026-05-04

This document lists every API call the frontend must update. Each section shows the
old call, the new call, what changed in the request/response, and a concrete example.

---

## Quick-Reference Table

| # | Old endpoint | New endpoint | Verb change | Response change | Priority |
|---|---|---|---|---|---|
| 1 | `GET /api/UserWorkShifts/DeleteUserShiftAssignment/{id}` | `DELETE /api/shift-assignments/{id}` | **GET → DELETE** | None | 🔴 Critical |
| 2 | `POST /api/UserWorkShifts/AssignUserShift` | `POST /api/shift-assignments/AssignUserShift` | None | **Array → Single object** | 🔴 Critical |
| 3 | `/api/UserWorkShifts/…` (all routes) | `/api/shift-assignments/…` | None | None | 🔴 Critical |
| 4 | `POST /api/shifts/AddShiftLog/{shiftId}` | `POST /api/shifts/{shiftId}/default` | None | **String → ShiftModel** | 🟡 Important |
| 5 | `POST /api/shifts/PopulateAllShiftDays` | same + `?confirm=CONFIRM` | None | None | 🟡 Important |
| 6 | `POST/PUT` error shape on assignment endpoints | unified `ApiResponse` | None | Error body shape | 🟡 Important |
| 7 | *(not available)* | `GET /api/shift-assignments/{id}` | New endpoint | — | 🟢 Enhancement |
| 8 | *(not available)* | `GET /api/shifts/default-history` | New endpoint | — | 🟢 Enhancement |
| 9 | *(not available)* | `GET /api/shifts/my-shift-days` | New endpoint | — | 🟢 Enhancement |

---

## Common Response Wrapper

All responses (unless noted) are wrapped in:

```json
{
  "success": true,
  "message": "...",
  "data": { /* payload */ }
}
```

Error responses share the same wrapper with `"success": false`.

---

## Change 1 — 🔴 Delete Assignment: GET → DELETE + route rename

### What changed
The HTTP verb changes from `GET` to `DELETE`. The route segment
`DeleteUserShiftAssignment` is removed — the resource ID moves to the base path.
The base URL prefix also changes (see Change 3).

### Before

```
GET /api/UserWorkShifts/DeleteUserShiftAssignment/{id}
```

```ts
deleteAssignment(id: number) {
  return this.http.get(`/api/UserWorkShifts/DeleteUserShiftAssignment/${id}`);
}
```

### After

```
DELETE /api/shift-assignments/{id}
```

```ts
deleteAssignment(id: number) {
  return this.http.delete(`/api/shift-assignments/${id}`);
}
```

### Response — unchanged

```json
{ "success": true, "data": "Deleted successfully!" }
```

### What to search for in frontend code

```
DeleteUserShiftAssignment
```

---

## Change 2 — 🔴 Assign Shift: Response Changes from Array to Single Object

### What changed
`AssignUserShift` used to return `ApiResponse<List<ShiftAssignmentModel>>`. It now
returns `ApiResponse<ShiftAssignmentModel>` (one object, not a one-element array).

### Request — unchanged

```
POST /api/shift-assignments/AssignUserShift
Content-Type: application/json

{
  "startDate": "2026-06-01",
  "endDate": "2026-12-31",
  "fkShiftId": 3,
  "assignedUserIds": [101, 102],
  "employeeWorkingDays": "0,1,2,3,4",
  "workShiftType": 1
}
```

### Response — before

```json
{
  "success": true,
  "data": [
    {
      "id": 55,
      "startDate": "2026-06-01",
      "endDate": "2026-12-31",
      "fkShiftId": 3,
      "assignedUserIds": [101, 102],
      "employeeWorkingDays": "0,1,2,3,4",
      "workShiftType": 1,
      "concurrencyUpdateVersion": 0
    }
  ]
}
```

### Response — after

```json
{
  "success": true,
  "data": {
    "id": 55,
    "startDate": "2026-06-01",
    "endDate": "2026-12-31",
    "fkShiftId": 3,
    "assignedUserIds": [101, 102],
    "employeeWorkingDays": "0,1,2,3,4",
    "workShiftType": 1,
    "concurrencyUpdateVersion": 0
  }
}
```

### What to update in frontend code

```ts
// Before
const assignment = response.data[0];
const id = response.data[0].id;

// After
const assignment = response.data;
const id = response.data.id;
```

---

## Change 3 — 🔴 Controller Renamed: `/api/UserWorkShifts` → `/api/shift-assignments`

### What changed
The `UserWorkShiftsController` has been renamed to `ShiftAssignmentController` to
align with the service, entity, and model names. The route prefix changes accordingly.

### All affected routes

| Old | New |
|-----|-----|
| `POST /api/UserWorkShifts/GetWithPaging` | `POST /api/shift-assignments/GetWithPaging` |
| `POST /api/UserWorkShifts/ExportPdf` | `POST /api/shift-assignments/ExportPdf` |
| `POST /api/UserWorkShifts/AssignUserShift` | `POST /api/shift-assignments/AssignUserShift` |
| `PUT /api/UserWorkShifts` | `PUT /api/shift-assignments` |
| `DELETE /api/UserWorkShifts/{id}` *(after Change 1)* | `DELETE /api/shift-assignments/{id}` |

### What to update in frontend code

Replace the base URL constant for this controller:

```ts
// Before
const BASE = '/api/UserWorkShifts';

// After
const BASE = '/api/shift-assignments';
```

If hardcoded at each call site, search for `/api/UserWorkShifts` and replace all
occurrences with `/api/shift-assignments`.

---

## Change 4 — 🟡 Set Default Shift: Route Rename + Response Enrichment

### What changed

1. **Route renamed** — `AddShiftLog/{shiftId}` → `{shiftId}/default`
   (old route kept as a deprecated alias for one release cycle)
2. **Response enriched** — returns the updated `ShiftModel` instead of a plain string

### Before

```
POST /api/shifts/AddShiftLog/{shiftId}
Content-Type: application/json

{ "isActive": true, "shiftLogStartDate": "2026-06-01" }
```

Response:

```json
{ "success": true, "data": "Shift activated successfully!" }
```

### After

```
POST /api/shifts/{shiftId}/default
Content-Type: application/json

{ "isActive": true, "shiftLogStartDate": "2026-06-01" }
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "nameAr": "وردية صباحية",
    "nameEn": "Morning Shift",
    "timeFrom": "07:00:00",
    "timeTo": "15:00:00",
    "attendanceBuffer": 10,
    "leaveBuffer": 10,
    "isDefaultShift": true,
    "isActive": true,
    "shiftLogStartDate": "2026-06-01",
    "shiftLogId": 12,
    "activeShiftStartDate": "2026-06-01",
    "isAvailableDefaultShift": false,
    "defaultShiftId": null
  }
}
```

### What to update in frontend code

```ts
// Before — required a re-fetch after activating
await http.post(`/api/shifts/AddShiftLog/${id}`, body);
await fetchShifts();   // extra round trip

// After — use the returned model directly
const updated = await http.post(`/api/shifts/${id}/default`, body);
updateShiftInList(updated.data);   // no extra round trip needed
```

> **Transition period**: the old `/api/shifts/AddShiftLog/{shiftId}` route continues to
> work while the deprecated alias is live. Migrate before the next back-end release.

---

## Change 5 — 🟡 PopulateAllShiftDays: Confirm Parameter Required

### What changed
This one-time admin endpoint requires `?confirm=CONFIRM` to prevent accidental
re-runs. It will be **removed** entirely after the migration is confirmed.

### Before

```
POST /api/shifts/PopulateAllShiftDays
```

### After

```
POST /api/shifts/PopulateAllShiftDays?confirm=CONFIRM
```

```ts
// After
http.post('/api/shifts/PopulateAllShiftDays?confirm=CONFIRM')
```

> Once the migration is confirmed, disable or hide this button in the admin UI.

---

## Change 6 — 🟡 Error Response Shape — Assignment Endpoints Unified

### What changed
`POST AssignUserShift` and `PUT` (update assignment) previously returned a plain string
body on some 400 responses:

```
HTTP 400 Bad Request
"Invalid shift assignment data."
```

All 400 responses now use the standard `ApiResponse` shape:

```json
{ "success": false, "message": "Data is not complete.", "data": null }
```

### What to update in frontend code

```ts
// Before — raw string on 400
if (error.status === 400) {
  showError(error.error);            // was a plain string
}

// After — always ApiResponse
if (error.status === 400) {
  showError(error.error.message);    // unified shape
}
```

---

## New Endpoint 7 — 🟢 Get Single Assignment (with Rotation Groups)

```
GET /api/shift-assignments/{id}
Authorization: DepartmentManager | HROfficer | SecurityLeader
```

### Response — `ShiftAssignmentListModel`

```json
{
  "success": true,
  "data": {
    "id": 55,
    "shiftNameAr": "وردية صباحية",
    "shiftNameEn": "Morning Shift",
    "startDate": "2026-06-01",
    "endDate": "2026-12-31",
    "employeeWorkingDays": "0,1,2,3,4",
    "fkShiftId": 3,
    "assignedUserIds": [101, 102],
    "workShiftType": 1,
    "presenceInquiryTime": null,
    "presenceInquiryBuffer": null,
    "rotationGroups": null,
    "concurrencyUpdateVersion": 1
  }
}
```

For `workShiftType: 4` (Rotational), `rotationGroups` is populated:

```json
"rotationGroups": [
  { "id": 10, "groupName": "Group A", "fkShiftId": 3, "periodOrder": 0, "label": "A", "memberIds": [101] },
  { "id": 11, "groupName": "Group B", "fkShiftId": 4, "periodOrder": 1, "label": "B", "memberIds": [102] }
]
```

### Usage

Use this for edit-form pre-population instead of scanning the full paginated list:

```ts
// Before — searched the full list
const list = await getAssignmentsList(filter);
const item = list.find(x => x.id === editId);

// After — single targeted request
const item = await http.get(`/api/shift-assignments/${editId}`);
```

---

## New Endpoint 8 — 🟢 Default Shift History (HR Timeline View)

```
GET /api/shifts/default-history
Authorization: HROfficer + RootDepartment
```

### Response — `DefaultShiftHistoryModel[]`

```json
{
  "success": true,
  "data": [
    { "id": 1, "fkShiftId": 2, "effectiveDateFrom": "2024-01-01", "effectiveDateTo": "2025-05-31", "isActive": null },
    { "id": 2, "fkShiftId": 3, "effectiveDateFrom": "2025-06-01", "effectiveDateTo": null, "isActive": true },
    { "id": 3, "fkShiftId": 5, "effectiveDateFrom": "2026-07-01", "effectiveDateTo": null, "isActive": false }
  ]
}
```

### `isActive` values

| Value | Meaning |
|-------|---------|
| `true` | Currently active default shift |
| `false` | Scheduled (future activation) |
| `null` | Historical (already replaced) |

---

## New Endpoint 9 — 🟢 Employee Shift Days (Calendar / Schedule View)

```
GET /api/shifts/my-shift-days?from=2026-06-01&to=2026-06-30
Authorization: Employee
```

### Response

```json
{
  "success": true,
  "data": [
    { "businessDate": "2026-06-01", "fkShiftId": 3, "isRestDay": false, "isWeekend": false, "resolvedPeriodOrder": 0 },
    { "businessDate": "2026-06-07", "fkShiftId": null, "isRestDay": true, "isWeekend": false, "resolvedPeriodOrder": null }
  ]
}
```

```ts
const days = await http.get('/api/shifts/my-shift-days', {
  params: { from: '2026-06-01', to: '2026-06-30' }
});
```

---

## Full Migration Checklist

### Breaking — coordinate with the backend deploy

- [ ] **Change 1** — Delete assignment: change verb to `DELETE`, update URL to
  `/api/shift-assignments/{id}`, remove the `DeleteUserShiftAssignment` path segment
- [ ] **Change 2** — `AssignUserShift` response: remove `[0]` — use `response.data`
  directly instead of `response.data[0]`
- [ ] **Change 3** — Base URL rename: replace every `/api/UserWorkShifts` occurrence
  with `/api/shift-assignments`

### Important — same sprint as the backend change

- [ ] **Change 4** — `AddShiftLog` route: migrate to `/api/shifts/{shiftId}/default`;
  drop the extra re-fetch by consuming the returned `ShiftModel`
- [ ] **Change 5** — `PopulateAllShiftDays`: add `?confirm=CONFIRM`; disable the UI
  button once the one-time migration is confirmed
- [ ] **Change 6** — 400 error handler: read `error.error.message` (not `error.error`)
  on assignment endpoints

### Enhancements — schedule when the UI needs them

- [ ] **Endpoint 7** — Use `GET /api/shift-assignments/{id}` for edit pre-population
- [ ] **Endpoint 8** — Wire `GET /api/shifts/default-history` to the HR timeline UI
- [ ] **Endpoint 9** — Wire `GET /api/shifts/my-shift-days` to the employee calendar
