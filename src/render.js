import { getState } from './state';

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
 * Show or hide the loader.
 */
export const renderLoader = () => {
  const { isLoading } = getState();
  const loader = document.getElementById('mainloader');
  loader.classList.toggle('hidden', !isLoading);
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
    </div>`;
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
