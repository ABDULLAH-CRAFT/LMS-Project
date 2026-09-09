import { useEffect, useState } from 'react';

// Returns `value`, but only updates after it hasn't changed for `delayMs`.
// Use this to avoid firing a network request on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}