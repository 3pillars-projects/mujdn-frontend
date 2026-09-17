# Angular development

This guide records the frontend architecture verified on 2026-09-10. Source and repository configuration remain authoritative. In this guide:

- **Required** means new or changed work must follow the rule.
- **Common** describes an established implementation to reuse when it fits, not a mandate to force every feature into that shape.
- **Absent** identifies infrastructure that is not currently available and must not be claimed or guessed.

For feature planning and backend coordination, use [Agent-Workflow.md](Agent-Workflow.md).

## Toolchain and commands

Versions come from [package.json](package.json), [package-lock.json](package-lock.json), [angular.json](angular.json), and the [testing deployment workflow](.github/workflows/deploy-testing.yml).

| Capability | Repository evidence | Installed/selected version | Command or status |
|---|---|---|---|
| Node | CI `actions/setup-node` | 20 in CI; no root engine/version file | Use a compatible Node 20 environment for CI parity |
| Package manager | npm lockfile v3 | npm version not pinned | `npm install` (the command used by CI) |
| Angular | lockfile | core/forms/router 19.2.14; CLI/build 19.2.11 | `npm start`, `npm run build`, `npm run watch` |
| TypeScript | lockfile | 5.7.3 | Compiled by Angular commands |
| RxJS | lockfile | 7.8.2 | No separate command |
| Unit tests | Angular Karma target and lockfile | Jasmine 5.6.0, Karma 6.4.4, Chrome launcher 3.2.0 | `npm test` |
| Formatting | `.prettierrc`, script, lockfile | Prettier 3.5.3 | `npm run format` (only `src/**/*.{ts,js,json,css,scss,html}`) |
| Lint | No script or configuration found | **Absent** | No lint command |
| Browser/e2e tests | No Playwright/Cypress/WebDriver/Protractor config or script found | **Absent** | No browser-test command |
| API generation | No generator/config/output boundary found | **Absent** | No OpenAPI/client-generation command |

**Required:** run only commands present in repository configuration and report what was not run. `npm test` is the configured unit-test command; do not turn an unverified flag combination into project policy. CI currently installs, builds, and deploys but does not run formatting, lint, unit tests, or browser tests.

The compiler settings in [tsconfig.json](tsconfig.json) are strict, target ES2022, enable strict Angular templates/injection/input access, and define `@/...` aliases. Formatting uses two spaces, single quotes, semicolons, ES5 trailing commas, and a 100-character print width. Preserve these settings; dependency or tool upgrades are separate work.

## Application structure

The project bootstraps with `bootstrapApplication` in [main.ts](src/main.ts) and providers from [app.config.ts](src/app-configs/app.config.ts). There are no `@NgModule` declarations in `src/`; components are standalone, with Angular 19's standalone default often leaving `standalone: true` implicit.

| Area | Purpose | Representative source |
|---|---|---|
| `src/views/` | Routed pages, layouts, auth screens, popups, shared UI | [City list](src/views/features/lookups/city/city-list/city-list.component.ts), [attachment upload](src/views/shared/attachment-upload/attachment-upload.component.ts) |
| `src/routes/` | Functional lazy route table | [app.routes.ts](src/routes/app.routes.ts) |
| `src/models/` | Handwritten API/domain models, filters, response wrappers | [City](src/models/features/lookups/city/city.ts), [response models](src/models/shared/response) |
| `src/services/` | Handwritten HTTP and shared-state services | [CityService](src/services/features/lookups/city.service.ts), [AuthService](src/services/auth/auth.service.ts) |
| `src/model-interceptors/` | `cast-response` send/receive transformations | [CityInterceptor](src/model-interceptors/features/lookups/city.interceptor.ts) |
| `src/resolvers/` | Route data loading | [cityResolver](src/resolvers/lookups/city.resolver.ts) |
| `src/abstracts/` | Reusable CRUD/list/popup behavior | [BaseCrudService](src/abstracts/base-crud-service.ts), [BaseListComponent](src/abstracts/base-components/base-list/base-list.component.ts) |
| `src/http-interceptors/` | Global loading, session, and error behavior | [interceptors](src/http-interceptors) |
| `public/assets/i18n/` | English and Arabic message catalogs | [English](public/assets/i18n/en.json), [Arabic](public/assets/i18n/ar.json) |

**Required:** place code beside the established layer and nearest comparable feature. Preserve casing of existing contract paths and symbols even when it is inconsistent. Do not create a new folder architecture merely to make a small feature look uniform.

