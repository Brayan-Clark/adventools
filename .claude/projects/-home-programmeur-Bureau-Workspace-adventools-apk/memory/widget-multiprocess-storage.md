---
name: widget-multiprocess-storage
description: Android widgets run in a separate process — storage access rules to avoid corrupting the app's data
metadata:
  type: project
---

The `react-native-android-widget` task handler (`widgets/widget-task-handler.tsx`) and any module it imports (e.g. `lib/mofonaina.ts`) run in a **separate Android process** from the main app.

Rules to avoid corrupting the app's data (notes, hymn favorites, Bible markup were getting lost after widget use):
- **Never touch AsyncStorage from the widget path** (read or write). RKStorage is not multi-process safe; concurrent access corrupts the whole store. Use the **filesystem** for shared caches instead (e.g. mofonaina cache moved to `documentDirectory/mofonaina_cache.json`; widget quarterlies cache in `LESSONS_DIR/quarterlies_<lang>.json`).
- **Don't re-issue `PRAGMA journal_mode = WAL` from the widget.** WAL is persistent and set once by the app (`lib/database.ts`). Re-setting it from the second process is a header write that can leave a stale `-wal`/`-shm` and make the app fail to read `adventools_user.db`. Widget keeps only `PRAGMA busy_timeout` and stays a pure reader.

**Why:** symptom was "after using widgets, the app can't retrieve notes / hymns / colored Bible words." Most of that data lives in SQLite `adventools_user.db`; the rest (SS quarterly data) was in AsyncStorage.
**How to apply:** when adding widget features, read settings via `readSqliteSetting`, fetch dynamic data from network + filesystem cache, never AsyncStorage. Related: [[hymn-audio-linking]]
