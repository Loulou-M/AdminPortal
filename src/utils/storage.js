// storage.js
// Utilities for working with localStorage
import React from "react";

/**
 * Save data to localStorage with a prefix
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @param {string} [prefix='admin_portal'] - Key prefix
 */
export const saveToStorage = (key, value, prefix = 'admin_portal') => {
  try {
    const prefixedKey = `${prefix}_${key}`;
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(prefixedKey, serializedValue);
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @param {string} [prefix='admin_portal'] - Key prefix
 * @returns {*} Parsed value or defaultValue
 */
export const loadFromStorage = (key, defaultValue = null, prefix = 'admin_portal') => {
  try {
    const prefixedKey = `${prefix}_${key}`;
    const serializedValue = localStorage.getItem(prefixedKey);
    
    if (serializedValue === null) return defaultValue;
    
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error(`Error loading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 * @param {string} [prefix='admin_portal'] - Key prefix
 */
export const removeFromStorage = (key, prefix = 'admin_portal') => {
  try {
    const prefixedKey = `${prefix}_${key}`;
    localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

/**
 * Clear all localStorage items with the given prefix
 * @param {string} [prefix='admin_portal'] - Key prefix
 */
export const clearStorage = (prefix = 'admin_portal') => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`${prefix}_`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error(`Error clearing localStorage (prefix: ${prefix}):`, error);
  }
};

/**
 * Hook to persist and retrieve state from localStorage
 * Example usage:
 * const [value, setValue] = usePersistentState('my_key', initialValue);
 * 
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial state value
 * @param {string} [prefix='admin_portal'] - Key prefix
 * @returns {[*, Function]} State value and setter function
 */
export const usePersistentState = (key, initialValue, prefix = 'admin_portal') => {
  // This function is meant to be used with React hooks
  // Get initial state from localStorage or use initialValue
  const storedValue = loadFromStorage(key, initialValue, prefix);
  
  // Create state with the retrieved value
  const [value, setValue] = React.useState(storedValue);
  
  // Update localStorage whenever state changes
  React.useEffect(() => {
    saveToStorage(key, value, prefix);
  }, [key, value, prefix]);
  
  return [value, setValue];
};