## Routing and components

The [route table](src/routes/app.routes.ts) uses lazy `loadComponent`, nested auth/attendance/visits layouts, functional resolvers, `authGuard`, `data.roles`, `routeId`, and a feature-specific `actualDepartmentManagerOnly` flag. It also preserves legacy redirects and explicit `/403` and `/404` handlers.

**Required:**

- Add routes only when the accepted feature requires navigation. Preserve the exact resolver data keys consumed by the component.
- Apply guards and role/data metadata based on the accepted access rules and adjacent verified routes. Some existing child routes lack explicit guards or roles, so never infer protection from the parent without tracing it.
- Use lazy standalone components. When a module import appears in a component's `imports`, it is a standalone dependency, not evidence of an application NgModule architecture.
- Treat resolver failure deliberately. For example, [cityResolver](src/resolvers/lookups/city.resolver.ts) catches failures and returns `null`, while the base list falls back to an empty list; new work must not accidentally present an API failure as a valid empty result.

### Common CRUD slice

City is the smallest complete routed CRUD reference:

- [route](src/routes/app.routes.ts) and [resolver](src/resolvers/lookups/city.resolver.ts);
- [list component](src/views/features/lookups/city/city-list/city-list.component.ts) and [template](src/views/features/lookups/city/city-list/city-list.component.html);
- [popup component](src/views/features/lookups/city/city-popup/city-popup.component.ts) and [template](src/views/features/lookups/city/city-popup/city-popup.component.html);
- [model](src/models/features/lookups/city/city.ts), [filter](src/models/features/lookups/city/city-filter.ts), [interceptor](src/model-interceptors/features/lookups/city.interceptor.ts), and [service](src/services/features/lookups/city.service.ts).

The list extends [BaseListComponent](src/abstracts/base-components/base-list/base-list.component.ts), and the popup extends [BasePopupComponent](src/abstracts/base-components/base-popup/base-popup.component.ts). This supplies pagination, search/reset, dialogs, delete confirmation, export, form-save hooks, and model create/update selection.

**Common, not universal:** use these bases when their operations, URL conventions, response envelope, and dialog lifecycle match the contract. Authentication, imports, attachments, reports, multi-step workflows, and specialized actions have dedicated patterns. Audit inherited operations rather than adding fake hooks to force a fit.

## Forms and validation

Editable popups commonly use reactive forms. Models such as [City](src/models/features/lookups/city/city.ts) expose `buildForm()` with Angular and [custom validators](src/validators/custom-validators.ts); components build the group and expose controls to [ValidationMessagesComponent](src/views/shared/validation-messages/validation-messages.component.ts). List filters commonly use `FormsModule` and `[(ngModel)]`.

[RequiredMarkerDirective](src/directives/required-marker.directive.ts) derives the visual required marker from a control validator and its associated label. [NotificationSettingsComponent](src/views/features/settings/notification-settings/notification-settings.component.ts) is a representative page-level reactive form with cross-field validation, load/save flags, disabled state, a concurrency-token check, and reset behavior. [AttachmentUploadComponent](src/views/shared/attachment-upload/attachment-upload.component.ts) is a custom `ControlValueAccessor`/validator with signals and upload lifecycle rules.

**Required:**

- Implement the accepted client validation without weakening or replacing server validation. Use exact contract limits, nullability, date/time semantics, and error keys.
- Mark controls touched on an invalid submission and keep labels, IDs, validation messages, and required markers aligned.
- Preserve form values on server validation or recoverable failure unless the specification explicitly says otherwise.
- Map server field/general errors according to the contracted error envelope. The global interceptor intentionally rethrows validation errors for local handling.
- Prevent submission while related asynchronous validation/upload is pending. Re-enable controls after failures with `finalize` or an equivalent proven lifecycle.
- Do not mix `ngModel` into a reactive form control unless the existing component intentionally marks it standalone and the behavior is understood.

## State, RxJS, and cleanup

No application store package is installed. The common state model is component fields plus RxJS services:

