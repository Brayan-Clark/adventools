import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_SECRET_KEY = 'adventools-secure-key-2024'; // In production, this should be unique per device

/**
 * Encrypts a string using AES-256
 */
export const encryptData = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, APP_SECRET_KEY).toString();
};

/**
 * Decrypts an AES-256 encrypted string
 */
export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, APP_SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (e) {
    console.error('Decryption failed', e);
    return ciphertext; // Return original if decryption fails (fallback for unencrypted data)
  }
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
