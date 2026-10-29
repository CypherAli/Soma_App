# Soma Mobile architecture and verification

## Responsibilities

- `src/app`: Expo Router entry points and layouts. Routes delegate to screens; they do not contain API or 3D loading logic.
- `src/screens`: composition of a complete screen, routing decisions and its interaction state.
- `src/features/account`: authenticated account gate, overview hook, membership presentation, profile editor, security/session controls and provider connections. `AccountScreens.tsx` keeps stable exports for existing routes.
- `src/features/atlas`: viewer tools and shared viewer layout styles. `ViewerScreen` owns the selected model, lifecycle, bridge ref and sheets.
- `src/components`: platform viewer adapters and checked runtime protocol. Web accepts messages only from the expected iframe/origin; native adapts WebView messages. Both validate nested data before passing it to React.
- `src/core`: API transport, authentication/PKCE, account-scoped storage, practice rules and offline loading.
- `src/ui`: typography, palette, translations, reusable controls and the optional desktop phone frame.
- `viewer`: standalone Three.js runtime, geometry loading, resources, separation and local shared primitives. It does not require a neighboring frontend checkout.
- `assets/offline`: the public catalogue, scene configurations, deduplicated content-addressed geometry, artwork, decoder and generated runtime. Treat `.soma` bytes as binary in Git. Retain dataset/font licenses.
- `scripts/lib`: shared desktop URLs/process helpers, static preview server, offline integrity and deterministic viewer build. Entry scripts orchestrate these pieces.

Account credentials and OAuth verifier/state stay in the browser tab's sessionStorage; account drafts/preferences have separate storage policies. Native credentials use SecureStore. Secrets belong to the backend/environment, not the app bundle. Provider clients still require their registered callback configuration.

## Commands from a clean checkout

Use Node 24 and `npm ci`. The install applies the existing narrowly scoped dependency guards.

```text
npm run check
npm run verify:offline
npm run viewer:check
npm run export:android
npm run export:web
```

`check` includes formatting, lint, both TypeScript targets, logic/transport/protocol/preview tests and dependency guard regressions. GitHub Actions runs these gates plus offline integrity and both platform exports. `npm audit` findings are tracked separately in the dated audit; a passing guard test does not mean all advisories are resolved.

After changing runtime source, run `npm run viewer:build`; commit the regenerated runtime with the source. `viewer:check` fails if the bundled runtime/template is stale. Updating model data from the web/backend is an explicit maintenance operation (`prepare:backend`, `prepare:offline`) and requires those source repositories; ordinary checks and app exports do not.

## Desktop and integration QA

```text
npm run desktop:build
npm run desktop:preview
npm run qa:desktop
npm run qa:offline
```

The demo reuses/starts the local API and mobile gateway, serves packaged Expo web on loopback and opens a phone frame. It uses no Android Emulator. The preview rechecks API readiness even when the static server was already running; its health metadata reflects the currently built files.

`qa:desktop` checks layout, Atlas actions, registration, account/security, framed provider callbacks, quiz retry/history, source exams and chatbot. It needs the local backend built, its database and OAuth configuration. QA accounts use randomized `example.invalid` identities and are removed in `finally`; it never authenticates a human's provider account. Provider identities in OAuth automation are fixtures while PKCE/API/database interactions are real.

Playwright is a dev dependency. On another machine install a QA browser with `npx playwright install chromium`, or set `CHROME_PATH`; installed Chrome is used on Windows when present. Reports/screenshots go in ignored `qa/` directories. For the full offline rendering sweep set `SOMA_QA_ALL_MODELS=1` in the shell before `npm run qa:offline`. The runner recycles its isolated software WebGL browser in small batches to bound memory usage.

The mobile assistant also requires the web assistant service (port 3000 by default, configured by `MOBILE_WEB_URL` on the backend). The gateway assistant deadline is 60s, between the backend's 55s upstream deadline and the app's 65s wait. Ordinary gateway requests retain their 45s limit. Gateway connection failures return actionable JSON instead of an empty 502 body. Keep these budgets aligned when changing the services.

Metro excludes the project-relative `qa/` and `builds/` directories, including temporary isolated installations, while preserving source and bundled assets. Reports are not application inputs. Avoid installing another project inside the application tree during a build.

## Change discipline

Keep user-visible behavior changes separate from mechanical formatting and extraction in commit descriptions. Add regression coverage for state, ownership, transport and protocol changes. Validate VI/EN, light/dark and 320–414 px when altering dense mobile controls. A packaged web build, a native export, a real provider consent and a real-device APK check are distinct evidence; report them accurately.
