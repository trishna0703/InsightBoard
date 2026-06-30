# Module 2 — Insight Detail & Form: Architecture & Decisions

## What this module delivers

- **Detail panel** — bottom sheet showing all insight fields, linked HCP info, last 5 activity entries, Edit and Move buttons
- **Create/Edit form** — bottom sheet with full field coverage, real-time Zod validation, unsaved-changes guard
- **Activity log** — auto-logged on every create, edit, and move; displayed as a timeline in the detail panel

---

## Key decisions

### 1. react-hook-form + Zod, not hand-rolled validation

**Why:** The spec requires *real-time inline errors as the user types*. `react-hook-form` with `mode: 'onChange'` handles field-level re-validation on every keystroke without re-rendering the whole form tree. Zod gives us a single source of truth — the same schema that validates the form (`InsightFormSchema`) also types the mutation variables (`InsightFormValues`), eliminating a whole class of type-drift bugs.

**Trade-off:** `@hookform/resolvers` adds a small bundle footprint, but it was already in `package.json`, so this is a zero-cost dependency.

---

### 2. Two separate DetailSheet instances in BoardScreen

The board renders one `<DetailSheet>` for the detail panel and a second for the form. The alternative — a single sheet that swaps content — was ruled out because:

- Swapping content mid-animation produces a visual flicker
- The form sheet needs `preventClose=true` (see below); the detail sheet does not
- Keeping them separate means each has an independent animation lifecycle

---

### 3. `preventClose` prop on DetailSheet for unsaved-changes guard

The built-in drag-to-dismiss and backdrop-tap both call `onClose` directly. If the user has typed content and accidentally swipes the form away, that data is gone with no warning.

**Solution:** Added a `preventClose?: boolean` prop to `DetailSheet` that disables both the drag gesture's dismiss path and the backdrop's `onPress`. The form's own **Cancel** button owns the close path and shows an `Alert.alert` confirmation when `react-hook-form`'s `isDirty` is true. A `useRef` keeps `preventClose` current inside the stale `PanResponder` closure.

**Why not a `canClose: () => boolean` callback?** That would require `PanResponder` to call it synchronously, but showing a native `Alert` is inherently async — the sheet would already be animating away before the user taps "Keep editing". The `preventClose` flag avoids the async race entirely.

---

### 4. Activity logging is fire-and-forget, non-blocking

`useCreateInsight` and `useUpdateInsight` `await` the primary mutation, then fire activity/tag mutations with `void promise.catch(() => null)`. This means:

- The UX responds instantly to the save — no waiting for 2–3 sequential network calls
- A transient activity-log failure doesn't surface as a user-facing error (the insight itself was saved correctly)
- The detail panel's `refetchDetail()` after save will pick up new activities anyway

---

### 5. Tag management: delete-all → re-insert

When editing an insight, we delete all existing `insight_tags` rows for that insight, then re-insert the new set. Alternatives considered:

- **Diff-based (insert new, delete removed)**: More network-efficient but complex and error-prone for a small junction table with < 20 rows per insight
- **Upsert**: `pg_graphql` doesn't expose `ON CONFLICT DO NOTHING` directly without a custom mutation

The delete-then-insert approach is correct for all edge cases (clear all, add all, reorder) with two predictable mutations.

---

### 6. `useInsightDetail` — separate query, not a cache read

The detail panel fetches via a dedicated `GET_INSIGHT_DETAIL` query (with `fetchPolicy: 'cache-and-network'`) rather than reading the insight from the board's `LIST_INSIGHTS` cache. Reasons:

- `LIST_INSIGHTS` does not fetch `description`, activities, or full HCP details — projecting extra fields onto every list card would balloon the board query
- The detail query is only executed when a card is tapped, so the extra network call is incidental to user intent
- After an edit, `refetchDetail()` gives us fresh data including the new activity entries without invalidating the whole board cache

---

### 7. `useCurrentUser` — Supabase session, not a GraphQL query

The current user's `id` (for activity logging) and `name` (for display) come directly from `supabase.auth.getSession()` / `onAuthStateChange`. A GraphQL query to a `profiles` table would work too, but it adds latency on every app load and a loading state to every consumer. The session object already carries `user.id` and `user.user_metadata.name`.

---

### 8. HCP autocomplete — controlled, debounced, in-form

`HCPAutocomplete` is a controlled component that owns its own search input and debounces via `useHCPs` → `useDebounce(300ms)`. It's embedded directly in `InsightForm` rather than a separate bottom sheet. The results list is capped at 10 (`LIST_HCPS: first: 10`) and scrolls within the form's `ScrollView`. This avoids a third nesting of modals.

---

### 9. `categoryId` vs. `category` string in the Insight type

The backend stores categories in a relational `categories` table. The `Insight.category` field kept as a display string (`"Efficacy"`, `"Safety"`, etc.) because every existing card/badge render uses the string directly. A new `Insight.categoryId: string | null` field was added alongside it for form submission — both are populated by the transformer functions from the GraphQL response's `category { id name }` object.

---

## File map

| Purpose | File |
|---|---|
| Form schema + types | `src/schemas/insightForm.ts` |
| Detail query | `src/graphql/queries/insights.ts` → `GET_INSIGHT_DETAIL` |
| HCP / Tags / Categories queries | `src/graphql/queries/hcps.ts`, `tags.ts` |
| Full-field update mutation | `src/graphql/mutations/insights.ts` → `UPDATE_INSIGHT_FIELDS` |
| Activity mutation | `src/graphql/mutations/activities.ts` |
| Tag mutations | `src/graphql/mutations/tags.ts` |
| Current user | `src/hooks/useCurrentUser.ts` |
| Detail data hook | `src/hooks/useInsightDetail.ts` |
| Create hook (+ activity log) | `src/hooks/useCreateInsight.ts` |
| Update hook (+ activity diff + tags) | `src/hooks/useUpdateInsight.ts` |
| HCP search hook | `src/hooks/useHCPs.ts` |
| Tag/Category list hooks | `src/hooks/useTags.ts`, `useCategories.ts` |
| Detail panel UI | `src/components/detail/InsightDetailPanel.tsx` |
| Activity timeline UI | `src/components/detail/ActivityTimeline.tsx` |
| Main form | `src/components/forms/InsightForm.tsx` |
| HCP picker | `src/components/forms/HCPAutocomplete.tsx` |
| Tag multi-select | `src/components/forms/TagMultiSelect.tsx` |
| Sheet + board wiring | `src/screens/BoardScreen.tsx` |
