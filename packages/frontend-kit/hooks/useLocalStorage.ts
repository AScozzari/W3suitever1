import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

/**
 * Hook for managing state synced with localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial value if no value exists in localStorage
 * @returns A tuple of [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const readValue = useCallback((): T => {
    // Prevent build error "window is undefined" in SSR
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      // Prevent build error "window is undefined" in SSR
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key "${key}" even though environment is not a browser`
        );
      }

      try {
        // Allow value to be a function so we have the same API as useState
        const newValue = value instanceof Function ? value(storedValue) : value;

        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(newValue));
        
        // Save state
        setStoredValue(newValue);
        
        // Dispatch a custom event to sync between tabs
        window.dispatchEvent(new Event('local-storage'));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    // Prevent build error "window is undefined" in SSR
    if (typeof window === 'undefined') {
      console.warn(
        `Tried removing localStorage key "${key}" even though environment is not a browser`
      );
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      
      // Dispatch a custom event to sync between tabs
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e?.key && e.key !== key) {
        return;
      }
      setStoredValue(readValue());
    };

    const handleLocalStorageChange = () => {
      setStoredValue(readValue());
    };

    // Listen to storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Listen to custom event from same tab
    window.addEventListener('local-storage', handleLocalStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleLocalStorageChange);
    };
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing complex objects in localStorage with partial updates
 * @param key - The localStorage key
 * @param initialValue - The initial value if no value exists in localStorage
 * @returns An object with value, update, reset, and remove methods
 */
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  initialValue: T
) {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  const update = useCallback(
    (updates: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [setValue, initialValue]);

  return {
    value,
    update,
    reset,
    remove: removeValue,
  };
}