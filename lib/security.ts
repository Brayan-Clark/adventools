import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Legacy hard-coded key. Kept ONLY to decrypt data that was encrypted by older
 * versions of the app. New data is always encrypted with the per-device key.
 * Do NOT use this for encryption anymore.
 */
const LEGACY_KEY = 'adventools-secure-key-2024';

const DEVICE_KEY_STORE_NAME = 'adventools_device_enc_key';

// In-memory cache of the per-device key, populated by initSecurity().
let deviceKey: string | null = null;

/**
 * CryptoJS AES output uses the OpenSSL "Salted__" format, whose Base64 always
 * starts with "U2FsdGVk". We use this to tell encrypted strings apart from
 * legacy plaintext that may still be sitting in storage.
 */
const isLikelyEncrypted = (value: string): boolean => value.startsWith('U2FsdGVk');

/**
 * Generates a cryptographically-strong 256-bit key as a hex string.
 * Relies on the global `crypto.getRandomValues` polyfill (react-native-get-random-values,
 * imported in index.js).
 */
function generateDeviceKey(): string {
  const bytes = new Uint8Array(32);
  // @ts-ignore — provided by the react-native-get-random-values polyfill
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Loads (or creates on first launch) the unique per-device encryption key from
 * the secure hardware-backed store (Android Keystore / iOS Keychain).
 *
 * MUST be awaited at startup BEFORE any note encryption/decryption happens
 * (see SettingsProvider). Idempotent.
 */
export async function initSecurity(): Promise<void> {
  if (deviceKey) return;
  try {
    let key = await SecureStore.getItemAsync(DEVICE_KEY_STORE_NAME);
    if (!key) {
      key = generateDeviceKey();
      await SecureStore.setItemAsync(DEVICE_KEY_STORE_NAME, key);
    }
    deviceKey = key;
  } catch (e) {
    // If SecureStore is unavailable we must not silently fall back to the legacy
    // key for NEW data, but we also must not crash the app. Leave deviceKey null;
    // encryptData() will surface a clear warning and use the legacy key so the
    // app keeps working (data stays readable, just not upgraded yet).
    console.error('initSecurity failed — secure key unavailable', e);
  }
}

/** The key used for ENCRYPTING new data. */
function encryptionKey(): string {
  if (deviceKey) return deviceKey;
  console.warn('encryptData called before initSecurity completed — using legacy key as fallback');
  return LEGACY_KEY;
}

/**
 * Encrypts a string using AES-256 with the per-device key.
 */
export const encryptData = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, encryptionKey()).toString();
};

/**
 * Decrypts an AES-256 encrypted string.
 *
 * - Plaintext that was never encrypted (legacy) is returned as-is.
 * - Encrypted data is tried with the device key first, then the legacy key
 *   (so data from older app versions is still readable and gets re-encrypted
 *   with the device key the next time it is saved).
 * - A genuine decryption failure returns '' rather than echoing the ciphertext
 *   back (the old behaviour caused the ciphertext to be re-encrypted, silently
 *   corrupting the note).
 */
export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';

  // Legacy unencrypted data — return untouched.
  if (!isLikelyEncrypted(ciphertext)) return ciphertext;

  for (const key of [deviceKey, LEGACY_KEY]) {
    if (!key) continue;
    try {
      const text = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);
      if (text) return text;
    } catch {
      // try next key
    }
  }

  console.error('Decryption failed for an encrypted value (key mismatch)');
  return '';
};

/**
 * Backup envelope encryption.
 *
 * Backups must stay PORTABLE across devices, so they cannot be encrypted with
 * the per-device key. We use a fixed, app-level backup key for the file envelope
 * and store note content as plaintext INSIDE that envelope (it is re-encrypted
 * with the local device key on import). This keeps the file protected at rest
 * while remaining restorable on any device.
 *
 * NOTE (future hardening, audit item #6): derive this key from a user-supplied
 * password via PBKDF2 so only the user can restore their backup.
 */
const BACKUP_KEY = 'adventools-secure-key-2024';

export const encryptBackup = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, BACKUP_KEY).toString();
};

export const decryptBackup = (ciphertext: string): string => {
  if (!ciphertext) return '';
  // Try the portable backup key, then the device key, then legacy — covers
  // new portable backups and any older backup formats.
  for (const key of [BACKUP_KEY, deviceKey, LEGACY_KEY]) {
    if (!key) continue;
    try {
      const text = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);
      if (text) return text;
    } catch {
      // try next key
    }
  }
  return '';
};

/**
 * Securely saves data (Encrypted)
 */
export const saveSecurely = async (key: string, value: string) => {
  const encrypted = encryptData(value);
  await AsyncStorage.setItem(key, encrypted);
};

/**
 * Retrieves securely saved data (Decrypted)
 */
export const getSecurely = async (key: string): Promise<string | null> => {
  const encrypted = await AsyncStorage.getItem(key);
  if (!encrypted) return null;
  return decryptData(encrypted);
};
