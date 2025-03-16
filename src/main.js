import './style.css';
import { subscribe } from './state';
import { renderLeads, renderLoader } from './render';
import { getLeads } from './amoapi';

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

let openedCardId = ''; // ID of the currently opened card

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
 * Handle the click event on a card element.
 * @param {Event} event - The click event.
 */
const cardClickHandler = (event) => {
  const cardEl = event.target.closest('[id^="card-"]');
  hideAllElements('taskcard');
  hideAllElements('taskloader');
  clearAllElements('taskdata');

  if (cardEl.id === openedCardId) {
    openedCardId = '';
  } else {
    openedCardId = cardEl.id;
    showElement(cardEl, 'taskcard');
    showElement(cardEl, 'taskloader');

    getTaskByLeadId(cardEl.dataset.leadid)
      .then((data) => {
        const childTaskCard = cardEl.querySelector('.taskcard');
        const childTaskLoader = childTaskCard.querySelector('.taskloader');
        const childTaskData = childTaskCard.querySelector('.taskdata');

        childTaskLoader.classList.add('hidden');

        const date = new Date((data.complete_till - 3 * 3600) * 1000); // Subtract 3 hours (10800 seconds)
        const statusClass = getColorClass(data.complete_till);

        childTaskData.innerHTML = `
          <div class="text-sm">Task name: ${data.text}</div>
          <div class="text-sm">Task ID: ${data.id}</div>
          <div class="text-sm">Complete by: ${date.toLocaleDateString(
            undefined,
            {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            },
          )} ${date.toLocaleTimeString()}</div>
          <div class="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-2 h-2 ${statusClass}">
              <circle cx="50%" cy="50%" r="50%" />
            </svg>
          </div>
        `;
      })
      .catch((error) => {
        console.error(
          'Oops! Something went wrong :) Errors are handled differently, usually...',
          error,
        );
      });
  }
};

/**
 * Create a card element with the given lead data.
 * @param {Object} cardData - The data of the lead.
 * @param {string} cardData.id - The ID of the lead.
 * @param {string} cardData.name - The name of the lead.
 * @param {number} cardData.price - The price of the lead.
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
  card.addEventListener('click', cardClickHandler, false);
  return card;
};

/**
 * Update the main UI with the given data and state.
 * @param {Array} data - The data to update the UI with.
 * @param {boolean} state - The state indicating whether the loading is in progress.
 */
const updateMainUi = (data, state) => {
  document.getElementById('mainloader').classList.toggle('hidden', !state);
  const el = document.getElementById('maingrid');
  const loadedCards = document.querySelectorAll('[id^="card-"]');
  for (let index = loadedCards.length; index < data.length; index++) {
    const cardData = data[index];
    const card = createCardElement(cardData);
    el.appendChild(card);
  }
};

// Listen for custom 'updateCards' event to update the UI
window.document.addEventListener('updateCards', (ev) =>
  updateMainUi(ev.detail.data || [], ev.detail.inprogress),
);

// Subscribe to state changes
subscribe(renderLeads);
subscribe(renderLoader);

// Initialize the application
(async () => {
  await getLeads();
})();
