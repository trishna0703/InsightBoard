# InsightBoard

A mobile app where pharmaceutical field reps capture, organize, and collaborate
on insights from Healthcare Provider (HCP) interactions, with **real-time sync
across users**. Built with React Native (Expo) + TypeScript against a provided
Supabase backend (Postgres + pg_graphql + Realtime + Auth) via Apollo Client.

> Assignment for the Speer Health Frontend Engineer (React Native) role.

---

## Setup

### Prerequisites
- Node.js 18+
- [Expo Go](https://expo.dev/go) on a physical device, or an iOS/Android simulator

### 1. Install
```bash
npm install
```

### 2. Configure environment
Copy the example env file and fill in the credentials from the Setup Guide:
```bash
cp .env.example .env
```
```
EXPO_PUBLIC_SUPABASE_URL=<your supabase project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
EXPO_PUBLIC_TEAM_ID=<your team id>     # namespaces your Presence/Broadcast channels
```
> The real `.env` is git-ignored; only `.env.example` is committed.

### 3. Run
```bash
npm start          # Expo dev server — scan the QR with Expo Go
npm run ios        # open in iOS simulator
npm run android    # open in Android emulator
```

### 4. Test
```bash
npm test           # Jest — 116 tests across 14 suites
npm run test:watch
npx tsc --noEmit   # type-check (strict, zero `any`)
```

Log in with your seeded **Alice** and **Bob** accounts on two devices to see
real-time collaboration side by side.

---

## What's implemented

All six mandatory modules plus the non-functional requirements.

### Module 1 — Insight Pipeline Board
- Pipeline status bar: 4 tappable stage segments with live counts and selected highlight.
- Virtualized card list (FlashList) with title (2-line truncate), HCP, color-coded priority badge, category chip, relative timestamp; empty states + pull-to-refresh.
- Swipe-to-move: right advances (green panel), left reverts (orange panel), rubber-band at the ends, **optimistic UI** with animated revert + error toast on failure.
- Filter bar: search over **title and description** (debounced 300 ms), priority chips, removable active-filter chips with a **Clear all** link.

### Module 2 — Insight Detail & Form
- 85%-height bottom sheet (drag-to-dismiss): all fields, linked HCP info, activity timeline (last 5), Edit / Move actions.
- Create & edit form: Zod validation with **real-time inline errors**, HCP autocomplete via GraphQL, tag multi-select, **unsaved-changes warning** on dismiss.
- Activity log: every create/edit/move writes to `insight_activities` (who, field, old → new, timestamp).

### Module 3 — Real-Time Collaboration
- Postgres Changes board sync: remote moves/creates/edits update the cache live (animate out/in, instant count updates, yellow-flash on the open detail panel).
- Presence: header avatars (max 3 + "+N"), tap for the full list; joins on foreground / leaves on background; channels namespaced by `team_id`.

### Module 4 — Analytics & Export
- 4 KPI cards (total + 7-day delta, by-stage, avg pipeline time, most-active HCP).
- 5 charts (funnel, insights-over-time, category bar, priority×stage heatmap, HCP leaderboard) with a date-range selector, **lazy-loaded below the fold**, animate on load.
- Server-side `totalCount` for counts; distributions computed client-side from cursor-paginated insights.
- Multi-page **PDF export** (cover, KPI table, funnel table, 25-rows-per-page insight table, drug appendix) via `expo-print` + `expo-sharing` with a progress indicator.

### Module 5 — Real-Time Enhancements
- Broadcast signals: viewing indicator, editing lock ("View Only" / "Edit Anyway"), pulsing swipe indicator — high-frequency signals throttled.
- Conflict resolution: `updated_at` stale-write detection; field-by-field "Yours vs Theirs" modal with Keep Mine / Keep Theirs / **Merge** (per-field choice); swipe-conflict snap-back.
- Activity feed: floating bell with unread badge, real-time feed via Postgres Changes, tap-to-navigate-and-highlight, badge resets on open.

### Module 6 — Board Enhancements
- Overview mode: List ↔ Overview toggle; 4 stacked stages with compact mini-cards (max 3 + "+N more"), read-only.
- Drag-to-reorder within a stage (fractional `column_order`).
- Composable filter bar (bottom sheet): date range, category, HCP autocomplete, tags — AND logic, **persisted across navigation and app restarts** (AsyncStorage).

### Non-Functional
- **TypeScript** `strict`, **zero `any`**, discriminated union for stage transitions, all GraphQL responses typed.
- **Error handling**: global error boundary (fallback + Retry), loading/error/retry on GraphQL ops, toast notifications, **offline banner** (NetInfo).
- **Performance**: FlashList virtualization, normalized Apollo cache with mutation cache-updates (no refetch-all), subscriptions cleaned up on unmount.
- **Accessibility**: `accessibilityLabel`s across interactive elements; long-press opens a **"Move to…" action sheet** as a swipe alternative.

### Testing
14 Jest suites / 116 tests covering the required areas: Zod schemas, data-transformation
functions (analytics), custom hooks (`useDebounce`, `useBroadcast`, `useKanbanData`),
the pipeline swipe → optimistic-update → revert-on-failure flow (`useMoveInsight` against
a real Apollo cache), plus conflict-diff, filter-building, reorder math, PDF generation,
relative-time, and activity-feed shaping.

---

## Bonus tasks

None of the optional bonus tasks (B1 custom fields / voice-to-text, B2 OpenFDA
drug integration, B3 full VoiceOver) were attempted — the focus was on shipping
the mandatory modules to a high standard.

---

## Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — design decisions, real-time architecture, and key trade-offs (including the charts-library choice).

## Loom
_Add your 5-minute walkthrough link here._
