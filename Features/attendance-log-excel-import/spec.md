# Feature: attendance-log-excel-import — Import fingerprints (swipes) from Excel

## Status and ownership

- **Status:** accepted.
- **Owner:** the user; coordinating agent: Claude Code.
- **Backend repository/revision:**
  - `mujdn-backend`, branch `dev`, base `244f8d11`, plus uncommitted changes.
  - The contract is `mujdn-backend/Features/attendance-log-excel-import/handoff.md`.
  - The authoritative behaviour and acceptance criteria are in `mujdn-backend/Features/attendance-log-excel-import/spec.md`.
- **Frontend repository/revision:** `mujdn-frontend`, branch `dev`, base `467129fe`, plus uncommitted changes.
- **Accepted baseline:** plan approved by the user on 2026-11-01. ADMIN only, partial import, matched by National ID.

## Goal and user journey

An ADMIN opens **Attendance Logs → Staff Attendance Log** and clicks **Import Fingerprints (Excel)**. They:
1. download the template (one file for both languages, in the same style as the employees template);
2. fill in National ID, Date and Time per row;
3. upload the file.

They then see how many rows were imported, skipped (already existed) or rejected, with each problem row and its reasons. They can download a review file, correct it and upload it again.

## Scope and exclusions

- **In scope:**
  - The new popup.
  - Template and review-file downloads.
  - The new list button, with the existing XML import button relabelled **Import Device File (XML)**.
  - i18n for every backend import key.
- **Out of scope:** client-side row validation (the server is authoritative), and any change to the XML import popup.

## Acceptance criteria (frontend)

| ID | Given / When / Then | Verification |
|---|---|---|
| FE-01 | Given an ADMIN on the Staff tab, the **Import Fingerprints (Excel)** and **Import Device File (XML)** buttons are visible. Non-admins don't see them. | Code (`@if (authService.isAdmin)`); browser check |
| FE-02 | Clicking **Download Template** downloads the static `assets/import-templates/import-fingerprints-template.xlsx`. Required headers `NationalId`, `Date (yyyy-mm-dd)` and `Time (HH:mm, 24-hour)` are on green, and the optional `EmployeeName` is on gray. The popup also shows the date and time formats with examples. | Component spec checks the shipped file's headers |
| FE-03 | Choosing a non-`.xlsx` file, a sheet missing a required template header (named in the error, as in the employees import), a file over 5 MB, or a sheet with no data rows shows a localized error and keeps Import disabled. | Component specs |
| FE-04 | Import posts the file with `language` set to the current UI language. While waiting, Import and Close are disabled and repeat clicks are ignored. | Component spec |
| FE-05 | If every row is imported, the popup shows `COMMON.DATA_HAS_BEEN_IMPORTED_SUCCESSFULLY` (the same message as the employees import), closes with OK and the list reloads. | Component spec |
| FE-06 | If any row is rejected or skipped, the popup stays open with the employees-style warning box and its review-file link, followed by the counts, the row table (row number, National ID, status, translated reasons) and a truncation note when `rowErrorsTruncated`. Closing reloads the list if anything was imported. | Component spec; browser check |
| FE-07 | File-level errors (400 `IMPORT_*`) show the translated `COMMON.<key>` with its parameters via the global error interceptor. | Interceptor code; browser check |
| FE-08 | Every new text is in `en.json` and `ar.json`, and the popup renders correctly in RTL. | Code review; browser check in Arabic |

## Frontend behavior

- **Files:**
  - `src/views/features/attendance-log/attendance-log-excel-import-popup/` (component, template, styles, spec)
  - `src/services/shared/import.service.ts` (`importAttendanceLogsExcel`)
  - `public/assets/import-templates/import-fingerprints-template.xlsx` (static template, generated once with ClosedXML)
  - `src/models/shared/attendance-log-import-result.ts`
  - `others-attendance-log-list.component.{ts,html}` (`openExcelImportDialog`)
- **Patterns reused:**
  - the employee import modal's layout;
  - `ExcelHelper.validateHasDataRows` and `ExcelHelper.downloadExcelFromBase64`;
  - `downloadBlobData`;
  - `buildTranslationParams`;
  - `AlertService`.
- **Dialog:** the popup sets `disableClose` and routes backdrop clicks and Escape through `onClose()`, so the list reloads after a partial import and the popup can't be closed mid-upload.
- **Accessibility:**
  - The close button has a localized `aria-label`.
  - The file input is described by the size hint.
  - Busy buttons expose `aria-busy`.
  - The result region is `aria-live="polite"`.
  - Table headers use `scope="col"`.
  - National IDs render LTR inside RTL layouts.

## Decisions and open questions

| Item | Resolution |
|---|---|
| Template source | Static asset, one file for both languages, styled like `import-employees-template.xlsx` (user, 2026-11-01). The frontend spec checks its headers |
| Client header check | Not done; the backend accepts English or Arabic headers in any order and reports `IMPORT_MISSING_COLUMNS` |
| Column names in `IMPORT_MISSING_COLUMNS` | Sent by the backend as English names; shown as-is in both languages |

## Completion and rollout

- **Checks run 2026-11-01:**
  - `npm run build`: passed.
  - `ng test --watch=false --browsers=ChromeHeadless --include=src/views/features/attendance-log/attendance-log-excel-import-popup`, with `CHROME_BIN` pointing at a local Chrome headless shell: **12 passed, 0 failed**.
  - The full `npm test` suite was not run.
- **Still required:** a browser flow against a real API on a dev database (FE-01, 02, 06, 07, 08), in English and in Arabic.
