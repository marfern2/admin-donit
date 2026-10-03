# AdminDonit

La configuración LOCAL/DEV/PROD y los comandos están documentados en [ENVIRONMENTS.md](ENVIRONMENTS.md). `npm start` carga la API local desde `public/config/runtime-config.json`; la misma imagen Docker sirve DEV y PROD mediante `DONIT_API_URL` inyectada al arrancar.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

For a local development build, run:

```bash
npm run build
```

For the environment-independent production image bundle, run `npm run build:image`. Both commands write artifacts to `dist/`. Angular framework and compiler packages are aligned at the compatible 21.2.25 patch level; this does not address the separate tooling advisories reported by `npm audit`.

Security gate: CI runs strict `npm audit --omit=dev --audit-level=high` and `node scripts/audit-dependencies.mjs`. The latter temporarily allows only [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) in Angular CLI DEV tooling because `http-cache-semantics` has no patched release. A published fix or compatible audit fix blocks the gate so the exception can be removed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
