import CryptoJS from 'crypto-js';

// Simple encryption key derived from the browser (constant, deterministic)
// In production, you might want to derive this from user-specific data
const getEncryptionKey = (): string => {
  // Use a constant key - in production could use web crypto API for stronger security
  return 'github-pr-reviewer-secret-key-v1';
};

/**
 * Encrypt a GitHub token for secure localStorage storage
 * @param token Raw GitHub token (ghp_*)
 * @returns Encrypted token string
 */
export const encryptToken = (token: string): string => {
  const key = getEncryptionKey();
  const encrypted = CryptoJS.AES.encrypt(token, key).toString();
  return encrypted;
};

/**
 * Decrypt a token from encrypted localStorage value
 * @param encryptedToken Previously encrypted token string
 * @returns Decrypted token, or null if decryption fails
 */
export const decryptToken = (encryptedToken: string): string | null => {
  try {
    const key = getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, key).toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
};

/**
 * Validate GitHub token format
 * @param token Token to validate
 * @returns True if token looks like a GitHub PAT
 */
export const isValidGitHubToken = (token: string): boolean => {
  // GitHub tokens typically start with ghp_ (Personal Access Token)
  return token.startsWith('ghp_') && token.length > 20;
};

/**
 * Get token from localStorage
 * @returns Decrypted token or null if not found or decryption fails
 */
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const encrypted = localStorage.getItem('gh_token_encrypted');
  if (!encrypted) return null;
  
  return decryptToken(encrypted);
};

/**
 * Store token in localStorage (encrypted)
 * @param token Raw GitHub token
 * @returns True if saved successfully
 */
export const saveStoredToken = (token: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  if (!isValidGitHubToken(token)) {
    console.error('Invalid GitHub token format');
    return false;
  }
  
  try {
    const encrypted = encryptToken(token);
    localStorage.setItem('gh_token_encrypted', encrypted);
    return true;
  } catch (error) {
    console.error('Failed to save token:', error);
    return false;
  }
};

/**
 * Clear stored token from localStorage
 */
export const clearStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('gh_token_encrypted');
};
