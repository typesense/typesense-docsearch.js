// import docsearch from '@docsearch/js/dist/umd';
import docsearch from 'typesense-docsearch.js';

import './app.css';

// import '@docsearch/css';
import 'typesense-docsearch-css';

docsearch({
  container: '#docsearch',
  typesenseCollectionName: 'docusaurus-2', // Replace with your own doc site's name. Should match the collection name in the scraper settings.

  typesenseServerConfig: {
    nodes: [
      {
        host: 'x3s805zrawjuod9fp-1.a1.typesense.net',
        port: 443,
        protocol: 'https',
      },
      {
        host: 'x3s805zrawjuod9fp-2.a1.typesense.net',
        port: 443,
        protocol: 'https',
      },
    ],
    apiKey: 'c1DmVFTQGnnP5XtW8FV7btCDeTYhBLz6', //insert search key here
  },
  typesenseSearchParameters: {}
});
