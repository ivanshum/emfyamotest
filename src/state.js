const state = {
  leads: [],
  isLoading: false,
};

/**
 * Subscribers to state changes (e.g., UI rendering functions).
 */
const subscribers = [];

/**
 * Subscribe to state changes.
 * @param {Function} callback - The function to call when the state changes.
 */
export const subscribe = (callback) => {
  subscribers.push(callback);
};

/**
 * Update the state and notify subscribers.
 * @param {Object} newState - The new state to merge with the existing state.
 */
export const updateState = (newState) => {
  Object.assign(state, newState);
  subscribers.forEach((callback) => callback(state));
};

/**
 * Get the current state.
 * @returns {Object} - The current state.
 */
export const getState = () => state;
