/**
 * Create a debounced version of a function.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
