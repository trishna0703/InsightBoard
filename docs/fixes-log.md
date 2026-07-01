# Fixes Log

A running note of issues found (and fixed) while building the test suite and
hardening the build. Newest section last. `npm test` and `npx tsc --noEmit`
both pass clean as of the latest entry.

---

## 1. Jest config — wrong setup key (silently ignored)

- **Where:** `package.json` → `jest.setupFilesAfterFramework`
- **Problem:** `setupFilesAfterFramework` is not a valid Jest option, so
  `@testing-library/jest-native/extend-expect` was never loaded and Jest printed
  a validation warning on every run.
- **Fix:** renamed to `setupFilesAfterEnv`.

## 2. Missing `test-renderer` peer dependency

- **Where:** dev dependencies
- **Problem:** `@testing-library/react-native@14` peers on a **new** renderer
  package `test-renderer@^1` (React 19's `createRoot`-based renderer). It wasn't
  installed, so any suite importing `renderHook`/`render` failed with
  `Cannot find module 'test-renderer'`. Note: `react-test-renderer@19` is *not*
  a drop-in — it exports `create`, not the `createRoot` RTL 14 calls.
- **Fix:** `npm i -D test-renderer` (now pinned in `devDependencies`).

## 3. No global test setup for native modules / env vars

- **Where:** new `jest.setup.js` (wired via `setupFilesAfterEnv`)
- **Problem:** importing anything through `src/services/supabase.ts` blew up in
  Jest because (a) `@react-native-async-storage/async-storage`'s native module
  is `null` under Jest, and (b) `createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, …)`
  throws "supabaseUrl is required" since Expo's `EXPO_PUBLIC_*` vars aren't
  injected in the Jest environment.
- **Fix:** `jest.setup.js` mocks AsyncStorage (official lib mock) and
  `react-native-toast-message`, and seeds harmless test values for the three
  `EXPO_PUBLIC_*` vars.

## 4. `transformIgnorePatterns` didn't cover `immer` / `use-immer`

- **Where:** `package.json` → `jest.transformIgnorePatterns`
- **Problem:** `immer` ships ESM (`export { … }`) that Jest doesn't transform by
  default, so `useBroadcast` (which uses `use-immer`) failed to load with
  `SyntaxError: Unexpected token 'export'`.
- **Fix:** added `|immer|use-immer` to the ignore-pattern allowlist.

## 5. `tsconfig` used a deprecated `baseUrl` + an unusable `ignoreDeprecations`

- **Where:** `tsconfig.json`
- **Problem:** `tsc` couldn't run at all — `ignoreDeprecations: "6.0"` is rejected
  by TS 5.9.3 (`TS5103: Invalid value`). It was there to silence the `baseUrl`
  deprecation, but TS 5.9.3 is caught in the middle: `"5.0"` is accepted but does
  **not** silence `baseUrl`, while the value that does (`"6.0"`) is rejected by
  the compiler.
- **Fix:** removed the deprecated `baseUrl` and the `@/*` `paths` alias entirely,
  and converted the only 5 `@/…` imports (in `BoardScreen.tsx` and
  `InsightCardList.tsx`) to relative imports — matching the rest of the codebase.
  `ignoreDeprecations` is no longer needed and was dropped. tsconfig is now just
  `extends` + `strict: true`.

## 6b. Editor didn't resolve Jest globals (`describe`/`it`/`expect`)

- **Where:** `tsconfig.json` → `compilerOptions.types`
- **Problem:** `tsc` on the CLI resolved the Jest globals fine (`@types/jest` is
  auto-discovered, and `npx tsc --noEmit` is clean), but the editor's TS server
  kept flagging `Cannot find name 'describe' / 'it' / 'expect'` in every test
  file — even after a window reload. Automatic `@types/*` inclusion wasn't being
  honored by the editor server.
- **Fix:** made the type packages explicit: `"types": ["jest", "node"]`
  (`node` kept because `process.env` is used across the hooks/services). Verified
  `tsc --noEmit` stays clean and all 116 tests still pass. These are Jest
  **globals** injected by the runtime, so they are intentionally *not* imported.
- **If it still shows after this:** the editor is likely using its bundled
  TypeScript, not the workspace one — run
  "TypeScript: Select TypeScript Version → Use Workspace Version".

## 6. Type error in the Apollo auth link

- **Where:** `src/services/apollo.ts` (`setContext` callback)
- **Problem:** the callback annotated `prevContext` as
  `{ headers: Record<string, string> }`, stricter than Apollo's `ContextSetter`
  (which passes a loose context bag where `headers` may be absent) →
  `TS2345`. This was a genuine pre-existing bug, unrelated to tests.
- **Fix:** accept the loose `prevContext` and derive
  `const headers = (prevContext.headers ?? {}) as Record<string, string>` —
  no `any` introduced, honoring the "zero `any`" NFR.

---

## Testability refactors (behavior-preserving)

Small, safe changes made so pure logic could be unit-tested directly instead of
through heavy mocks:

- `src/hooks/useReorderInsights.ts` — extracted and exported
  `computeReorderColumnOrder(movedId, newOrder)` (drag-to-reorder midpoint math).
- `src/hooks/useUpdateInsight.ts` — exported `findConflictingFields` (conflict
  field-by-field diff, Module 5.2).
- `src/hooks/useActivityFeed.ts` — exported `transformActivities` (activity feed
  shaping, Module 5.3).

## Test assertion gotchas worth remembering

- **`renderHook` is async in RTL 14** — must `await renderHook(...)` and
  `await rerender(...)`; timer/state advances go through `await act(async () => …)`.
- **PDF export** always emits an `<!-- Drug Appendix -->` HTML comment, so assert
  on the rendered body text ("Insights with linked drug names"), not the phrase
  "Drug Appendix".
- **Broadcast throttle** seeds `lastTime` at 0, so a fake clock must start at a
  realistic non-zero epoch or the very first swipe is (wrongly) treated as
  throttled.
