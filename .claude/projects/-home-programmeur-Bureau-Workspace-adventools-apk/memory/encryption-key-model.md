---
name: encryption-key-model
description: How note encryption keys work — per-device key for storage, portable key for backups
metadata:
  type: project
---

`lib/security.ts` uses TWO keys (changed from a single hard-coded key):
- **Per-device key** (`initSecurity()` → random 256-bit, stored in `expo-secure-store` / Android Keystore). Used by `encryptData`/`decryptData` for note content AT REST in `adventools_user.db`. Must be loaded at startup before any crypto — done in `SettingsProvider` (`lib/settings-context.tsx`) BEFORE `migrateFromAsyncStorage()`.
- **Portable backup key** (`encryptBackup`/`decryptBackup`, currently the old constant `adventools-secure-key-2024`). Used ONLY for the `.advb` backup file envelope so backups restore on any device.

Rules:
- Never encrypt backups with the device key (breaks cross-device restore).
- Backups store note content as PLAINTEXT inside the encrypted envelope: `exportAllData` decrypts content; `importData` re-encrypts with the local device key via `encryptData(decryptData(content))` (idempotent for old encrypted-blob backups and new plaintext backups).
- `decryptData` returns plaintext as-is if not AES (`U2FsdGVk` prefix check), tries device key then legacy key, and returns `''` on genuine failure — it must NOT echo the ciphertext back (that used to re-encrypt garbage and corrupt notes).
- `LEGACY_KEY` is kept only to read data from old app versions.

**Native rebuild required:** `expo-secure-store` is a native module — the security upgrade only takes effect after `expo run:android` / EAS build. Without it, `initSecurity` catches the error, falls back to the legacy key, and the app keeps working (just not upgraded).

Future (audit #6): derive the backup key from a user password via PBKDF2. (Dead `lib/backup-service.ts` was deleted; the live path `importData` uses literal table names and is safe.) Related: [[widget-multiprocess-storage]]
