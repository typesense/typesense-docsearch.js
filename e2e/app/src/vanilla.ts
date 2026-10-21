import sidepanel, {
  type SidepanelInstance,
} from 'typesense-docsearch-sidepanel-js';
import docsearch, { type DocSearchInstance } from 'typesense-docsearch.js';

import { askAi, collectionName, typesenseServerConfig } from './config';
import { ROUTES, getRouteTitle } from './routes';

declare global {
  interface Window {
    docsearch?: DocSearchInstance;
    sidepanel?: SidepanelInstance;
  }
}

const nav = ROUTES.map(
  (route) =>
    `<a href="${route.path}"${route.path === '/js' ? ' aria-current="page"' : ''}>${route.path}</a>`
).join('');

document.getElementById('root')!.innerHTML = `
  <header>
    <nav>${nav}</nav>
    <div id="docsearch"></div>
    <div id="docsearch-sidepanel"></div>
  </header>
  <main><h1>${getRouteTitle('/js')}</h1></main>
`;

// Same wiring as examples/demo-js: Ask AI from the modal opens the Sidepanel.
const sidepanelInstance = sidepanel({
  container: '#docsearch-sidepanel',
  typesenseCollectionName: collectionName,
  typesenseServerConfig,
  askAi,
  onOpen: () => {
    window.docsearch?.close();
  },
});

const docsearchInstance = docsearch({
  container: '#docsearch',
  typesenseCollectionName: collectionName,
  typesenseServerConfig,
  askAi,
  interceptAskAiEvent: (initialMessage) => {
    docsearchInstance.close();
    sidepanelInstance.open(initialMessage);
    return true;
  },
  onOpen: () => {
    sidepanelInstance.close();
  },
});

window.docsearch = docsearchInstance;
window.sidepanel = sidepanelInstance;
