/**
 * Safe localStorage utilities
 * Handles SSR/SSG scenarios where window is not available
 */

/**
 * Safely get item from localStorage
 * Returns null if window is not available (SSR) or key doesn't exist
 */
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Safely set item in localStorage
 * Returns true if successful, false otherwise
 */
export function setLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 * Returns true if successful, false otherwise
 */
export function removeLocalStorage(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Safely clear all localStorage
 */
export function clearLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Get parsed JSON from localStorage
 */
export function getLocalStorageJSON<T>(key: string): T | null {
  const value = getLocalStorage(key);
  
  if (!value) {
    return null;
  }
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error parsing JSON from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Set JSON object to localStorage
 */
export function setLocalStorageJSON<T>(key: string, value: T): boolean {
  try {
    const stringified = JSON.stringify(value);
    return setLocalStorage(key, stringified);
  } catch (error) {
    console.error(`Error stringifying JSON for localStorage (${key}):`, error);
    return false;
  }
}
