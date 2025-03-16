const state = {
  leads: [],
  isLoading: false,
  openedCardId: '',
  renderedLeads: new Set(), // Track already rendered lead IDs
  cachedTasks: new Map(), // Cache for the last 3 tasks
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

/**
 * Add a task to the cache.
 * @param {string} leadId - The ID of the lead.
 * @param {Object} task - The task data to cache.
 */
export const cacheTask = (leadId, task) => {
  const { cachedTasks } = state;

  // Add the task to the cache
  cachedTasks.set(leadId, task);

  // Ensure the cache only keeps the last 3 tasks
  if (cachedTasks.size > 3) {
    const oldestKey = cachedTasks.keys().next().value;
    cachedTasks.delete(oldestKey);
  }
};

/**
 * Get a cached task by lead ID.
 * @param {string} leadId - The ID of the lead.
 * @returns {Object|null} - The cached task or null if not found.
 */
export const getCachedTask = (leadId) => {
  return state.cachedTasks.get(leadId) || null;
};

/**
 * Update the state with the fetched task data.
 * @param {string} leadId - The ID of the lead.
 * @param {Object} task - The task data to update.
 */
export const updateTaskInState = (leadId, task) => {
  const { leads } = getState();
  const updatedLeads = leads.map((lead) =>
    lead.id === leadId ? { ...lead, task } : lead,
  );
  updateState({ leads: updatedLeads });
};
