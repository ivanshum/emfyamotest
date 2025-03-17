import {
  getState,
  markLeadAsRendered,
  isLeadRendered,
  updateState,
  updateTaskInState,
} from './state';
import { queueManager, getTaskByLeadId } from './amoapi';
import { debounce } from './utils';

/**
 * Show or hide the loader.
 */
export const renderLoader = () => {
  const { isLoading } = getState();
  const loader = document.getElementById('mainloader');
  loader.classList.toggle('hidden', !isLoading);
};

/**
 * Render the leads in the UI.
 */
export const renderLeads = () => {
  const { leads } = getState();
  const grid = document.getElementById('maingrid');
  leads.forEach((lead) => {
    if (!isLeadRendered(lead.id)) {
      // If the lead is not already rendered, create and append its card
      const card = createCardElement(lead);
      grid.appendChild(card);
      setTaskCardValues(card.querySelector('.leadcarddata'), lead); // Set values for the card fields
      markLeadAsRendered(lead.id); // Mark the lead as rendered
    } else {
      // Update the existing lead card if its data has changed
      const existingCard = document.getElementById(`card-${lead.id}`);
      if (existingCard) {
        setTaskCardValues(existingCard.querySelector('.leadcarddata'), lead);
      }
    }
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

  const date = new Date(unixTimestamp * 1000); // No timezone adjustment needed
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
    resetCardUI(); // Reset the UI for all cards
    return;
  }

  // Open the clicked card
  updateState({ openedCardId: clickedCardId });
  resetCardUI(cardEl); // Reset the UI and show elements for the clicked card

  // Fetch additional data (e.g., task details) for the lead using queueManager
  queueManager
    .enqueue((signal) => getTaskByLeadId(clickedCardId, signal), clickedCardId)
    .then((task) => {
      hideTaskLoader(cardEl); // Hide the task loader
      renderTaskDetails(cardEl, task); // Render the task details
      updateTaskInState(clickedCardId, task); // Update the state with the task data
    })
    .catch((error) => {
      console.error('Error fetching task details:', error);
    });
};
const hideTaskLoader = (cardEl) => {
  cardEl.querySelector('.taskloader').classList.add('hidden');
  cardEl.querySelector('.taskcard .taskdata').classList.remove('hidden');
};
// Wrap the cardClickHandler with debounce
const debouncedCardClickHandler = debounce(cardClickHandler, 300); // 300ms debounce

/**
 * Create a card element with the given lead data.
 * @param {Object} cardData - The data of the lead.
 * @returns {HTMLElement} - The created card element.
 */
const createCardElement = (cardData) => {
  const card = document.createElement('div');
  card.id = `card-${cardData.id}`;
  card.dataset.leadid = cardData.id;
  card.className = 'flex flex-col';
  card.innerHTML = `
    <div
      class="leadcarddata flex flex-col lg:flex-row w-full bg-white border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
    >
      <div
        class="flex order-6 lg:order-1 w-full px-2 py-1 lg:w-32 truncate justify-between lg:justify-norma"
      >
        <span class="text-sm text-gray-400 lg:hidden">Id:</span>
        <span class="truncate leadid text-sm text-gray-400"></span>
      </div>
      <div
        class="flex order-1 lg:order-2 w-full px-2 py-1 lg:flex-1 truncate justify-between lg:justify-norma"
      >
        <span class="truncate leadname font-semibold text-xl lg:text-base"></span>
      </div>
      <div
        class="flex order-3 w-full px-2 py-1 lg:w-40 truncate justify-between lg:justify-norma"
      >
        <span class="lg:font-semibold lg:hidden">Бюджет:</span>
        <span class="truncate leadprice"></span>
      </div>
      <div
        class="flex order-4 w-full px-2 py-1 lg:w-60 truncate justify-between lg:justify-normal"
      >
        <span class="lg:font-semibold lg:hidden">Контакт:</span>
        <span class="truncate leadcontact"></span>
      </div>
      <div
        class="flex order-5 w-full px-2 py-1 lg:w-60 truncate justify-between lg:justify-norma"
      >
        <span class="lg:font-semibold lg:hidden">Телефон:</span>
        <span class="truncate leadphone"></span>
      </div>
    </div>
    <div class="taskcard hidden w-full grow bg-gray-50">
      <div class="relative w-full h-4 bg-gray-200 rounded-b taskloader">
        <div class="absolute inset-0 w-full h-full cardloadbar"></div>
      </div>
      <div class="hidden p-4 taskdata">
        <div class="text-lg font-semibold taskname"></div>
        <div class="flex justify-between items-center py-2">
          <div>
            <span class="text-sm text-gray-600">Выполнить до:</span>
            <span class="text-sm text-gray-600 taskdate"></span>
          </div>
          <div>
            <span class="text-sm text-gray-400">ID:</span>
            <span class="text-sm text-gray-400 taskid"></span>
          </div>
        </div>
        <div class="">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 taskstatus">
            <circle cx="50%" cy="50%" r="50%" />
          </svg>
        </div>
      </div>
    </div>
  `;
  card.addEventListener('click', debouncedCardClickHandler, false); // Use the debounced handler
  return card;
};

/**
 * Set values for a card element's fields.
 * @param {HTMLElement} card - The card element to update.
 * @param {Object} cardData - The data of the lead.
 */
const setTaskCardValues = (card, cardData) => {
  const idElement = card.querySelector('.leadid');
  const nameElement = card.querySelector('.leadname');
  const priceElement = card.querySelector('.leadprice');
  const contactNameElement = card.querySelector('.leadcontact');
  const phoneElement = card.querySelector('.leadphone');

  // Update elements if they exist
  if (idElement) {
    idElement.textContent = cardData.id || '';
    idElement.title = cardData.id || '';
  }
  if (nameElement) {
    nameElement.textContent = cardData.name || '';
    nameElement.title = cardData.name || '';
  }
  if (priceElement) {
    priceElement.textContent = `${cardData.price + ` ₽` || ''}`;
    priceElement.title = `${cardData.price + ` ₽` || ''}`;
  }
  if (contactNameElement) {
    contactNameElement.textContent = cardData.contactName || '';
    contactNameElement.title = cardData.contactName || '';
  }
  if (phoneElement) {
    phoneElement.textContent = formatPhone(cardData.contactPhone);
    phoneElement.title = formatPhone(cardData.contactPhone);
  }
};

/**
 * Format phone number to a less strict format.
 * @param {string} phone - The phone number to format.
 * @returns {string} - The formatted phone number.
 */
const formatPhone = (phone) => {
  if (!phone) return '';
  const match = phone.match(/^(\+\d{1,3})(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return match
    ? `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
    : phone;
};

/**
 * Render task details for a lead.
 * @param {HTMLElement} cardEl - The card element to update.
 * @param {Object} task - The task data to render.
 */
export const renderTaskDetails = (cardEl, task) => {
  const taskDetailsContainer = cardEl.querySelector('.taskcard .taskdata');
  const taskNameElement = taskDetailsContainer.querySelector('.taskname');
  const taskDateElement = taskDetailsContainer.querySelector('.taskdate');
  const taskIdElement = taskDetailsContainer.querySelector('.taskid');
  const taskStatusElement =
    taskDetailsContainer.querySelector('.taskstatus circle');

  const date = new Date(task.complete_till * 1000); // No timezone adjustment needed
  const statusClass = getColorClass(task.complete_till);

  // Update task details
  taskNameElement.textContent = task.text || '';
  taskDateElement.textContent = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  taskIdElement.textContent = task.id || '';
  taskStatusElement.classList.add(statusClass);
};

/**
 * Hide all task cards by adding the 'hidden' class to their details container.
 */
const restoreCards = () => {
  document.querySelectorAll('div[id^="card-"]').forEach((card) => {
    card.classList.remove('border-1', 'border-blue-500');
    const taskCardElement = card.querySelector('.taskcard');
    taskCardElement.classList.add('hidden');
    taskCardElement.querySelector('.taskloader').classList.remove('hidden');
  });
};

const openCardElement = (cardEl) => {
  cardEl.querySelector('.taskcard').classList.remove('hidden');
  cardEl.classList.add('border-1', 'border-blue-500');
};

/**
 * Reset the UI for all cards and optionally show specific elements for a given card.
 * @param {HTMLElement} [cardEl] - The card element to show specific elements for (optional).
 */
const resetCardUI = (cardEl = null) => {
  console.log(cardEl);
  restoreCards();
  if (cardEl) {
    openCardElement(cardEl);
  }
};
