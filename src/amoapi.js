import axios from 'axios';
import { updateState, getState } from './state';

const amoapi = axios.create({
  baseURL: '/api',
  headers: { Authorization: `Bearer ${import.meta.env.VITE_ACCESSTOKEN}` },
  withCredentials: true,
});

/**
 * Dispatch a custom event to update the UI with the given data.
 * @param {Array} data - The data to update the UI with.
 * @param {boolean} inprogress - The state indicating whether the loading is in progress.
 */
const dispatchUpdateCardsEvent = (data, inprogress) => {
  window.document.dispatchEvent(
    new CustomEvent('updateCards', {
      detail: {
        data,
        inprogress,
      },
    }),
  );
};

/**
 * Fetch leads from the API with pagination.
 * @param {number} [page=1] - The page number to fetch.
 * @param {number} [limit=3] - The number of leads to fetch per page.
 * @param {Array} [accumulatedData=[]] - The accumulated data from previous pages.
 * @returns {Promise<Array>} - The accumulated leads data.
 */
const getLeads = async (page = 1, limit = 3, accumulatedData = []) => {
  try {
    const response = await amoapi.get(`/v4/leads?page=${page}&limit=${limit}`);
    const data = response.data;
    const leads = accumulatedData.concat(data?._embedded.leads);
    dispatchUpdateCardsEvent(leads, !!data?._links?.next);

    if (data?._links?.next) {
      // If there are more data, wait for a second and fetch the next batch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getLeads(page + 1, limit, leads);
    } else {
      // Return all the accumulated data
      return leads;
    }
  } catch (error) {
    console.error(
      'Ooops! something went wrong :) Here must be some error handling',
      error,
    );
  }
};

/**
 * Fetch task by lead ID from the API.
 * @param {string} id - The ID of the lead.
 * @returns {Promise<Object>} - The task data for the lead.
 */
const getTaskByLeadId = async (id) => {
  try {
    const response = await amoapi.get(
      `/v4/tasks?filter%5Bentity_type%5D=leads&filter%5Bentity_id%5D=${id}`,
    );
    const data = response.data;
    if (data?._embedded?.tasks?.length) {
      return data?._embedded?.tasks[0];
    } else {
      return {
        text: 'No task!',
        id: 'No id!',
        complete_till: false,
      };
    }
  } catch (error) {
    console.error(
      'Ooops! something went wrong :) Here must be some error handling',
      error,
    );
  }
};
/**
 * Global queue manager to handle API requests with configurable concurrency and delay.
 * @param {number} [maxRequestsPerSecond=2] - The maximum number of requests per second.
 */
const createQueueManager = (maxRequestsPerSecond = 2) => {
  const queue = [];
  let tokens = maxRequestsPerSecond; // Start with the maximum number of tokens
  const tokenInterval = 1000 / maxRequestsPerSecond; // Time interval to add one token (in ms)

  // Refill tokens at the configured rate
  setInterval(() => {
    if (tokens < maxRequestsPerSecond) {
      tokens++;
    }
    processQueue(); // Attempt to process the queue whenever tokens are refilled
  }, tokenInterval);

  const processQueue = () => {
    while (tokens > 0 && queue.length > 0) {
      const batch = queue.splice(0, tokens); // Take up to the available tokens
      tokens -= batch.length; // Consume tokens for the batch

      // Process all requests in the batch concurrently
      batch.forEach(({ fn, resolve, reject }) => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            // After the request is resolved, attempt to process the queue again
            processQueue();
          });
      });
    }
  };

  return {
    enqueue: (fn) =>
      new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        processQueue(); // Attempt to process the queue immediately
      }),
    maxRequestsPerSecond, // Expose the maxRequestsPerSecond value
  };
};

const queueManager = createQueueManager(2); // 2 requests per second
export { getLeads, getTaskByLeadId };
