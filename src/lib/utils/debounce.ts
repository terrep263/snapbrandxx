/**
 * Debounce utility function
 * 
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { flush: () => void; cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T & { flush: () => void; cancel: () => void };
  
  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      func.apply(debounced, []);
    }
  };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

