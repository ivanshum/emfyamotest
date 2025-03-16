const state = {
  leads: [],
  isLoading: false,
  openedCardId: '',
  renderedLeads: new Set(), // Track already rendered lead IDs
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

/**
 * Add a lead ID to the renderedLeads set.
 * @param {string} leadId - The ID of the lead to mark as rendered.
 */
export const markLeadAsRendered = (leadId) => {
  state.renderedLeads.add(leadId);
};

/**
 * Check if a lead ID is already rendered.
 * @param {string} leadId - The ID of the lead to check.
 * @returns {boolean} - True if the lead is already rendered, false otherwise.
 */
export const isLeadRendered = (leadId) => {
  return state.renderedLeads.has(leadId);
};
