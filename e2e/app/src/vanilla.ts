import sidepanel, {
  type SidepanelInstance,
} from 'typesense-docsearch-sidepanel-js';
import docsearch, { type DocSearchInstance } from 'typesense-docsearch.js';

import { askAi, collectionName, typesenseServerConfig } from './config';

declare global {
  interface Window {
    docsearch?: DocSearchInstance;
    sidepanel?: SidepanelInstance;
  }
}

document.getElementById('root')!.innerHTML = `
  <header>
    <a href="/">DocSearch e2e</a>
    <div id="docsearch"></div>
    <div id="docsearch-sidepanel"></div>
  </header>
  <main><h1>Vanilla JS</h1></main>
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
