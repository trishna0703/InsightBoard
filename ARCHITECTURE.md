# Architecture

InsightBoard is a React Native (Expo) + TypeScript client over a provided
Supabase backend. This document explains the structure, the real-time model,
and the key trade-offs.

---

## Stack & structure

| Layer | Choice |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Language | TypeScript (`strict`, zero `any`) |
| Data | GraphQL via Supabase `pg_graphql`, Apollo Client (normalized cache) |
| Realtime | Supabase Realtime — Postgres Changes + Broadcast + Presence |
| Auth/session | Supabase Auth (AsyncStorage-persisted) |
| Design | Material Design 3 palette, custom components |

```
src/
  components/    board · detail · forms · analytics · common (presentational)
  hooks/         data + realtime logic (useInsights, useMoveInsight, useBroadcast, …)
  graphql/       queries + mutations (typed documents)
  context/       FiltersContext (persisted board filters)
  services/      apollo.ts, supabase.ts, pdfExport.ts
  schemas/       Zod form schema
  types/         domain types (incl. StageTransition discriminated union)
  utils/         pure transforms (analytics, dates)
  __tests__/     14 Jest suites
```

The guiding split is **presentational components ← hooks ← services**. Components
hold layout and local UI state; hooks own data fetching, cache mutation, and
realtime subscriptions; services wrap the two external clients (Apollo, Supabase).

---

## GraphQL & Apollo

- **Normalized cache.** `dataIdFromObject` keys entities by pg_graphql's `nodeId`,
  so the same insight is a single cache object across the board list, detail
  panel, and analytics.
- **Mutations update the cache, never refetch-all.** Stage moves write directly
  into the affected `LIST_INSIGHTS` entry and patch `GET_STAGE_COUNTS`
  (`useMoveInsight`), so counts change instantly with no round-trip.
- **Cache-key consistency is a real hazard here.** Apollo caches query results by
  their `variables`. If a mutation's cache read builds a differently-shaped filter
  than the active query, it reads/writes an entry nothing is watching and the UI
  goes stale. To prevent this, `buildInsightsFilter()` is the *single* source of
  the filter object — the board query and the optimistic mutation both call it, so
  their variables are byte-identical. (Free-text search uses a pg_graphql `or`
  group over title + description, AND-ed with the other clauses.)
- **Server-side counts, client-side distributions.** Analytics KPIs come from
  filtered `totalCount` (no rows fetched); funnels, time-series, and leaderboards
  are computed in pure functions (`utils/analyticsUtils.ts`) over cursor-paginated
  insights — keeping the network small and the math unit-testable.

---

## Real-time architecture (the core of the app)

Two Supabase channels with **different jobs**:

1. **Postgres Changes → cache truth.** `useRealtimeBoard` subscribes to
   INSERT/UPDATE on `insights` and mutates the Apollo cache: removing/prepending
   cards across stage lists, patching counts, and refetching the open detail
   panel. This is the source of truth for *what* changed, scoped to your team by
   backend RLS.
2. **Broadcast → attribution & ephemeral signals.** Every mutation also broadcasts
   a small payload (who/what/where) so peers can show the *"Bob moved 'X'"* toast
   and fade-in animation, and so viewing/editing/swiping indicators (Module 5)
   work without touching the database.

**Why the split?** Postgres Changes carries the row but not the actor's display
name or intent; Broadcast is instant and ephemeral but not persisted. Using each
for what it's good at gives correct cache state *and* rich attribution.

**Echo-suppression by `userId`, not timing.** A user receives their own broadcasts.
We drop them by comparing `payload.userId` to the current user — deterministic,
unlike a fragile time-window heuristic.

**Presence** (`usePresence`) tracks online users, joining on app foreground and
leaving on background via `AppState`. **All Presence/Broadcast channels are
namespaced by `team_id`** (`board:<team_id>`, `presence:<team_id>`) because those
channels are keyed by name and would otherwise collide across candidate teams.

Every subscription returns an unmount cleanup (`removeChannel`).

---

## Optimistic UI & conflict resolution

- **Swipe** removes the card immediately (`optimisticResponse` + cache update).
  If the mutation rejects, Apollo rolls the cache back and the card springs back
  with an error toast. (This exact path is covered by `useMoveInsight.test.tsx`.)
- **Stale-write detection uses `updated_at`.** Before an edit or a swipe commits,
  the client re-reads the row's `updated_at`; if it changed since load, first
  writer wins and the second sees either a snap-back (swipe) or the field-by-field
  **conflict modal** (edit) with Keep Mine / Keep Theirs / per-field Merge.

---

## State management

There is deliberately **no Redux/Zustand**. State lives in the layer that owns it:

- **Apollo normalized cache** is the app's shared server-state store.
- **`FiltersContext`** holds the composable board filters *above* the navigator and
  mirrors them to AsyncStorage, so they survive tab navigation and app restarts
  (Module 6.3). Lifting them out of `BoardScreen` is what makes "persist across
  navigation" hold even if the screen unmounts.
- **Local `useState`** for transient UI (open sheets, reorder mode).

---

## Charts library — decision & justification

**Chosen: custom, dependency-free chart components** (`components/analytics/*`)
built from `View` + `Animated`, rather than a charting library.

Rationale:
- The five required charts include a **priority×stage heatmap** and a **pipeline
  funnel** that general charting libs (react-native-chart-kit, victory-native)
  either don't offer or render awkwardly.
- Those libraries pull in **`react-native-svg`** and a large surface area for what
  amounts to animated bars and a grid — heavier bundle, less styling control.
- Custom components give full control over the **Material-3 palette**, the
  **load-in animations** the spec asks for, and **lazy mounting** below the fold
  (`LazyView`), and they keep the chart data as **pure, unit-tested functions**.

Trade-off: we write more layout code than we would with a library, but we avoid a
heavy native dependency and get exactly the visuals and animations required.

---

## PDF export

`services/pdfExport.ts` builds a single HTML document and renders it with
`expo-print`, then shares via `expo-sharing`. The insight table is **chunked at 25
rows per page** with CSS page breaks, and a drug appendix is appended when any
insight has a linked drug. Generation is driven behind a progress indicator. HTML
generation is isolated and tested (`pdfExport.test.ts`).

---

## Testing strategy

Logic that carries risk is extracted into pure functions or thin hooks and tested
directly (116 tests / 14 suites): Zod schema, analytics transforms, filter
building, reorder math, conflict diff, activity shaping, `useDebounce`,
`useBroadcast` (throttle/echo), `useKanbanData`, and the full swipe →
optimistic-update → revert path against a real Apollo cache + mocked link.
Heavy native surfaces (AsyncStorage, Toast) are mocked globally in `jest.setup.js`.

---

## Key trade-offs, summarized

| Decision | Trade-off |
|---|---|
| Custom charts over a lib | More layout code ↔ no heavy native dep, full styling/animation control |
| Postgres Changes + Broadcast (two channels) | More wiring ↔ correct cache state *and* rich attribution |
| Cache updates over refetch | Careful filter-key discipline ↔ instant UI, minimal network |
| Client-side distributions | Fetch all insights in range ↔ flexible, testable analytics without server changes |
| Apollo cache + Context (no global store) | Two state homes ↔ less boilerplate, right tool per concern |
| Not attempting bonuses | Fewer features ↔ mandatory scope shipped to a higher bar |