- [AuthService](src/services/auth/auth.service.ts) and [LanguageService](src/services/shared/language.service.ts) expose `BehaviorSubject` state.
- [SpinnerService](src/services/shared/spinner.service.ts) reference-counts concurrent loading requests.
- [BaseListComponent](src/abstracts/base-components/base-list/base-list.component.ts) and multiple layout/feature components use `Subject` plus `takeUntil`.
- [SideMenuComponent](src/views/layout/main/side-menu/side-menu.component.ts) and [SpinnerComponent](src/views/shared/spinner/spinner.component.ts) aggregate/unsubscribe `Subscription` instances.
- Signals are used for focused local state in the [attachment components](src/views/shared/attachment-upload/attachment-upload.component.ts); an application-wide signals architecture is not established.

**Required:** prefer the simplest adjacent pattern. Long-lived router, form, language, DOM-event, or subject streams need deterministic cleanup. Finite `HttpClient` calls may rely on completion, but mutation/busy cleanup still belongs in `finalize`. Do not introduce a state library or convert an unrelated feature to signals as incidental work.

## API services and models

[ConfigService](src/services/config.service.ts) loads the runtime resource, and [UrlService](src/services/url.service.ts) combines the selected base URL/API version with handwritten [endpoint constants](src/constants/endpoints.ts). [BaseCrudService](src/abstracts/base-crud-service.ts) implements the established generic CRUD/paging/export envelope. Feature services add specialized requests and `cast-response` decorators; model interceptors remove local-only fields or hydrate class instances.

**Required:**

- Start with an accepted spec, backend handoff, and implemented versioned contract tied to an exact backend revision. Verify method/path, request and response wrappers, status/error shapes, auth/ownership, null/omitted behavior, enums, dates/time zones, pagination, concurrency, and file semantics.
- Keep API calls in services and use `UrlService`; never hard-code a deployment base URL in a component.
- Preserve `withCredentials: true` where the API/session pattern requires it. The inspected client does not construct Bearer tokens.
- Use the existing response model/interceptor pattern only after confirming the operation's real envelope. `@CastResponse` does not correct an inaccurate TypeScript type.
- Echo opaque concurrency tokens unchanged. Do not derive or reformat server-owned values.
- Never add an endpoint constant, DTO field, enum member, or package API solely because prose or another feature suggests it.

### Contract and generated-code status

**Absent:** this repository has no checked-in OpenAPI artifact workflow, client generator, generated output directory, generation script, or CI drift check. Existing Markdown in [docs](docs) contains useful integration notes, but each document must be matched to its backend revision before use. Handwritten endpoints/models/services reflect current frontend code, not an independent contract authority.

If generation is accepted later, define the schema source/revision, checksum, generator and version, configuration, deterministic command, output ownership, import policy, and drift check before generating. Generated output must be isolated from handwritten code and never edited manually. Until then, implement narrowly against the supplied versioned contract and record any manual mapping.

## Authentication, authorization, loading, and errors

[authGuard](src/guards/auth-guard.ts) verifies the user-data cookie, refreshes the session, checks roles/data scope, and returns login or `/403` URL trees. [AuthInterceptor](src/http-interceptors/auth.interceptor.ts) synchronizes cookie-backed user state for application API responses. [httpErrorInterceptor](src/http-interceptors/http-error-interceptor.ts) interprets the backend `error.messageKey`, redirects certain denied responses, shows translated global errors, and supports `SKIP_ERROR_ALERT` for complete local handling.

[loadingInterceptor](src/http-interceptors/loading.interceptor.ts) drives the global spinner and supports `SKIP_LOADING`. The [attachment list](src/views/shared/attachment-list/attachment-list.component.ts) shows the local alternative: a guarded operation, disabled control, `aria-busy`, `finalize`, empty-blob check, and local failure message.

**Required:**

- UI role checks hide or disable unavailable actions, but server authorization remains authoritative. Never filter leaked data client-side as a security control.
- Treat 401 (session/authentication) separately from 403 (authenticated but denied) according to the accepted contract and established redirect/message behavior.
- Use interceptor skip tokens only when the call site supplies an accessible loading indicator and complete error handling. Do not silently swallow unexpected errors.
- Do not display success or navigate away before the contracted mutation response. Guard duplicate actions; [BasePopupComponent](src/abstracts/base-components/base-popup/base-popup.component.ts) uses `exhaustMap`, but most popup templates do not expose a visible pending state, so feature work must add/verify the required UI behavior.

## Required user-visible states

Every new or materially changed data flow must define and verify these states in its acceptance criteria:

