import './style.css';
import { subscribe } from './state';
import { renderLeads, renderLoader } from './render';
import { getLeads } from './amoapi';

// Subscribe to state changes
subscribe(renderLeads);
subscribe(renderLoader);

// Initialize the application
(async () => {
  await getLeads();
})();
