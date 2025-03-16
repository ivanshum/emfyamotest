import axios from 'axios';
import { updateState, getState } from './state';

const amoapi = axios.create({
  baseURL: '/api',
  headers: { Authorization: `Bearer ${import.meta.env.VITE_ACCESSTOKEN}` },
  withCredentials: true,
});

/**
 * Fetch leads from the API with pagination.
 * @param {number} [startPage=1] - The starting page number to fetch.
 * @param {number} [limit=3] - The number of leads to fetch per page.
 */
export const getLeads = async (startPage = 1, limit = 3) => {
  try {
    updateState({ isLoading: true });

    let currentPage = startPage;
    let hasNextPage = true;

    const concurrency = queueManager.maxRequestsPerSecond; // Use the queue manager's concurrency

    while (hasNextPage) {
      // Fetch up to `concurrency` pages concurrently
      const pageRequests = [];
      for (let i = 0; i < concurrency; i++) {
        pageRequests.push(
          queueManager.enqueue(() =>
            amoapi.get(
              `/v4/leads?page=${currentPage + i}&limit=${limit}&with=contacts`,
            ),
          ),
        );
      }

      // Wait for all page requests to complete
      const responses = await Promise.all(pageRequests);

      // Process each response
      for (const response of responses) {
        if (response.status === 204 || !response.data) {
          // Handle 204 No Content or empty response
          hasNextPage = false;
          break;
        }

        const data = response.data;
        const leads = data?._embedded?.leads || [];

        // Collect all contact detail requests
        const contactRequests = [];
        for (const lead of leads) {
          const contactLinks = lead?._embedded?.contacts?.map((contact) => {
            const href = contact?._links?.self?.href || '';
            const contactId = href.split('/').pop().split('?')[0];
            return contactId;
          });

          if (contactLinks) {
            for (const contactId of contactLinks) {
              if (contactId) {
                // Enqueue contact detail requests
                contactRequests.push(
                  queueManager
                    .enqueue(() => getContactDetails(contactId))
                    .then((contactDetails) => {
                      // Update the lead with contact details
                      lead.contactName = contactDetails?.name || 'Unknown Name';
                      const phoneField =
                        contactDetails?.custom_fields_values?.find(
                          (field) => field.field_code === 'PHONE',
                        );
                      lead.contactPhone =
                        phoneField?.values?.[0]?.value || 'No Phone Number';
                    }),
                );
              }
            }
          }
        }

        // Wait for all contact detail requests to complete
        await Promise.all(contactRequests);

        // Update the state with the fetched leads
        updateState({
          leads: [...getState().leads, ...leads],
        });

        // Check if there is a next page
        hasNextPage = !!data?._links?.next;
      }

      // Increment the current page by the number of pages fetched
      currentPage += concurrency;
    }

    updateState({ isLoading: false });
  } catch (error) {
    console.error('Error fetching leads:', error);
    updateState({ isLoading: false });
  }
};

/**
 * Fetch contact details by contact ID.
 * @param {string} contactId - The ID of the contact.
 * @returns {Promise<Object>} - The contact details.
 */
export const getContactDetails = async (contactId) => {
  try {
    const response = await queueManager.enqueue(() =>
      amoapi.get(`/v4/contacts/${contactId}`),
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching contact details for contact ID ${contactId}:`,
      error,
    );
    return null;
  }
};
/** TODO: Keep the last 3 tasks (for example) in memory to avoid redundant requests and ensure it respects concurrency. */
/**
 * Fetch task by lead ID from the API.
 * @param {string} id - The ID of the lead.
 * @returns {Promise<Object>} - The task data for the lead.
 */
export const getTaskByLeadId = async (id) => {
  try {
    const response = await queueManager.enqueue(() =>
      amoapi.get(
        `/v4/tasks?filter%5Bentity_type%5D=leads&filter%5Bentity_id%5D=${id}`,
      ),
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
    console.error('Error fetching task by lead ID:', error);
    return {
      text: 'Error fetching task!',
      id: 'Error!',
      complete_till: false,
    };
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