| State | Required behavior |
|---|---|
| Initial/loading | Preserve layout, expose global or local progress, prevent conflicting actions, and avoid flashing an empty result before the request settles. |
| Empty | Show a localized, valid no-results state only after a successful empty response; keep relevant search/reset/create actions available. |
| Validation | Mark relevant controls, show localized field/general messages, preserve values, and focus/announce the problem appropriately. |
| Denied | Do not render protected data; use the established localized denied message/route and retain safe navigation. |
| Failure | Keep recoverable context, show a useful localized error, restore controls, and distinguish failure from empty. |
| Retry | Retry only recoverable reads or explicitly safe/idempotent actions; mutation retry must not duplicate submission. Prevent parallel retries. |
| Success | Reflect the accepted response once, show translated feedback, and refresh/navigate only as specified. |

The City list has a localized empty block, but its resolver/base error path can also produce an empty list. That is a known existing limitation, not the model for new error handling. The catalogs contain `COMMON.RETRY`, but no shared retry component or consistent list-retry flow exists.

## Localization and direction

ngx-translate loads [English](public/assets/i18n/en.json) and [Arabic](public/assets/i18n/ar.json) JSON through [translate-loader.ts](src/app-configs/translate-loader.ts). [LanguageService](src/services/shared/language.service.ts) persists selection and emits changes. [BaseAppComponent](src/views/app/base-app/base-app.component.ts) and popup bases provide LTR/RTL direction; [rtl.scss](src/rtl.scss) applies targeted PrimeNG fixes.

**Required:**

- Add the same semantic key to both catalogs and use the translate pipe/service for every visible string, validation/error message, title, and accessible name.
- Prefer CSS logical directions and established `ms`/`me`/`start`/`end` utilities. Check overlays, icons that imply direction, tables, date/time inputs, and focus order in both English/LTR and Arabic/RTL.
- Recompute cached translated menu/breadcrumb labels on language changes and clean up those subscriptions.
- Do not use hard-coded Arabic or English `alt`, labels, or placeholder text in new work.

## Styling and component library

The workspace config loads shared DGA styles, [styles.scss](src/styles.scss), and [rtl.scss](src/rtl.scss). [app.config.ts](src/app-configs/app.config.ts) configures PrimeNG 19 with Aura and Angular Material dialogs. Tailwind 4 is connected through [.postcssrc.json](.postcssrc.json); components combine utility classes with local SCSS and global PrimeNG overrides.

**Required:** reuse existing components, tokens, button/table/form classes, breakpoints, and dialog sizing. Check the nearest feature and shared component before adding global CSS. Avoid unrelated style cleanup and avoid a new component framework without an accepted architecture change.

## Accessibility

Current practice includes label/control associations in City and other forms, semantic buttons, and stronger busy/name handling in [attachment upload](src/views/shared/attachment-upload/attachment-upload.component.html) and [attachment list](src/views/shared/attachment-list/attachment-list.component.html). Coverage is inconsistent: some icon-only buttons use empty or language-specific `alt`, and no automated accessibility package or CI check exists.

**Required:**

- Give every control a programmatic label and every icon-only action a localized accessible name; decorative icons use empty `alt` or `aria-hidden`.
- Use real buttons/inputs and preserve keyboard activation, visible focus, disabled semantics, logical focus order, and dialog focus restoration.
- Expose busy state (`disabled`, `aria-busy`, or an appropriate live status), associate validation help with its control where needed, and avoid color-only meaning.
- Include keyboard and basic screen-reader semantics in component/manual browser evidence. Do not claim automated accessibility coverage.

## Testing and acceptance evidence

The Angular workspace has a Karma builder and Jasmine types. The four current specs—[version](src/components/version/version.component.spec.ts), [department tree](src/views/features/department/department-tree/department-tree.component.spec.ts), [department popup](src/views/features/department/department-popup/department-popup.component.spec.ts), and [device configuration modal](src/views/features/settings/devices-configuration-modal/devices-configuration-modal.component.spec.ts)—only assert component creation.

**Required:** add focused tests for changed behavior where the infrastructure supports them: validation boundaries, request mapping, pending/duplicate actions, success, empty, failure/retry, and denied handling. Record the discovered test count and actual outcome. A build or creation smoke test does not verify a user journey.

Browser verification has no repository runner. For an important integrated journey, record a deliberate manual browser scenario or establish browser infrastructure only through separately accepted work. Never start the application against an unspecified backend; record frontend/backend revisions, contract revision/checksum, environment, role/test data, result, and gaps. Mocks may verify component behavior but do not prove real API compatibility.
