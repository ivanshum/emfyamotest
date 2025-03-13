import axios from 'axios';

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
      // Return the task data
      return data?._embedded?.tasks[0];
    } else {
      // If no task is found
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

export { getLeads, getTaskByLeadId };
