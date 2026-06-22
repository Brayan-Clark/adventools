---
name: hymn-audio-linking
description: How hymn audio (play button) is linked to a hymn and the stale-cache pitfall
metadata:
  type: project
---

A hymn's audio is linked via the `c_playbacks` column in the hymn DB (e.g. `hira_fameno.db` row `c_num=1` → `c_playbacks='hira-faneva_minenf'`). The app (`app/hymnes/[id].tsx`) fetches `audio/playbacks/<c_playbacks>.json` from the data repo (`Brayan-Clark/adventools` branch `data`) and shows the play button only for entries whose JSON field `c_num` matches the hymn's `c_num`. Most playback JSON entries have NO `c_num` (they're browse-only); only linked ones do.

**Design (offline-first, data-saving):** the collection JSON is cached at `playbacks/cache_v3_<id>.json`. Hymn open (`app/hymnes/[id].tsx`) is purely offline — it only fetches once when the cache is missing, never on a normal open. Refreshing existing manifests is USER-DRIVEN via the "Mettre à jour les manifests audio" button in the hymn store (`components/hymnes/HymnDatabaseManager.tsx`), and runs automatically after a DB download. No TTL (the user prefers explicit refresh).

**Pitfall fixed:** the update button used a hardcoded `KNOWN_AUDIO_COLLECTIONS` list that was wrong ('hira-fameno' isn't a real collection) and incomplete (missed 'hira-faneva_minenf'), so some hymns' audio never refreshed. It now reads `SELECT DISTINCT c_playbacks` from every installed hymn DB and refreshes exactly those collections.

Data lives in the separate repo at `/home/programmeur/Bureau/Workspace/adventools-data`. Related: [[widget-multiprocess-storage]]
