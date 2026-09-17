# Repository instructions

## Scope and sources

This repository is the Angular frontend for MJD Attendance. Verify behavior in current source and repository configuration; the backend is a separate contract authority.

- Follow the accepted specification and acceptance criteria. If code, guidance, and contract disagree, record the conflict; do not rewrite criteria to match the implementation.
- Preserve unrelated worktree changes. Do not reformat or refactor unrelated files, select an environment, or run against an unspecified backend.
- Verify unfamiliar symbols, package APIs, paths, and commands before using them. Never invent endpoints, fields, response shapes, package APIs, or scripts.
- Read [Angular development](Angular-Development.md) for implementation detail and [Agent workflow](Agent-Workflow.md) for substantial feature work. The [worked example](MJD-Feature-Usage-Guide.md) is illustrative, not an implemented feature.

## Repository map

- [routes](src/routes/app.routes.ts): lazy standalone routes, resolvers, guard, role and route metadata.
- [views](src/views): routed, layout, auth, and shared standalone components.
- [models](src/models), [services](src/services), [model interceptors](src/model-interceptors), and [resolvers](src/resolvers): handwritten API/model layers.
- [base CRUD abstractions](src/abstracts): reuse when their exposed behavior fits; specialized flows may use adjacent feature patterns instead.
- [application providers](src/app-configs/app.config.ts), [HTTP interceptors](src/http-interceptors), and [auth guard](src/guards/auth-guard.ts): bootstrap, session, loading, error, and route access behavior.
- [translations](public/assets/i18n), [global styles](src/styles.scss), and [RTL overrides](src/rtl.scss): shared presentation.
- [feature templates](Feature-Templates/README.md): durable specs/handoffs go under `Features/<feature-id>/`; selected planning state stays under `.planning/<plan-id>/`.

## Toolchain and commands

The npm lockfile is authoritative for installed dependency versions. CI uses Node 20; no npm version or local Node engine is pinned. Run from the repository root:

```bash
npm install
npm start
npm run build
npm test
npm run format
```

`npm run format` only targets application files under `src/`. There is no repository lint script/configuration and no browser/e2e test command. Do not claim those checks ran or add substitute commands to documentation. See [toolchain and commands](Angular-Development.md#toolchain-and-commands).

## Frontend conventions

- The application is standalone (`bootstrapApplication`); lazy routes use `loadComponent`. Preserve route metadata, resolver keys, redirects, and guard behavior unless the accepted feature changes them.
- CRUD lists/popups commonly extend `BaseListComponent`/`BasePopupComponent`; models may extend `BaseCrudModel`, build reactive-form validators, and use `cast-response`. Inspect the nearest complete feature before choosing this pattern.
- Editable forms commonly use reactive forms; list filters commonly use `ngModel`. Use shared validators/validation messages where their contract fits, mark invalid forms touched, and preserve entered values after server validation failures.
- State is normally local component state and RxJS services. `BehaviorSubject`/`Subject` are established; signals exist for focused local UI state. No store library exists. Clean up long-lived streams with the adjacent `takeUntil` or aggregate `Subscription` pattern; HTTP streams may rely on completion.
- Use the existing PrimeNG 19/Aura, Angular Material dialog/CDK, Tailwind utility, SCSS, and shared DGA styling stack. Do not introduce another UI or state framework without accepted scope.
- Put all user-visible text and accessible names in both `public/assets/i18n/en.json` and `ar.json`. Verify English/LTR and Arabic/RTL; use logical-direction utilities/properties and the existing `[dir]` flow.
- Pair labels with control IDs, use semantic buttons/controls, give icon-only actions localized accessible names, expose busy/disabled state, preserve keyboard/focus behavior, and announce meaningful validation/status changes. Existing accessibility coverage is inconsistent, so copy the stronger shared attachment examples rather than assuming every adjacent template is sufficient.

## API, authentication, and UX rules

- Handwritten services use `HttpClient`, `UrlService`, response-wrapper models, and `cast-response`. Runtime base URLs come from the deployed environment resource. Add endpoints only from an accepted, implemented contract.
- For feature work, the accepted spec plus a versioned backend handoff and implemented OpenAPI artifact tied to an exact backend revision are the contract source. This repository currently has no OpenAPI generator, checked-in schema workflow, generated client, or drift check. Treat `src/constants/endpoints.ts`, handwritten types, and prose under `docs/` as implementation/reference material, not a substitute for a versioned contract.
- Generated code, if introduced by separately accepted work, must have a pinned generator/configuration, reproducible command, owned output directory, and drift verification. Never hand-edit generated output or let generation overwrite handwritten files.
- Preserve `withCredentials`, response envelopes, error keys, null/omitted semantics, enums, dates/time zones, pagination, file responses, and concurrency tokens exactly as contracted.
- The auth guard and client role checks improve navigation/visibility; they are not server authorization. Handle server 401/403 responses, show the established denied route/message, and do not expose unauthorized data while redirecting.
- Global interceptors own the shared spinner, session synchronization, and most error dialogs. Use per-request skip contexts only when the call site supplies complete loading/error behavior and rethrows or resolves the error intentionally.
- Every data flow must distinguish initial/loading, empty, validation, permission-denied, failure, and success states. Recoverable failures need an explicit retry that cannot duplicate a mutation. Disable or otherwise guard repeated submission, restore interaction after failure, and show success only after the contracted response.

## Verification and handoff

- Map each acceptance criterion to implementation and evidence. Prefer focused component tests for validation/interactions/states and a browser flow against the exact backend contract for important journeys.
- The current four Jasmine specs are creation smoke tests only. `npm run build` establishes compilation, and `npm test` runs configured Karma tests; neither proves feature behavior by itself. Browser checks require a deliberately selected backend/environment and are unavailable as a repository script.
- Record exact commands/scenarios, revision/environment, test counts, outcomes (`passed`, `failed`, or `not run`), and gaps. Contract-aligned mocks do not make integration complete.
- Review the accepted spec, backend handoff/contract revision, diff, and evidence before handoff. Run `git diff --check -- <changed-files>` for tracked edits and confirm new documentation/skills are visible to Git.
