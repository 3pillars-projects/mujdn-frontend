# Mujdn Frontend

Angular frontend for MJD Attendance. The application uses standalone Angular components, PrimeNG/Angular Material, Tailwind/SCSS, ngx-translate, RxJS, and handwritten HTTP services.

## Getting started

CI uses Node 20. The repository uses npm and a versioned `package-lock.json`; an exact npm version is not pinned.

```bash
npm install
npm start
```

The development server is available at `http://localhost:4200/` by default. API URLs are loaded at runtime from the deployed environment resource. Select a known local/test backend configuration before exercising API flows; do not run against an unspecified environment.

## Repository commands

```bash
npm run build
npm run watch
npm test
npm run format
```

The repository currently has no lint script and no browser/e2e test command. `npm run format` formats supported files under `src/`, not Markdown.

## Documentation

- [Repository rules](AGENTS.md): concise rules for coding agents and contributors.
- [Angular development](Angular-Development.md): verified architecture, implementation patterns, tool versions, gaps, and source examples.
- [Agent workflow](Agent-Workflow.md): specification, planning, contract, implementation, review, and handoff procedure.
- [Illustrative feature walkthrough](MJD-Feature-Usage-Guide.md): employee overtime submission example; no overtime endpoint or rule in that guide is claimed to exist.
- [Feature templates](Feature-Templates/README.md): reusable specification, planning, progress, findings, and handoff artifacts.
- [Existing integration notes](docs/): feature-specific prose references; verify each against the accepted backend revision and contract before implementation.

## Repository-local feature skill

The `mjd-feature` skill routes substantial feature work to the shared guides and only the relevant templates. Start a fresh agent session after adding or changing a skill, then invoke it in the agent chat (these are not shell commands):

```text
Codex: $mjd-feature plan <feature>
Claude Code: /mjd-feature plan <feature>
```

Supported modes are `plan`, `implement`, `resume`, `review`, and `handoff`. See [skill usage and modes](Agent-Workflow.md#skill-usage-and-modes).
