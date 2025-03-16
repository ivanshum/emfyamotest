import { getState, updateState } from './state';
import { queueManager, getTaskByLeadId } from './amoapi';

// Track already rendered lead IDs
const renderedLeads = new Set();

/**
 * Render the leads in the UI.
 */
export const renderLeads = () => {
  const { leads } = getState();
  const grid = document.getElementById('maingrid');

  leads.forEach((lead) => {
    if (!renderedLeads.has(lead.id)) {
      // If the lead is not already rendered, create and append its card
      const card = createCardElement(lead);
      grid.appendChild(card);
      renderedLeads.add(lead.id); // Mark the lead as rendered
    } else {
      // Optional: Update the existing lead card if its data has changed
      const existingCard = document.getElementById(`card-${lead.id}`);
      if (existingCard) {
        updateCardElement(existingCard, lead);
      }
    }
  });
};
/**
 * Hide all elements with the given class name.
 * @param {string} className - The class name of the elements to hide.
 */
const hideAllElements = (className) => {
  [...document.getElementsByClassName(className)].forEach((element) => {
    element.classList.add('hidden');
  });
};

/**
 * Get color class based on the given Unix timestamp.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {string} - The Tailwind CSS class for the color ('fill-red-500', 'fill-green-500', or 'fill-yellow-500') based on the date.
 */
function getColorClass(unixTimestamp) {
  if (!unixTimestamp) {
    return 'fill-red-500';
  }

  // Adjust the timestamp to account for the timezone difference related to https://github.com/amocrm/amocrm-api-php/issues/402 because it is an AmoCRM internal problem
  const date = new Date((unixTimestamp - 3 * 3600) * 1000); // Subtract 3 hours (10800 seconds)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time components to midnight
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date >= today && date < tomorrow) {
    return 'fill-green-500';
  } else if (date >= tomorrow) {
    return 'fill-yellow-500';
  } else {
    return 'fill-red-500';
  }
}

/**
 * Clear the inner HTML of all elements with the given class name.
 * @param {string} className - The class name of the elements to clear.
 */
const clearAllElements = (className) => {
  [...document.getElementsByClassName(className)].forEach((element) => {
    element.innerHTML = '';
  });
};

/**
 * Show the element with the given class name inside the specified element.
 * @param {HTMLElement} element - The parent element.
 * @param {string} className - The class name of the element to show.
 */
const showElement = (element, className) => {
  element.querySelector(`.${className}`).classList.remove('hidden');
};

/**
 * Show or hide the loader.
 */
export const renderLoader = () => {
  const { isLoading } = getState();
  const loader = document.getElementById('mainloader');
  loader.classList.toggle('hidden', !isLoading);
};

/**
 * Handle the click event on a card element to fetch and display additional data.
 * @param {Event} event - The click event.
 */
const cardClickHandler = (event) => {
  const cardEl = event.target.closest('[id^="card-"]');
  if (!cardEl) return; // Ensure the clicked element is a card

  const { openedCardId } = getState();
  const clickedCardId = cardEl.dataset.leadid;

  // Close the card if it's already open
  if (openedCardId === clickedCardId) {
    updateState({ openedCardId: '' }); // Reset the opened card in the state
    hideAllElements('taskcard');
    hideAllElements('taskloader');
    clearAllElements('taskdata');
    return;
  }

  // Open the clicked card
  updateState({ openedCardId: clickedCardId });
  hideAllElements('taskcard');
  hideAllElements('taskloader');
  clearAllElements('taskdata');
  showElement(cardEl, 'taskcard');
  showElement(cardEl, 'taskloader');

  // Fetch additional data (e.g., task details) for the lead using queueManager
  queueManager
    .enqueue(() => getTaskByLeadId(clickedCardId), clickedCardId)
    .then((data) => {
      const childTaskCard = cardEl.querySelector('.taskcard');
      const childTaskLoader = childTaskCard.querySelector('.taskloader');
      const childTaskData = childTaskCard.querySelector('.taskdata');

      // Hide the loader and display the fetched data
      childTaskLoader.classList.add('hidden');

      const date = new Date((data.complete_till - 3 * 3600) * 1000); // Adjust for timezone
      const statusClass = getColorClass(data.complete_till);

      childTaskData.innerHTML = `
        <div class="text-sm">Task name: ${data.text}</div>
        <div class="text-sm">Task ID: ${data.id}</div>
        <div class="text-sm">Complete by: ${date.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })} ${date.toLocaleTimeString()}</div>
        <div class="p-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-2 h-2 ${statusClass}">
            <circle cx="50%" cy="50%" r="50%" />
          </svg>
        </div>
      `;
    })
    .catch((error) => {
      console.error('Error fetching task details:', error);
    });
};

/**
 * Create a card element with the given lead data.
 * @param {Object} cardData - The data of the lead.
 * @returns {HTMLElement} - The created card element.
 */
const createCardElement = (cardData) => {
  const card = document.createElement('div');
  card.id = `card-${cardData.id}`;
  card.dataset.leadid = cardData.id;
  card.className =
    'relative block w-full bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
  card.innerHTML = `
    <div class="p-6">
      <h2 class="text-base text-center">${cardData.name}</h2>
      <div class="text-sm">${cardData.price} €</div>
      <div class="text-xs text-gray-600 text-right">${cardData.id}</div>
    </div>
    <div class="taskcard hidden">
      <div class="absolute bottom-0 w-full bg-gray-200 rounded-b -translate-y-0 taskloader">
        <div style="width: 100%" class="absolute bottom-0 h-4 rounded-b cardloadbar"></div>
      </div>
      <div class="flex flex-col gap-2 text-center taskdata"></div>
    </div>`;
  card.addEventListener('click', cardClickHandler, false); // Add click event listener
  return card;
};

/**
 * Update an existing card element with new lead data.
 * @param {HTMLElement} card - The existing card element.
 * @param {Object} cardData - The updated data of the lead.
 */
const updateCardElement = (card, cardData) => {
  card.querySelector('h2').textContent = cardData.name;
  card.querySelector('.text-sm').textContent = `${cardData.price} €`;
  card.querySelector('.text-xs').textContent = cardData.id;
};
